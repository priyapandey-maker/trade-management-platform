import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const telegramRecipients = await prisma.telegramRecipient.findMany();
  const portfolios = await prisma.portfolioPosition.findMany();
  const ideas = await prisma.idea.findMany();
  const notifications = await prisma.notification.findMany();
  const notificationDeliveries = await prisma.notificationDelivery.findMany();
  const ruleConfigs = await prisma.ruleConfig.findMany();
  const appSettings = await prisma.appSetting.findMany();
  
  const data = {
    users,
    telegramRecipients,
    portfolios,
    ideas,
    notifications,
    notificationDeliveries,
    ruleConfigs,
    appSettings
  };
  
  fs.writeFileSync('sqlite-dump.json', JSON.stringify(data, null, 2));
  console.log('Dump complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
