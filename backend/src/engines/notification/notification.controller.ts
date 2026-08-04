import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, ForbiddenException, HttpException, HttpStatus, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthGuard } from '../auth/auth.controller';
import { NotificationService } from './NotificationService';
import { NotificationType } from './notification.types';

const prisma = new PrismaClient();

@Controller('notification')
@UseGuards(AuthGuard)
export class NotificationController {
  private notificationsCache: { [key: string]: { data: any; timestamp: number } } = {};

  private clearCache() {
    this.notificationsCache = {};
  }

  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Req() req: any, @Query('status') status?: string, @Query('search') search?: string) {
    const userId = req.user.sub;
    const cacheKey = `${userId}:${status || ''}:${search || ''}`;
    const nowTime = Date.now();
    const cached = this.notificationsCache[cacheKey];
    if (cached && nowTime - cached.timestamp < 5000) {
      return cached.data;
    }

    const where: any = { userId };
    if (status === 'unread') {
      where.read = false;
    } else if (status === 'read') {
      where.read = true;
    }

    if (search && search.trim()) {
      where.OR = [
        { symbol: { contains: search, autoEscape: true } },
        { company: { contains: search, autoEscape: true } },
        { message: { contains: search, autoEscape: true } },
      ];
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        deliveries: true,
      },
    });

    const result = { notifications };
    this.notificationsCache[cacheKey] = { data: result, timestamp: nowTime };
    return result;
  }

  @Patch('mark-all-read')
  async markAllRead(@Req() req: any) {
    this.clearCache();
    const userId = req.user.sub;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    this.clearCache();
    const userId = req.user.sub;
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new HttpException('Notification not found.', HttpStatus.NOT_FOUND);
    }
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return { success: true };
  }

  @Delete('clear-all')
  async clearAll(@Req() req: any) {
    this.clearCache();
    const userId = req.user.sub;
    await prisma.notification.deleteMany({
      where: { userId },
    });
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Req() req: any) {
    this.clearCache();
    const userId = req.user.sub;
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new HttpException('Notification not found.', HttpStatus.NOT_FOUND);
    }
    await prisma.notification.delete({
      where: { id },
    });
    return { success: true };
  }

  // Settings Management (Only OWNER can modify - Req 5)
  @Get('settings')
  async getSettings(@Req() req: any) {
    const userId = req.user.sub;
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { telegramRecipients: true },
    });

    if (!targetUser) {
      throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
    }

    return {
      preferences: {
        prefNearBuy: targetUser.prefNearBuy,
        prefBuyTrigger: targetUser.prefBuyTrigger,
        prefStopLoss: targetUser.prefStopLoss,
        prefTargetHit: targetUser.prefTargetHit,
        prefManualClose: targetUser.prefManualClose,
        prefDailySummary: targetUser.prefDailySummary,
        emailNotificationsEnabled: targetUser.emailEnabled,
        telegramNotificationsEnabled: targetUser.telegramEnabled,
        inAppNotificationsEnabled: targetUser.inAppEnabled,
        telegramEnabled: targetUser.telegramEnabled,
        emailEnabled: targetUser.emailEnabled,
        inAppEnabled: targetUser.inAppEnabled,
        telegramChatIds: targetUser.telegramChatIds,
        email: targetUser.email,
      },
      telegramRecipients: targetUser.telegramRecipients,
    };
  }

  @Patch('settings')
  async updateSettings(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('Only platform owners can modify notification configurations.');
    }

    const userId = req.user.sub;
    const { preferences, telegramRecipients } = body;

    const updateData: any = {};
    if (preferences) {
      if (preferences.prefNearBuy !== undefined) updateData.prefNearBuy = preferences.prefNearBuy;
      if (preferences.prefBuyTrigger !== undefined) updateData.prefBuyTrigger = preferences.prefBuyTrigger;
      if (preferences.prefStopLoss !== undefined) updateData.prefStopLoss = preferences.prefStopLoss;
      if (preferences.prefTargetHit !== undefined) updateData.prefTargetHit = preferences.prefTargetHit;
      if (preferences.prefManualClose !== undefined) updateData.prefManualClose = preferences.prefManualClose;
      if (preferences.prefDailySummary !== undefined) updateData.prefDailySummary = preferences.prefDailySummary;
      
      // Handle the new settings and sync older names
      if (preferences.emailEnabled !== undefined) {
        updateData.emailEnabled = preferences.emailEnabled;
        updateData.emailNotificationsEnabled = preferences.emailEnabled;
      } else if (preferences.emailNotificationsEnabled !== undefined) {
        updateData.emailEnabled = preferences.emailNotificationsEnabled;
        updateData.emailNotificationsEnabled = preferences.emailNotificationsEnabled;
      }

      if (preferences.telegramEnabled !== undefined) {
        updateData.telegramEnabled = preferences.telegramEnabled;
        updateData.telegramNotificationsEnabled = preferences.telegramEnabled;
      } else if (preferences.telegramNotificationsEnabled !== undefined) {
        updateData.telegramEnabled = preferences.telegramNotificationsEnabled;
        updateData.telegramNotificationsEnabled = preferences.telegramNotificationsEnabled;
      }

      if (preferences.inAppEnabled !== undefined) {
        updateData.inAppEnabled = preferences.inAppEnabled;
        updateData.inAppNotificationsEnabled = preferences.inAppEnabled;
      } else if (preferences.inAppNotificationsEnabled !== undefined) {
        updateData.inAppEnabled = preferences.inAppNotificationsEnabled;
        updateData.inAppNotificationsEnabled = preferences.inAppNotificationsEnabled;
      }

      if (preferences.telegramChatIds !== undefined) {
        updateData.telegramChatIds = preferences.telegramChatIds;
      }
      if (preferences.email !== undefined) {
        updateData.email = preferences.email;
      }
    }

    // Update main preferences
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Update normalized Telegram recipients list
    if (Array.isArray(telegramRecipients)) {
      await prisma.telegramRecipient.deleteMany({ where: { userId } });
      if (telegramRecipients.length > 0) {
        await prisma.telegramRecipient.createMany({
          data: telegramRecipients.map((r: any) => ({
            userId,
            chatId: r.chatId.toString().trim(),
            name: r.name || 'Recipient',
            enabled: r.enabled !== false,
          })),
        });
      }
    }

    return { success: true };
  }

  // Expose Trigger Test Notification Actions
  @Post('test')
  async sendTestNotification(@Req() req: any) {
    const userId = req.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
    }

    await this.notificationService.createNotification({
      type: NotificationType.TEST,
      symbol: 'TEST.NS',
      company: 'Test Company Limited',
      message: 'This is a custom test notification triggered from the Shree Associates Control Panel.',
      triggerPrice: 100.0,
      triggerKey: `test-${userId}-${Date.now()}`,
    });

    return { success: true };
  }

  @Post('test/telegram')
  async sendTestTelegram(@Req() req: any) {
    const userId = req.user.sub;
    await this.notificationService.sendTestTelegram(userId);
    return { success: true };
  }

  @Post('test/email')
  async sendTestEmail(@Req() req: any) {
    const userId = req.user.sub;
    await this.notificationService.sendTestEmail(userId);
    return { success: true };
  }
}
