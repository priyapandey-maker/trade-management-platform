import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MarketService } from '../market/market.service';
import { MarketEvaluationEngine } from './market-evaluation.engine';

const prisma = new PrismaClient();

@Injectable()
export class MarketPollingEngine implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketPollingEngine.name);
  private timer: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    private readonly marketService: MarketService,
    private readonly marketEvaluationEngine: MarketEvaluationEngine,
  ) {}

  onModuleInit() {
    this.logger.log('Market Polling Engine starting...');
    // Poll checks every 15 seconds. Frequency evaluation logic determines actual API call speed.
    this.timer = setInterval(() => this.runPollCycle(), 15000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private isMarketOpen(localDate: Date): boolean {
    // Check if weekend
    const day = localDate.getDay();
    if (day === 0 || day === 6) return false;

    const openTimeStr = process.env.MARKET_OPEN || '09:15';
    const closeTimeStr = process.env.MARKET_CLOSE || '15:30';

    const [openH, openM] = openTimeStr.split(':').map((s) => parseInt(s));
    const [closeH, closeM] = closeTimeStr.split(':').map((s) => parseInt(s));

    const currentH = localDate.getHours();
    const currentM = localDate.getMinutes();

    const currentVal = currentH * 60 + currentM;
    const openVal = openH * 60 + openM;
    const closeVal = closeH * 60 + closeM;

    return currentVal >= openVal && currentVal <= closeVal;
  }

  private lastPollTime = 0;

  async runPollCycle() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // 1. Skip polling if there are 0 open BUY positions to save API calls
      const count = await prisma.portfolioPosition.count({
        where: { status: 'OPEN', tradeType: 'BUY' },
      });

      if (count === 0) {
        this.isPolling = false;
        return;
      }

      const timezone = process.env.MARKET_TIMEZONE || 'Asia/Kolkata';
      const localString = new Date().toLocaleString('en-US', { timeZone: timezone });
      const localDate = new Date(localString);

      const open = this.isMarketOpen(localDate);
      const nowMs = Date.now();

      // Poll every 15 seconds if market is open. If closed, poll once every 10 minutes (600,000 ms)
      const waitInterval = open ? 15000 : 600000;
      if (nowMs - this.lastPollTime < waitInterval) {
        this.isPolling = false;
        return;
      }

      this.lastPollTime = nowMs;

      // Extract unique active symbols
      const positions = await prisma.portfolioPosition.findMany({
        where: { status: 'OPEN', tradeType: 'BUY' },
        select: { symbol: true },
      });
      const symbols = Array.from(new Set(positions.map((p) => p.symbol)));

      if (symbols.length === 0) {
        this.isPolling = false;
        return;
      }

      this.logger.debug(`Polling live quotes for ${symbols.length} positions...`);
      const quotes = await this.marketService.getQuotes(symbols);
      const quoteMap: Record<string, number> = {};

      for (const q of quotes) {
        if (q && q.price) {
          const sym = q.symbol.toUpperCase();
          quoteMap[sym] = q.price;
          quoteMap[sym.split('.')[0]] = q.price;
        }
      }

      // Evaluate price matching rules
      await this.marketEvaluationEngine.evaluatePositions(quoteMap);
    } catch (err: any) {
      this.logger.error(`Error in MarketPollingEngine cycle: ${err.message}`);
    } finally {
      this.isPolling = false;
    }
  }
}
