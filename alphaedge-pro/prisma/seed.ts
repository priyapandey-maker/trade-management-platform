import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old platform databases for refactored SHREE ASSOCIATES platform...');

  // Delete all rows in correct order of dependency
  await prisma.portfolioPosition.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.idea.deleteMany({});
  await prisma.alertHistory.deleteMany({});
  await prisma.ruleConfig.deleteMany({});
  await prisma.appSetting.deleteMany({});

  console.log('✔ Databases cleared.');

  // Create default OWNER account from environment variables or secure defaults
  const ownerEmail = (process.env.OWNER_EMAIL || 'owner@shree.com').toLowerCase().trim();
  const rawPassword = process.env.OWNER_PASSWORD || 'shree123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  await prisma.user.create({
    data: {
      name: 'Owner Analyst',
      email: ownerEmail,
      password: hashedPassword,
      role: 'OWNER',
    },
  });

  console.log(`✔ Default OWNER account initialized: ${ownerEmail}`);
  console.log('✔ Seeding complete (No mock or sample trades generated).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
