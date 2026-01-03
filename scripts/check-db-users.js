import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.user.count();
    console.log('Total users in database:', count);
    
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@solace.com' },
      select: { email: true, name: true, role: true, password: true }
    });
    
    if (admin) {
      console.log('\n✅ admin@solace.com found:');
      console.log('   Name:', admin.name);
      console.log('   Role:', admin.role);
      console.log('   Has password:', admin.password ? 'YES (' + admin.password.length + ' chars)' : 'NO');
    } else {
      console.log('\n❌ admin@solace.com NOT FOUND');
    }
    
    const allUsers = await prisma.user.findMany({
      select: { email: true, role: true },
      take: 10
    });
    console.log('\nFirst 10 users:');
    allUsers.forEach(u => console.log('  -', u.email, '(' + u.role + ')'));
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

