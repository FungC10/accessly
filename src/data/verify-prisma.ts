import { PrismaClient, RoomType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Verifying Prisma Client...\n')
  
  // Check if TICKET is in the RoomType enum
  console.log('RoomType enum values:')
  console.log('  PUBLIC:', RoomType.PUBLIC)
  console.log('  PRIVATE:', RoomType.PRIVATE)
  console.log('  DM:', RoomType.DM)
  console.log('  TICKET:', RoomType.TICKET)
  
  if (!RoomType.TICKET) {
    console.log('\n❌ ERROR: TICKET not found in RoomType enum!')
    console.log('   Please run: pnpm prisma generate --schema=src/prisma/schema.prisma')
    process.exit(1)
  }
  
  // Try to query rooms with TICKET type
  try {
    const ticketRooms = await prisma.room.findMany({
      where: { type: RoomType.TICKET },
      take: 1,
    })
    console.log(`\n✅ Successfully queried TICKET rooms: ${ticketRooms.length} found`)
  } catch (error: any) {
    console.log('\n❌ ERROR querying TICKET rooms:')
    console.log('   ', error.message)
    process.exit(1)
  }
  
  // Try to query roomMembers with TICKET rooms
  try {
    const memberships = await prisma.roomMember.findMany({
      where: {
        room: {
          type: RoomType.TICKET,
        },
      },
      take: 1,
    })
    console.log(`✅ Successfully queried roomMembers with TICKET rooms: ${memberships.length} found`)
  } catch (error: any) {
    console.log('\n❌ ERROR querying roomMembers with TICKET filter:')
    console.log('   ', error.message)
    process.exit(1)
  }
  
  console.log('\n✅ Prisma Client is working correctly!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

