import { PrismaClient, Role, RoomRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Hash password for admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@accessly.com' },
    update: {
      password: hashedPassword, // Update password if user exists
    },
    create: {
      email: 'admin@accessly.com',
      name: 'Admin User',
      emailVerified: new Date(),
      role: Role.ADMIN,
      password: hashedPassword,
    },
  })
  console.log('✅ Created admin user:', admin.email)
  console.log('   Password: admin123')

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'user@accessly.com' },
    update: {
      password: userPassword, // Update password if user exists
    },
    create: {
      email: 'user@accessly.com',
      name: 'Regular User',
      emailVerified: new Date(),
      role: Role.USER,
      password: userPassword,
    },
  })
  console.log('✅ Created regular user:', user.email)
  console.log('   Password: user123')

  // Create public rooms: #general and #random
  const generalRoom = await prisma.room.upsert({
    where: { name: '#general' },
    update: {},
    create: {
      name: '#general',
      isPrivate: false,
    },
  })
  console.log('✅ Created room:', generalRoom.name)

  const randomRoom = await prisma.room.upsert({
    where: { name: '#random' },
    update: {},
    create: {
      name: '#random',
      isPrivate: false,
    },
  })
  console.log('✅ Created room:', randomRoom.name)

  // Create private room
  const privateRoom = await prisma.room.upsert({
    where: { name: '#private' },
    update: {},
    create: {
      name: '#private',
      isPrivate: true,
    },
  })
  console.log('✅ Created private room:', privateRoom.name)

  // Add admin as owner of all rooms
  await prisma.roomMember.upsert({
    where: {
      userId_roomId: {
        userId: admin.id,
        roomId: generalRoom.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roomId: generalRoom.id,
      role: RoomRole.OWNER,
    },
  })

  await prisma.roomMember.upsert({
    where: {
      userId_roomId: {
        userId: admin.id,
        roomId: randomRoom.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roomId: randomRoom.id,
      role: RoomRole.OWNER,
    },
  })

  await prisma.roomMember.upsert({
    where: {
      userId_roomId: {
        userId: admin.id,
        roomId: privateRoom.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roomId: privateRoom.id,
      role: RoomRole.OWNER,
    },
  })
  console.log('✅ Added admin as owner of all rooms')

  // Add regular user as member of public rooms
  await prisma.roomMember.upsert({
    where: {
      userId_roomId: {
        userId: user.id,
        roomId: generalRoom.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roomId: generalRoom.id,
      role: RoomRole.MEMBER,
    },
  })

  await prisma.roomMember.upsert({
    where: {
      userId_roomId: {
        userId: user.id,
        roomId: randomRoom.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roomId: randomRoom.id,
      role: RoomRole.MEMBER,
    },
  })
  console.log('✅ Added regular user as member of public rooms')

  console.log('✨ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })