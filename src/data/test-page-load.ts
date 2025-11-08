import { PrismaClient, RoomType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Testing page load logic...\n')

  try {
    // 1. Find admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@solace.com' },
      select: { id: true },
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('✅ User found:', user.id)

    // 2. Test the exact query from page.tsx
    console.log('\n📋 Testing roomMember.findMany query...')
    const myMemberships = await prisma.roomMember.findMany({
      where: { userId: user.id },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            title: true,
            description: true,
            tags: true,
            type: true,
            isPrivate: true,
            createdAt: true,
            creator: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
            messages: {
              take: 1,
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                id: true,
                content: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        room: {
          createdAt: 'desc',
        },
      },
    })

    console.log(`✅ Found ${myMemberships.length} memberships`)
    
    // Check room types
    const roomTypes = myMemberships.map(m => m.room.type)
    const uniqueTypes = [...new Set(roomTypes)]
    console.log('   Room types found:', uniqueTypes)
    
    // Check for TICKET rooms
    const ticketRooms = myMemberships.filter(m => m.room.type === RoomType.TICKET)
    console.log(`   TICKET rooms: ${ticketRooms.length}`)

    // 3. Test discover rooms query
    console.log('\n📋 Testing discover rooms query...')
    const discoverRooms = await prisma.room.findMany({
      where: {
        type: RoomType.PUBLIC,
      },
      take: 5,
      orderBy: {
        messages: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        name: true,
        title: true,
        type: true,
      },
    })

    console.log(`✅ Found ${discoverRooms.length} discover rooms`)

    // 4. Test serialization
    console.log('\n📋 Testing data serialization...')
    const myRooms = myMemberships.map((m) => {
      try {
        return {
          ...m.room,
          createdAt: m.room.createdAt.toISOString(),
          role: m.role,
          lastMessage: m.room.messages[0] ? {
            ...m.room.messages[0],
            createdAt: m.room.messages[0].createdAt.toISOString(),
          } : null,
        }
      } catch (error: any) {
        console.error('❌ Serialization error:', error.message)
        throw error
      }
    })

    console.log(`✅ Serialized ${myRooms.length} rooms`)

    // 5. Test JSON serialization (what Next.js does)
    console.log('\n📋 Testing JSON serialization...')
    try {
      const json = JSON.stringify({ myRooms, discoverRooms })
      console.log(`✅ JSON serialization successful (${json.length} bytes)`)
    } catch (error: any) {
      console.error('❌ JSON serialization failed:', error.message)
      throw error
    }

    console.log('\n✅ All tests passed! Page should load correctly.')
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message)
    console.error('Error code:', error.code)
    console.error('Error name:', error.name)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

