import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    // Test the exact query that auth.ts uses (with lowercase normalization)
    const testEmails = [
      'admin@solace.com',
      'Admin@solace.com',
      'ADMIN@SOLACE.COM',
      ' admin@solace.com ', // with spaces
    ];
    
    console.log('Testing email normalization:\n');
    
    for (const email of testEmails) {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { email: true, name: true, role: true }
      });
      
      if (user) {
        console.log(`✅ "${email}" → "${normalizedEmail}" → FOUND: ${user.email}`);
      } else {
        console.log(`❌ "${email}" → "${normalizedEmail}" → NOT FOUND`);
      }
    }
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
