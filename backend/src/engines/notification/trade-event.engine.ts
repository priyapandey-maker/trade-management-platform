import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient, PortfolioPosition } from '@prisma/client';
import { NotificationType } from './notification.types';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();

@Injectable()
export class TradeEventEngine {
  private readonly logger = new Logger(TradeEventEngine.name);

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  async handleEvaluationEvent(pos: PortfolioPosition, type: NotificationType, currentPrice: number): Promise<void> {
    const triggerKey = `${pos.id}-${type}-${pos.buyPrice}`;

    if (type === NotificationType.TARGET_HIT || type === NotificationType.STOP_LOSS) {
      // 1. Move trade from Open Positions to Closed Positions first
      const start = new Date(pos.entryDate).getTime();
      const end = Date.now();
      const diffDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));

      const investedAmount = pos.buyPrice * pos.quantity;
      const currentValue = currentPrice * pos.quantity;
      let profitLoss = 0;
      if (pos.tradeType === 'SELL') {
        profitLoss = (pos.buyPrice - currentPrice) * pos.quantity - pos.brokerCharges;
      } else {
        profitLoss = (currentPrice - pos.buyPrice) * pos.quantity - pos.brokerCharges;
      }
      const profitLossPct = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;

      // Close the position
      await prisma.portfolioPosition.update({
        where: { id: pos.id },
        data: {
          status: 'CLOSED',
          currentPrice,
          currentValue,
          profitLoss,
          profitLossPct,
          sellingPrice: currentPrice,
          closedAt: new Date(),
          exitReason: type === NotificationType.TARGET_HIT ? 'TARGET_HIT' : 'STOP_LOSS_HIT',
          holdingPeriod: diffDays,
        },
      });

      this.logger.log(`Automatic trade closed: ${pos.symbol} on ${type}`);

      // 2. Publish target hit / stop loss notification event
      const message = type === NotificationType.TARGET_HIT
        ? `Target Price of ₹${pos.targetPrice} hit for ${pos.symbol} at ₹${currentPrice}. Trade closed successfully.`
        : `Stop Loss Limit of ₹${pos.stopLoss} triggered for ${pos.symbol} at ₹${currentPrice}. Trade closed to manage risk.`;

      await this.notificationService.createNotification({
        type,
        symbol: pos.symbol,
        company: pos.company,
        message,
        triggerPrice: currentPrice,
        triggerKey,
        metadata: {
          buyPrice: pos.buyPrice,
          targetPrice: pos.targetPrice,
          stopLoss: pos.stopLoss,
          profitLoss,
          profitLossPct,
          currentPrice,
        },
      });

    } else if (type === NotificationType.BUY_TRIGGER) {
      // Trigger price is exactly or cross buy price
      const message = `Stock return at Buy Price limit of ₹${pos.buyPrice} reached.`;
      await this.notificationService.createNotification({
        type,
        symbol: pos.symbol,
        company: pos.company,
        message,
        triggerPrice: currentPrice,
        triggerKey,
        metadata: {
          buyPrice: pos.buyPrice,
          targetPrice: pos.targetPrice,
          stopLoss: pos.stopLoss,
        },
      });

    } else if (type === NotificationType.NEAR_BUY) {
      // Proximity event
      const message = `Stock within proximity range (±${pos.nearBuyProximityPct}%) of Buy Price ₹${pos.buyPrice}.`;
      await this.notificationService.createNotification({
        type,
        symbol: pos.symbol,
        company: pos.company,
        message,
        triggerPrice: currentPrice,
        triggerKey,
        metadata: {
          buyPrice: pos.buyPrice,
          targetPrice: pos.targetPrice,
          stopLoss: pos.stopLoss,
        },
      });
    }
  }

  // Hook for Manual Trade Close
  async handleManualCloseEvent(pos: PortfolioPosition, closingPrice: number, profitLoss: number, profitLossPct: number): Promise<void> {
    const triggerKey = `${pos.id}-MANUAL_CLOSE-${Date.now()}`;
    const message = `Position manually closed by platform administrator at ₹${closingPrice}.`;
    await this.notificationService.createNotification({
      type: NotificationType.TRADE_CLOSED,
      symbol: pos.symbol,
      company: pos.company,
      message,
      triggerPrice: closingPrice,
      triggerKey,
      metadata: {
        buyPrice: pos.buyPrice,
        currentPrice: closingPrice,
        profitLoss,
        profitLossPct,
      },
    });
  }
}
