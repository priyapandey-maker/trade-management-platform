import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const dataString = fs.readFileSync('sqlite-dump.json', 'utf8');
  const data = JSON.parse(dataString);

  console.log('Starting data migration to PostgreSQL...');

  // Use transactions if needed or simply createMany
  if (data.users && data.users.length > 0) {
    await prisma.user.createMany({ data: data.users, skipDuplicates: true });
    console.log(`Migrated ${data.users.length} users`);
  }

  if (data.telegramRecipients && data.telegramRecipients.length > 0) {
    await prisma.telegramRecipient.createMany({ data: data.telegramRecipients, skipDuplicates: true });
    console.log(`Migrated ${data.telegramRecipients.length} telegram recipients`);
  }

  if (data.portfolios && data.portfolios.length > 0) {
    await prisma.portfolioPosition.createMany({ data: data.portfolios, skipDuplicates: true });
    console.log(`Migrated ${data.portfolios.length} portfolio positions`);
  }

  if (data.ideas && data.ideas.length > 0) {
    await prisma.idea.createMany({ data: data.ideas, skipDuplicates: true });
    console.log(`Migrated ${data.ideas.length} ideas`);
  }

  if (data.notifications && data.notifications.length > 0) {
    await prisma.notification.createMany({ data: data.notifications, skipDuplicates: true });
    console.log(`Migrated ${data.notifications.length} notifications`);
  }

  if (data.notificationDeliveries && data.notificationDeliveries.length > 0) {
    await prisma.notificationDelivery.createMany({ data: data.notificationDeliveries, skipDuplicates: true });
    console.log(`Migrated ${data.notificationDeliveries.length} notification deliveries`);
  }

  if (data.ruleConfigs && data.ruleConfigs.length > 0) {
    await prisma.ruleConfig.createMany({ data: data.ruleConfigs, skipDuplicates: true });
    console.log(`Migrated ${data.ruleConfigs.length} rule configs`);
  }

  if (data.appSettings && data.appSettings.length > 0) {
    await prisma.appSetting.createMany({ data: data.appSettings, skipDuplicates: true });
    console.log(`Migrated ${data.appSettings.length} app settings`);
  }

  console.log('Migration to PostgreSQL complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
