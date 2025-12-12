/**
 * Cleanup script to remove any accidental internal room memberships for external customers
 * Run this if external customers are seeing internal rooms
 * 
 * Usage: pnpm tsx src/scripts/cleanup-customer-memberships.ts
 */

import { PrismaClient, RoomType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning up customer room memberships...\n')

  // Find all external customers (USER role, null department)
  const externalCustomers = await prisma.user.findMany({
    where: {
      role: 'USER',
      department: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })

  console.log(`Found ${externalCustomers.length} external customers:`)
  for (const customer of externalCustomers) {
    console.log(`  - ${customer.email} (${customer.name})`)
  }

  // Find and remove any PUBLIC or PRIVATE room memberships for external customers
  for (const customer of externalCustomers) {
    const internalMemberships = await prisma.roomMember.findMany({
      where: {
        userId: customer.id,
        room: {
          type: { in: [RoomType.PUBLIC, RoomType.PRIVATE] },
        },
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    if (internalMemberships.length > 0) {
      console.log(`\n⚠️  ${customer.email} has ${internalMemberships.length} internal room memberships:`)
      for (const membership of internalMemberships) {
        console.log(`  - ${membership.room.name} (${membership.room.type})`)
      }

      // Remove these memberships
      await prisma.roomMember.deleteMany({
        where: {
          userId: customer.id,
          room: {
            type: { in: [RoomType.PUBLIC, RoomType.PRIVATE] },
          },
        },
      })

      console.log(`  ✅ Removed ${internalMemberships.length} internal room memberships for ${customer.email}`)
    } else {
      console.log(`  ✅ ${customer.email} has no internal room memberships (correct)`)
    }

    // Verify ticket memberships exist
    const ticketMemberships = await prisma.roomMember.count({
      where: {
        userId: customer.id,
        room: {
          type: RoomType.TICKET,
        },
      },
    })
    console.log(`  📋 ${customer.email} has ${ticketMemberships} ticket membership(s)`)
  }

  console.log('\n✨ Cleanup completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

