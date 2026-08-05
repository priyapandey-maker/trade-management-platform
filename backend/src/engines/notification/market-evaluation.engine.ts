import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, PortfolioPosition } from '@prisma/client';
import { NotificationType } from './notification.types';
import { TradeEventEngine } from './trade-event.engine';

const prisma = new PrismaClient();

@Injectable()
export class MarketEvaluationEngine {
  private readonly logger = new Logger(MarketEvaluationEngine.name);

  constructor(private readonly tradeEventEngine: TradeEventEngine) {}

  async evaluatePositions(quoteMap: Record<string, number>): Promise<void> {
    // 1. Fetch active open positions
    const positions = await prisma.portfolioPosition.findMany({
      where: { status: 'OPEN' },
    });

    const now = new Date();

    for (const pos of positions) {
      // ⚡ SPAM PREVENTION: Exclude muted tickers
      if (pos.muteAlertsUntil && new Date(pos.muteAlertsUntil) > now) {
        continue;
      }

      const cmp = quoteMap[pos.symbol.toUpperCase()] || quoteMap[pos.symbol.split('.')[0].toUpperCase()];
      if (cmp === undefined) continue;

      // Evaluation Conditions
      const diffFromBuy = Math.abs(cmp - pos.buyPrice) / pos.buyPrice;
      const proximityThreshold = (pos.nearBuyProximityPct || 1.0) / 100;
      const atBuyPrice = Math.abs(cmp - pos.buyPrice) < 0.01;
      const nearBuyPrice = diffFromBuy <= proximityThreshold;

      // Target Price Check
      let targetHit = false;
      let stopLossHit = false;

      if (pos.tradeType === 'BUY') {
        if (pos.targetPrice !== null && pos.targetPrice !== undefined && cmp >= pos.targetPrice) {
          targetHit = true;
        } else if (pos.stopLoss !== null && pos.stopLoss !== undefined && cmp <= pos.stopLoss) {
          stopLossHit = true;
        }
      } else if (pos.tradeType === 'SELL') {
        if (pos.targetPrice !== null && pos.targetPrice !== undefined && cmp <= pos.targetPrice) {
          targetHit = true;
        } else if (pos.stopLoss !== null && pos.stopLoss !== undefined && cmp >= pos.stopLoss) {
          stopLossHit = true;
        }
      }

      // Handle hit events with higher priority (breaks evaluating buy/near buy triggers since position is closed)
      if (targetHit) {
        await this.tradeEventEngine.handleEvaluationEvent(pos, NotificationType.TARGET_HIT, cmp);
        continue;
      }

      if (stopLossHit) {
        await this.tradeEventEngine.handleEvaluationEvent(pos, NotificationType.STOP_LOSS, cmp);
        continue;
      }

      // ⚡ Price Movement Alerts (2%, 3%, 5% from Buy Price)
      const movementPct = diffFromBuy * 100;
      let thresholdTriggered = 0;
      let fieldToUpdate = '';

      if (movementPct >= 5.0 && !pos.alert5Sent) {
        thresholdTriggered = 5;
        fieldToUpdate = 'alert5Sent';
      } else if (movementPct >= 3.0 && !pos.alert3Sent) {
        thresholdTriggered = 3;
        fieldToUpdate = 'alert3Sent';
      } else if (movementPct >= 2.0 && !pos.alert2Sent) {
        thresholdTriggered = 2;
        fieldToUpdate = 'alert2Sent';
      }

      if (thresholdTriggered > 0 && fieldToUpdate) {
        const direction = cmp >= pos.buyPrice ? 'up' : 'down';
        const triggerKey = `${pos.id}-MOVEMENT-${thresholdTriggered}-${pos.buyPrice}`;
        
        await prisma.portfolioPosition.update({
          where: { id: pos.id },
          data: { [fieldToUpdate]: true },
        });

        await (this.tradeEventEngine as any).handlePriceMovementAlert(pos, thresholdTriggered, direction, cmp, triggerKey);
      }

      // If not closed, check buy price alerts
      if (atBuyPrice && pos.buyPriceAlertActive) {
        await this.tradeEventEngine.handleEvaluationEvent(pos, NotificationType.BUY_TRIGGER, cmp);
      } else if (nearBuyPrice && pos.nearBuyAlertActive) {
        await this.tradeEventEngine.handleEvaluationEvent(pos, NotificationType.NEAR_BUY, cmp);
      }
    }
  }
}
