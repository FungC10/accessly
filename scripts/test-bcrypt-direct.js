import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧪 Direct bcrypt test (no NextAuth involved)');
    console.log('🧬 Prisma client version:', prisma._clientVersion || 'unknown');
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: 'admin@solace.com' },
      select: { email: true, password: true }
    });
    
    if (!user || !user.password) {
      console.log('❌ User not found or has no password');
      await prisma.$disconnect();
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('🔐 Password hash prefix:', user.password.substring(0, 20));
    console.log('🔐 Password hash length:', user.password.length);
    
    // Test bcrypt module
    const bcryptModulePath = require.resolve('bcryptjs');
    console.log('🔐 bcrypt module path:', bcryptModulePath);
    console.log('🔐 bcrypt compare fn:', bcrypt.compare.toString().slice(0, 150));
    
    // Direct comparison
    console.log('\n🧪 Testing password: demo123');
    const result = await bcrypt.compare('demo123', user.password);
    console.log('🔐 bcrypt.compare("demo123", hash) result:', result ? '✅ TRUE' : '❌ FALSE');
    
    if (!result) {
      console.log('\n❌ PASSWORD COMPARISON FAILED');
      console.log('Hash from DB:', user.password);
      console.log('Testing with: demo123');
      
      // Try to hash a new password and compare
      const testHash = await bcrypt.hash('demo123', 10);
      console.log('New hash for demo123:', testHash);
      const testCompare = await bcrypt.compare('demo123', testHash);
      console.log('New hash comparison:', testCompare ? '✅ TRUE' : '❌ FALSE');
    } else {
      console.log('\n✅ PASSWORD COMPARISON SUCCEEDED');
    }
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  }
})();

