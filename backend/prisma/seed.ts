import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old platform databases for refactored SHREE ASSOCIATES platform...');

  // Delete all rows in correct order of dependency
  await prisma.portfolioPosition.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.idea.deleteMany({});
  await prisma.ruleConfig.deleteMany({});
  await prisma.appSetting.deleteMany({});

  console.log('✔ Databases cleared.');

  // Create default OWNER accounts from environment variables or secure defaults
  const ownerEmails = (process.env.OWNER_EMAIL || 'owner@shree.com').split(',').map(e => e.toLowerCase().trim());
  const rawPasswords = (process.env.OWNER_PASSWORD || 'shree123').split(',').map(p => p.trim());

  for (let i = 0; i < ownerEmails.length; i++) {
    const email = ownerEmails[i];
    const password = rawPasswords[i] || rawPasswords[0]; // fallback to the first password if not enough are provided
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name: `Owner Analyst ${i + 1}`,
        email,
        password: hashedPassword,
        role: 'OWNER',
      },
    });

    console.log(`✔ Default OWNER account initialized: ${email}`);
  }

  // Create default CLIENT account from environment variables or secure defaults
  const clientEmail = (process.env.CLIENT_EMAIL || 'client@shree.com').toLowerCase().trim();
  const clientRawPassword = process.env.CLIENT_PASSWORD || 'client123';
  const clientHashedPassword = await bcrypt.hash(clientRawPassword, 10);

  await prisma.user.create({
    data: {
      name: 'Client Viewer',
      email: clientEmail,
      password: clientHashedPassword,
      role: 'CLIENT',
    },
  });

  console.log(`✔ Default CLIENT account initialized: ${clientEmail}`);
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
