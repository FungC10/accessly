import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@solace.com' },
      select: { email: true, password: true }
    });
    
    if (!user || !user.password) {
      console.log('❌ User not found or has no password');
      await prisma.$disconnect();
      return;
    }
    
    console.log('Testing password: demo123');
    const isValid = await bcrypt.compare('demo123', user.password);
    console.log('Password match:', isValid ? '✅ YES' : '❌ NO');
    
    // Also test with admin123 (from basic seed)
    const isValidAdmin123 = await bcrypt.compare('admin123', user.password);
    console.log('Password match (admin123):', isValidAdmin123 ? '✅ YES' : '❌ NO');
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
