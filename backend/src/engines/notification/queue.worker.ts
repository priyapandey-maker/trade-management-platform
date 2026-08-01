import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TelegramProvider } from './providers/TelegramProvider';
import { EmailProvider } from './providers/EmailProvider';

const prisma = new PrismaClient();

@Injectable()
export class QueueWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly telegramProvider: TelegramProvider,
    private readonly emailProvider: EmailProvider,
  ) {}

  onModuleInit() {
    this.logger.log('Notification Queue Worker starting up...');
    // Run queue sweeper every 15 seconds
    this.timer = setInterval(() => this.processQueue(), 15000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingNotifications = await prisma.notification.findMany({
        where: {
          OR: [
            { telegramStatus: 'PENDING' },
            { telegramStatus: 'FAILED', telegramRetries: { lt: 3 } },
            { emailStatus: 'PENDING' },
            { emailStatus: 'FAILED', emailRetries: { lt: 3 } },
          ],
        },
        include: {
          user: true,
        },
      });

      const nowMs = Date.now();

      for (const notification of pendingNotifications) {
        const { user } = notification;
        let updateData: any = {};
        let errors: string[] = [];

        // 1. Process Telegram channel
        if (notification.telegramStatus === 'PENDING') {
          try {
            await this.telegramProvider.send(user, notification);
            updateData.telegramStatus = 'SENT';
          } catch (err: any) {
            updateData.telegramStatus = 'FAILED';
            updateData.telegramRetries = 1;
            errors.push(`Telegram Err: ${err.message}`);
          }
        } else if (notification.telegramStatus === 'FAILED' && notification.telegramRetries < 3) {
          const elapsed = nowMs - new Date(notification.createdAt).getTime();
          const backoffMinutes = notification.telegramRetries === 1 ? 1 : notification.telegramRetries === 2 ? 5 : 15;
          const backoffMs = backoffMinutes * 60 * 1000;

          if (elapsed >= backoffMs) {
            try {
              await this.telegramProvider.send(user, notification);
              updateData.telegramStatus = 'SENT';
            } catch (err: any) {
              updateData.telegramRetries = notification.telegramRetries + 1;
              errors.push(`Telegram Retry ${updateData.telegramRetries} Err: ${err.message}`);
            }
          }
        }

        // 2. Process Email channel
        if (notification.emailStatus === 'PENDING') {
          try {
            await this.emailProvider.send(user, notification);
            updateData.emailStatus = 'SENT';
          } catch (err: any) {
            updateData.emailStatus = 'FAILED';
            updateData.emailRetries = 1;
            errors.push(`Email Err: ${err.message}`);
          }
        } else if (notification.emailStatus === 'FAILED' && notification.emailRetries < 3) {
          const elapsed = nowMs - new Date(notification.createdAt).getTime();
          const backoffMinutes = notification.emailRetries === 1 ? 1 : notification.emailRetries === 2 ? 5 : 15;
          const backoffMs = backoffMinutes * 60 * 1000;

          if (elapsed >= backoffMs) {
            try {
              await this.emailProvider.send(user, notification);
              updateData.emailStatus = 'SENT';
            } catch (err: any) {
              updateData.emailRetries = notification.emailRetries + 1;
              errors.push(`Email Retry ${updateData.emailRetries} Err: ${err.message}`);
            }
          }
        }

        if (Object.keys(updateData).length > 0) {
          if (errors.length > 0) {
            const combinedError = errors.join(' | ');
            updateData.errorLog = notification.errorLog
              ? `${notification.errorLog}\n[${new Date().toISOString()}] ${combinedError}`
              : `[${new Date().toISOString()}] ${combinedError}`;
          }
          await prisma.notification.update({
            where: { id: notification.id },
            data: updateData,
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Queue sweeper execution failed: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
