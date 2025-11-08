import { PrismaClient, RoomType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Testing Home Page Logic...\n')

  try {
    // Simulate what the home page does
    // 1. Find a user (use admin@solace.com)
    const user = await prisma.user.findUnique({
      where: { email: 'admin@solace.com' },
      select: { id: true },
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('✅ User found:', user.id)

    // 2. Fetch "My Rooms" - rooms user is a member of
    console.log('\n📋 Fetching room memberships...')
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

    console.log(`✅ Found ${myMemberships.length} room memberships`)
    
    // Check for TICKET rooms
    const ticketRooms = myMemberships.filter(m => m.room.type === RoomType.TICKET)
    console.log(`   - TICKET rooms: ${ticketRooms.length}`)
    console.log(`   - PUBLIC rooms: ${myMemberships.filter(m => m.room.type === RoomType.PUBLIC).length}`)
    console.log(`   - PRIVATE rooms: ${myMemberships.filter(m => m.room.type === RoomType.PRIVATE).length}`)
    console.log(`   - DM rooms: ${myMemberships.filter(m => m.room.type === RoomType.DM).length}`)

    // 3. Fetch "Discover" - public rooms
    console.log('\n📋 Fetching discover rooms...')
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

    // 4. Get all tags
    console.log('\n📋 Fetching tags...')
    const allPublicRooms = await prisma.room.findMany({
      where: { type: RoomType.PUBLIC },
      select: { tags: true },
    })
    const allTags = Array.from(
      new Set(
        allPublicRooms.flatMap((r) => r.tags || []).filter((t) => t.length > 0)
      )
    ).sort()

    console.log(`✅ Found ${allTags.length} unique tags:`, allTags.slice(0, 10))

    console.log('\n✅ All queries successful! Home page logic should work.')
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

