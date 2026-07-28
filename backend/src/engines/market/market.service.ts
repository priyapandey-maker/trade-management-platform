import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, HttpException, HttpStatus } from '@nestjs/common';
import type { MarketDataProvider, TickData } from '../../core/interfaces/market-provider.interface';
import { RedisService } from '../../core/services/redis/redis.service';
import { OrderBlockService, WeeklyCandle, OrderBlockResult } from './order-block.service';
import { 
  calculateRSI, 
  detectFVG, 
  calculateSupport, 
  calculateResistance, 
  generateRecommendation, 
  Candle 
} from './institutional-analysis';

export interface WeeklyMarketAnalysis {
  symbol: string;
  currentPrice: number;
  weeklySupport: {
    supportPrice: number;
    currentPrice: number;
    distancePct: number;
  };
  weeklyResistance: {
    resistancePrice: number;
    currentPrice: number;
    distancePct: number;
  };
  weeklyRsi: {
    rsi: number;
    period: number;
    state: string;
  };
  weeklyOrderBlock: OrderBlockResult;
  fvg: {
    bullish: any[];
    bearish: any[];
  };
  recommendation: any;
  weeklyCandlesCount: number;
}

@Injectable()
export class MarketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketService.name);
  private readonly memoryCache = new Map<string, { data: any; expiresAt: number }>();

  constructor(
    @Inject('MARKET_DATA_PROVIDER') private readonly marketProvider: MarketDataProvider,
    private readonly redisService: RedisService,
    private readonly orderBlockService: OrderBlockService,
  ) {}

  async onModuleInit() {
    await this.marketProvider.connect();
    const targetSymbols = ['RELIANCE.NS', 'HDFCBANK.NS', 'TCS.NS', 'INFY.NS'];
    this.marketProvider.subscribe(targetSymbols, (tick) => this.handleTick(tick));
  }

  async onModuleDestroy() {
    await this.marketProvider.disconnect();
  }

  async subscribeSymbols(symbols: string[]) {
    this.marketProvider.subscribe(symbols, (tick) => this.handleTick(tick));
  }

  private formatSymbol(symbolInput: string): string {
    let symbol = symbolInput.trim().toUpperCase();
    if (!symbol.includes('.') && !symbol.includes('-')) symbol += '.NS';
    return symbol;
  }

  async getQuote(symbolInput: string): Promise<any> {
    const symbol = this.formatSymbol(symbolInput);
    const cacheKey = `market:quote:${symbol}`;
    const now = Date.now();
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      const quote = await this.marketProvider.getQuote(symbol);
      this.memoryCache.set(cacheKey, { data: quote, expiresAt: now + 30 * 1000 }); // 30s TTL for live quotes
      return quote;
    } catch (error: any) {
      this.logger.warn(`Failed to fetch quote for ${symbol}: ${error.message}`);
      throw new HttpException(
        {
          status: 'error',
          message: `Unable to fetch live market data for symbol "${symbol}".`,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getQuotes(symbols: string[]): Promise<any[]> {
    const results = await Promise.all(
      symbols.map((s) =>
        this.getQuote(s).catch(() => ({
          symbol: s,
          error: 'Unable to fetch live market data.',
        })),
      ),
    );
    return results;
  }

  /**
   * Fetches WEEKLY chart data from MarketDataProvider and delegates calculations to @shree/institutional-analysis.
   * Decoupled from any external provider APIs.
   */
  async getWeeklyMarketAnalysis(symbolInput: string): Promise<WeeklyMarketAnalysis> {
    const symbol = this.formatSymbol(symbolInput);
    const cacheKey = `market:weekly:${symbol}`;
    const now = Date.now();
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.logger.debug(`Returning cached weekly market analysis for ${symbol}`);
      return cached.data;
    }

    this.logger.log(`Fetching REAL historical weekly candles for ${symbol} via MarketDataProvider (4 years lookback)`);

    try {
      // Use 5Y range to ensure deep institutional lookback without truncation
      const rawCandles = await this.marketProvider.getCandles(symbol, '1wk', '5Y');

      if (!rawCandles || rawCandles.length < 15) {
        throw new HttpException(
          {
            status: 'error',
            message: `Insufficient real weekly candle data available for "${symbol}" to perform technical analysis.`,
            errorType: 'DATA_UNAVAILABLE',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const weeklyCandles: WeeklyCandle[] = [];
      const sharedCandles: Candle[] = [];
      for (const q of rawCandles) {
        if (q && q.open !== undefined && q.close !== undefined) {
          const dt = new Date(q.date);
          weeklyCandles.push({
            date: dt,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume || 0,
          });
          sharedCandles.push({
            date: dt,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume || 0,
          });
        }
      }

      const latestCandle = weeklyCandles[weeklyCandles.length - 1];
      const currentPrice = latestCandle.close;

      // Delegate to shared institutional analysis engines
      const rsiRes = calculateRSI(sharedCandles, 14);
      const fvgRes = detectFVG(sharedCandles);
      const suppRes = calculateSupport(sharedCandles);
      const resRes = calculateResistance(sharedCandles);
      const orderBlockResult = this.orderBlockService.evaluateWeeklyOrderBlocks(weeklyCandles);

      const latestBullOB = orderBlockResult.activeBullishZones.length > 0 ? orderBlockResult.activeBullishZones[orderBlockResult.activeBullishZones.length - 1] : null;
      const latestBearOB = orderBlockResult.activeBearishZones.length > 0 ? orderBlockResult.activeBearishZones[orderBlockResult.activeBearishZones.length - 1] : null;
      const latestBullFVG = fvgRes.bullish.length > 0 ? fvgRes.bullish[fvgRes.bullish.length - 1] : null;
      const latestBearFVG = fvgRes.bearish.length > 0 ? fvgRes.bearish[fvgRes.bearish.length - 1] : null;

      const recommendation = generateRecommendation({
        currentPrice,
        fundamentalScore: 3,
        rsiValue: rsiRes.current,
        activeBullishOB: latestBullOB ? { type: 'BULLISH', top: latestBullOB.top, bottom: latestBullOB.bottom, startIndex: latestBullOB.createdAtIndex, endIndex: sharedCandles.length - 1, price: latestBullOB.top, volume: 0, strength: { score: latestBullOB.strengthScore || 50, confidence: (latestBullOB.confidence as any) || 'MEDIUM', creationDate: '', age: 0, widthPct: latestBullOB.imbalancePct, mitigated: false, retestCount: 0 } } : null,
        activeBearishOB: latestBearOB ? { type: 'BEARISH', top: latestBearOB.top, bottom: latestBearOB.bottom, startIndex: latestBearOB.createdAtIndex, endIndex: sharedCandles.length - 1, price: latestBearOB.bottom, volume: 0, strength: { score: latestBearOB.strengthScore || 50, confidence: (latestBearOB.confidence as any) || 'MEDIUM', creationDate: '', age: 0, widthPct: latestBearOB.imbalancePct, mitigated: false, retestCount: 0 } } : null,
        activeBullishFVG: latestBullFVG,
        activeBearishFVG: latestBearFVG,
        supportDistancePct: suppRes ? suppRes.distancePct : null,
        resistanceDistancePct: resRes ? resRes.distancePct : null,
      });

      const supportPrice = suppRes ? suppRes.price : currentPrice;
      const supportDist = suppRes ? suppRes.distancePct : 0;
      const resistancePrice = resRes ? resRes.price : currentPrice;
      const resistanceDist = resRes ? resRes.distancePct : 0;

      const analysis: WeeklyMarketAnalysis = {
        symbol,
        currentPrice,
        weeklySupport: {
          supportPrice,
          currentPrice,
          distancePct: supportDist,
        },
        weeklyResistance: {
          resistancePrice,
          currentPrice,
          distancePct: resistanceDist,
        },
        weeklyRsi: {
          rsi: rsiRes.current,
          period: 14,
          state: rsiRes.state,
        },
        weeklyOrderBlock: orderBlockResult,
        fvg: fvgRes,
        recommendation,
        weeklyCandlesCount: weeklyCandles.length,
      };

      this.memoryCache.set(cacheKey, { data: analysis, expiresAt: now + 15 * 60 * 1000 });
      return analysis;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          status: 'error',
          message: `Market analysis unavailable for "${symbol}": ${error.message}`,
          errorType: 'API_ERROR',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getCandles(symbolInput: string, intervalInput = '1wk', rangeInput?: string): Promise<any> {
    const symbol = this.formatSymbol(symbolInput);
    const interval = intervalInput.toLowerCase().trim() || '1wk';
    const range = rangeInput ? rangeInput.toUpperCase().trim() : '1Y';
    const cacheKey = `market:candles:${symbol}:${interval}:${range}`;
    const now = Date.now();
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.logger.debug(`Returning cached candles for ${symbol} (${interval}, ${range})`);
      return cached.data;
    }

    try {
      const candles = await this.marketProvider.getCandles(symbol, interval, range);

      if (!candles || candles.length === 0) {
        throw new HttpException(
          {
            status: 'error',
            message: `No candlestick data available for "${symbol}" at interval ${interval}.`,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const latestCandle = candles[candles.length - 1];
      const currentPrice = latestCandle.close;

      // Requirement 6: Enforce Weekly Strategy regardless of chart interval
      const weeklyAnalysis = await this.getWeeklyMarketAnalysis(symbol).catch(() => null);

      const rsiRes = calculateRSI(candles as any, 14);
      const suppRes = calculateSupport(candles as any);
      const resRes = calculateResistance(candles as any);

      const obCandles: WeeklyCandle[] = candles.map((c) => ({
        date: new Date(c.date),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
      const localOB = this.orderBlockService.evaluateWeeklyOrderBlocks(obCandles);
      const localFVG = detectFVG(candles as any);

      const result = {
        symbol,
        interval,
        range,
        candles,
        currentPrice,
        isWeeklyStrategyEnforced: true,
        support: {
          price: weeklyAnalysis ? weeklyAnalysis.weeklySupport.supportPrice : (suppRes ? suppRes.price : currentPrice),
          distancePct: weeklyAnalysis ? weeklyAnalysis.weeklySupport.distancePct : (suppRes ? suppRes.distancePct : 0),
        },
        resistance: {
          price: weeklyAnalysis ? (weeklyAnalysis as any).weeklyResistance?.resistancePrice || currentPrice : (resRes ? resRes.price : currentPrice),
          distancePct: weeklyAnalysis ? (weeklyAnalysis as any).weeklyResistance?.distancePct || 0 : (resRes ? resRes.distancePct : 0),
        },
        rsi: {
          current: rsiRes.current,
          state: rsiRes.state,
          history: rsiRes.history,
        },
        orderBlocks: weeklyAnalysis ? weeklyAnalysis.weeklyOrderBlock : localOB,
        fvg: weeklyAnalysis ? weeklyAnalysis.fvg : localFVG,
        recommendation: weeklyAnalysis ? weeklyAnalysis.recommendation : null,
        timestamp: new Date().toISOString(),
      };

      // Multi-tier caching durations per requirements:
      // Intraday: 1 min | Daily: 5 mins | Weekly/Monthly: 15 mins
      const isIntraday = ['1m', '5m', '15m', '30m', '1h', '60m', '1min', '5min', '15min', '30min', '60min'].includes(interval);
      const ttlMs = isIntraday ? 60 * 1000 : (interval === '1d' || interval === 'daily' || interval === 'day' ? 5 * 60 * 1000 : 15 * 60 * 1000);
      
      this.memoryCache.set(cacheKey, { data: result, expiresAt: now + ttlMs });

      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          status: 'error',
          message: error.message || 'No market data available.',
          errorType: 'DATA_UNAVAILABLE',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async handleTick(tick: TickData) {
    const tickJson = JSON.stringify(tick);
    await this.redisService.hset('market:latest_ticks', tick.symbol, tickJson);
    await this.redisService.publish(`market:ticks:${tick.symbol}`, tickJson);
    this.logger.debug(`[REAL TICK] ${tick.symbol} @ ₹${tick.price}`);
  }
}
