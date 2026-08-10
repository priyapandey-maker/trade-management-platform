import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { NotificationType } from './notification.types';
import { NotificationService } from './NotificationService';
import {
  calculateInvestment,
  calculateCurrentValue,
  calculateLivePnL,
  calculateReturnPct,
  calculateRealizedPnL
} from '../../shared/financial-calculations';

const prisma = new PrismaClient();

@Injectable()
export class DailySummaryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailySummaryService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly notificationService: NotificationService) {}

  onModuleInit() {
    // Run summary time check every 1 minute
    this.timer = setInterval(() => this.checkSummarySchedule(), 60000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async checkSummarySchedule() {
    try {
      const summaryTimeStr = process.env.SUMMARY_TIME || '16:15';
      const timezone = process.env.MARKET_TIMEZONE || 'Asia/Kolkata';

      // Verify current local time in target timezone
      const localString = new Date().toLocaleString('en-US', { timeZone: timezone });
      const localDate = new Date(localString);

      // Summaries only run Mon-Fri
      const day = localDate.getDay();
      if (day === 0 || day === 6) return;

      const currentHour = localDate.getHours();
      const currentMinute = localDate.getMinutes();

      const [targetHour, targetMinute] = summaryTimeStr.split(':').map((s) => parseInt(s));

      if (currentHour === targetHour && currentMinute === targetMinute) {
        await this.generateDailySummary();
      }
    } catch (err: any) {
      this.logger.error(`Error checking summary schedule: ${err.message}`);
    }
  }

  async generateDailySummary() {
    this.logger.log('Generating Daily Portfolio Summary...');

    // Fetch active open positions
    const openPositionsRaw = await prisma.portfolioPosition.findMany({
      where: { status: 'OPEN' },
    });

    // Fetch closed positions
    const closedPositionsRaw = await prisma.portfolioPosition.findMany({
      where: { status: 'CLOSED' },
    });

    const totalOpen = openPositionsRaw.length;
    const totalClosed = closedPositionsRaw.length;

    // Recalculate open positions
    let totalInvested = 0;
    let currentValue = 0;
    let unrealizedPnL = 0;
    const openPositionsRecalc = openPositionsRaw.map((p) => {
      const bp = p.buyPrice;
      const qty = p.quantity;
      const cp = p.currentPrice;
      const tradeType = p.tradeType;

      const inv = calculateInvestment(bp, qty);
      const val = calculateCurrentValue(cp, qty, tradeType, bp);
      const pnl = calculateLivePnL(bp, cp, qty, tradeType);
      const pct = calculateReturnPct(bp, cp, tradeType);

      totalInvested += inv;
      currentValue += val;
      unrealizedPnL += pnl;

      return {
        ...p,
        investedAmount: inv,
        currentValue: val,
        profitLoss: pnl,
        profitLossPct: pct,
      };
    });

    const unrealizedPnLPct = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;

    // Find best and worst performer (based on recalculated values)
    let bestPerformer = 'N/A';
    let worstPerformer = 'N/A';
    if (openPositionsRecalc.length > 0) {
      const sorted = [...openPositionsRecalc].sort((a, b) => b.profitLossPct - a.profitLossPct);
      bestPerformer = `${sorted[0].symbol} (${sorted[0].profitLossPct >= 0 ? '+' : ''}${sorted[0].profitLossPct.toFixed(2)}%)`;
      worstPerformer = `${sorted[sorted.length - 1].symbol} (${sorted[sorted.length - 1].profitLossPct >= 0 ? '+' : ''}${sorted[sorted.length - 1].profitLossPct.toFixed(2)}%)`;
    }

    // Recalculate closed positions
    let wins = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let realizedPnLToday = 0;
    for (const p of closedPositionsRaw) {
      const bp = p.buyPrice;
      const qty = p.quantity;
      const tradeType = p.tradeType;
      const sp = p.sellingPrice ?? p.currentPrice ?? bp;

      const pnl = calculateRealizedPnL(bp, sp, qty, tradeType);
      if (pnl > 0) {
        wins += 1;
      }

      if (p.closedAt && new Date(p.closedAt) >= startOfToday) {
        realizedPnLToday += pnl;
      }
    }
    const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
    const todaysPnL = realizedPnLToday + unrealizedPnL;

    const message = `Today's Portfolio Status:
- Today's P&L: ₹${todaysPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
- Open Positions: ${totalOpen} active trades
- Closed Positions: ${totalClosed} trades
- Win Rate: ${winRate.toFixed(1)}%
- Total Portfolio Value: ₹${currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
- Best Performer: ${bestPerformer}
- Worst Performer: ${worstPerformer}`;

    const triggerKey = `daily-summary-${new Date().toISOString().substring(0, 10)}`;

    await this.notificationService.createNotification({
      type: NotificationType.DAILY_SUMMARY,
      symbol: 'PORTFOLIO',
      company: 'SHREE ASSOCIATES Portfolio',
      message,
      triggerKey,
      metadata: {
        totalOpen,
        totalClosed,
        totalInvested,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPct,
        winRate,
        bestPerformer,
        worstPerformer,
        todaysPnL,
      },
    });
  }
}
