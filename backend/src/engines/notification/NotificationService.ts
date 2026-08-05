import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, User, Notification } from '@prisma/client';
import { NotificationPayload } from './notification.types';
import { TelegramProvider } from './providers/TelegramProvider';
import { EmailProvider } from './providers/EmailProvider';
import { InAppProvider } from './providers/InAppProvider';

const prisma = new PrismaClient();

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly telegramProvider: TelegramProvider,
    private readonly emailProvider: EmailProvider,
    private readonly inAppProvider: InAppProvider,
  ) {}

  async createNotification(payload: NotificationPayload): Promise<void> {
    const windowMinutes = process.env.NOTIFICATION_DEDUP_WINDOW_MINUTES
      ? parseInt(process.env.NOTIFICATION_DEDUP_WINDOW_MINUTES)
      : 240;

    const dedupTime = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Deduplication check
    if (payload.triggerKey) {
      const existing = await prisma.notification.findFirst({
        where: {
          triggerKey: payload.triggerKey,
          createdAt: { gte: dedupTime },
        },
      });

      if (existing) {
        this.logger.debug(`Deduplicated alert for triggerKey: "${payload.triggerKey}". Skipping.`);
        return;
      }
    }

    const users = await prisma.user.findMany();

    for (const user of users) {
      let typeEnabled = true;
      switch (payload.type) {
        case 'NEAR_BUY':
          typeEnabled = user.prefNearBuy;
          break;
        case 'BUY_TRIGGER':
          typeEnabled = user.prefBuyTrigger;
          break;
        case 'TARGET_HIT':
          typeEnabled = user.prefTargetHit;
          break;
        case 'STOP_LOSS':
          typeEnabled = user.prefStopLoss;
          break;
        case 'TRADE_CLOSED':
          typeEnabled = user.prefManualClose;
          break;
        case 'DAILY_SUMMARY':
          typeEnabled = user.prefDailySummary;
          break;
        case 'PRICE_MOVEMENT':
          typeEnabled = user.prefPriceMovement ?? true;
          break;
      }

      if (!typeEnabled) continue;

      const telegramStatus = user.telegramEnabled ? 'PENDING' : 'DISABLED';
      const emailStatus = user.emailEnabled ? 'PENDING' : 'DISABLED';
      const inAppStatus = user.inAppEnabled ? 'PENDING' : 'DISABLED';

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: payload.type,
          symbol: payload.symbol,
          company: payload.company,
          message: payload.message,
          triggerKey: payload.triggerKey || null,
          triggerPrice: payload.triggerPrice || null,
          telegramStatus,
          emailStatus,
          inAppStatus,
          telegramRetries: 0,
          emailRetries: 0,
          errorLog: '',
          read: false,
        },
      });

      // For in-app notification channel, run standard provider logging immediately
      if (user.inAppEnabled) {
        try {
          await this.inAppProvider.send(user, notification);
          await prisma.notification.update({
            where: { id: notification.id },
            data: { inAppStatus: 'SENT' },
          });
        } catch (e: any) {
          this.logger.error(`Failed to handle InAppProvider log: ${e.message}`);
        }
      }

      this.logger.log(`Notification created and queued for user ${user.id}: type=${payload.type} symbol=${payload.symbol}`);
    }
  }

  async resetPositionTriggerKeys(symbol: string): Promise<void> {
    const normSym = symbol.trim().toUpperCase();
    await prisma.notification.updateMany({
      where: { symbol: normSym, triggerKey: { not: null } },
      data: { triggerKey: null },
    });
    this.logger.debug(`Reset trigger alerts deduplication for symbol "${normSym}".`);
  }

  async sendTestTelegram(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TEST',
        symbol: 'TEST.NS',
        company: 'Shree Associates Test',
        message: 'This is a test notification for Telegram Bot alerts.',
        telegramStatus: 'SENT',
        emailStatus: 'DISABLED',
        inAppStatus: 'DISABLED',
        read: false,
      },
    });

    await this.telegramProvider.send(user, notification);
  }

  async sendTestEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TEST',
        symbol: 'TEST.NS',
        company: 'Shree Associates Test',
        message: 'This is a test notification for Email alerts.',
        telegramStatus: 'DISABLED',
        emailStatus: 'SENT',
        inAppStatus: 'DISABLED',
        read: false,
      },
    });

    await this.emailProvider.send(user, notification);
  }
}
