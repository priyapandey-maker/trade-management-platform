import { Injectable, Logger } from '@nestjs/common';
import {
  MarketDataProvider,
  TickData,
  QuoteData,
  CandleData,
} from '../../../core/interfaces/market-provider.interface';
const yahooFinance = require('yahoo-finance2').default;

/**
 * YahooMarketProvider
 * @deprecated (Fallback only)
 * Relegated to a tertiary fallback provider due to production reliability issues,
 * intraday truncation, and random symbol resolution failures.
 * Everything passes through MarketDataProvider interface for clean decoupling.
 */
@Injectable()
export class YahooMarketProvider implements MarketDataProvider {
  private readonly logger = new Logger(YahooMarketProvider.name);
  private symbols: Set<string> = new Set();
  private callback: ((tick: TickData) => void) | null = null;
  private timer: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    this.logger.log(
      'Connected to Yahoo Finance Market Provider (@deprecated Fallback Engine)',
    );
    this.timer = setInterval(() => this.pollPrices(), 15000);
  }

  async disconnect(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('Disconnected from Yahoo Finance Market Provider');
  }

  subscribe(symbols: string[], callback: (tick: TickData) => void): void {
    for (const sym of symbols) {
      const formatted = sym.includes('.') ? sym : `${sym}.NS`;
      this.symbols.add(formatted.toUpperCase());
    }
    this.callback = callback;
    this.pollPrices();
  }

  private formatSymbol(symbolInput: string): string {
    let sym = symbolInput.trim().toUpperCase();
    if (!sym.includes('.') && !sym.includes('-')) sym += '.NS';
    return sym;
  }

  private mapInterval(interval: string): string {
    const norm = interval.toLowerCase().trim();
    switch (norm) {
      case '1m':
      case '1min':
        return '1m';
      case '5m':
      case '5min':
        return '5m';
      case '15m':
      case '15min':
        return '15m';
      case '30m':
      case '30min':
        return '30m';
      case '1h':
      case '60m':
      case '60min':
        return '60m';
      case '1d':
      case 'day':
      case 'daily':
        return '1d';
      case '1wk':
      case '1w':
      case 'week':
      case 'weekly':
        return '1wk';
      case '1mo':
      case '1mth':
      case 'month':
      case 'monthly':
        return '1mo';
      default:
        return '1wk';
    }
  }

  async getCandles(
    symbolInput: string,
    intervalInput: string,
    range = '1Y',
  ): Promise<CandleData[]> {
    const sym = this.formatSymbol(symbolInput);
    const yf = yahooFinance;
    const interval = this.mapInterval(intervalInput);

    // Calculate lookback based on range to prevent unnecessary truncation
    const now = Date.now();
    let lookbackDays = 365;
    const rng = (range || '1Y').toUpperCase();
    if (rng === 'MAX')
      lookbackDays = 7300; // ~20 years
    else if (rng === '5Y') lookbackDays = 1825;
    else if (rng === '3Y') lookbackDays = 1095;
    else if (rng === '2Y') lookbackDays = 730;
    else if (rng === '1Y') lookbackDays = 365;
    else if (rng === '6M') lookbackDays = 180;
    else if (rng === '3M') lookbackDays = 90;
    else if (rng === '1M') lookbackDays = 30;
    else if (rng === '5D') lookbackDays = 10;
    else if (rng === '1D') lookbackDays = 3;

    // Yahoo imposes strict intraday limits (e.g., 1m is max 7 days)
    if (['1m', '2m', '5m'].includes(interval) && lookbackDays > 7)
      lookbackDays = 7;
    if (['15m', '30m', '60m'].includes(interval) && lookbackDays > 60)
      lookbackDays = 60;

    const period1 = new Date(now - lookbackDays * 24 * 60 * 60 * 1000);

    this.logger.debug(
      `Yahoo Finance chart request (fallback): ${sym} (${interval})`,
    );
    const chart = await yf
      .chart(sym, {
        period1,
        interval: interval as any,
      })
      .catch((e: any) => {
        throw new Error(`Yahoo chart error for ${sym}: ${e.message}`);
      });

    const quotes = chart?.quotes || [];
    const candles: CandleData[] = [];

    for (const q of quotes) {
      if (
        q &&
        q.open !== null &&
        q.high !== null &&
        q.low !== null &&
        q.close !== null
      ) {
        const dt = new Date(q.date);
        candles.push({
          date: dt.toISOString(),
          time: Math.floor(dt.getTime() / 1000),
          open: Number(q.open.toFixed(2)),
          high: Number(q.high.toFixed(2)),
          low: Number(q.low.toFixed(2)),
          close: Number(q.close.toFixed(2)),
          volume: Number(q.volume || 0),
          timezone: chart?.meta?.exchangeTimezoneName || 'Asia/Kolkata',
        });
      }
    }

    if (candles.length === 0) {
      throw new Error(
        `No candles parsed from Yahoo Finance for ${sym} (${interval})`,
      );
    }

    return candles;
  }

  async getQuote(symbolInput: string): Promise<QuoteData> {
    const sym = this.formatSymbol(symbolInput);
    const yf = yahooFinance;
    const quote = await yf.quote(sym);

    if (!quote || !quote.regularMarketPrice) {
      throw new Error(`Yahoo quote failed for ${sym}: No price returned`);
    }

    return {
      symbol: sym,
      company: quote.longName || quote.shortName || sym,
      price: Number(quote.regularMarketPrice.toFixed(2)),
      change: Number((quote.regularMarketChange || 0).toFixed(2)),
      changePercent: Number((quote.regularMarketChangePercent || 0).toFixed(2)),
      previousClose: Number(
        (quote.regularMarketPreviousClose || quote.regularMarketPrice).toFixed(
          2,
        ),
      ),
      high: Number(
        (quote.regularMarketDayHigh || quote.regularMarketPrice).toFixed(2),
      ),
      low: Number(
        (quote.regularMarketDayLow || quote.regularMarketPrice).toFixed(2),
      ),
      volume: Number(quote.regularMarketVolume || 0),
      timestamp: new Date(),
    };
  }

  async getQuotes(symbols: string[]): Promise<QuoteData[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  }

  private async pollPrices(): Promise<void> {
    if (this.symbols.size === 0 || !this.callback) return;
    const yf = yahooFinance;
    const symArray = Array.from(this.symbols);
    for (const sym of symArray) {
      try {
        const quote = await yf.quote(sym);
        if (quote && quote.regularMarketPrice) {
          this.callback({
            symbol: sym,
            price: quote.regularMarketPrice,
            volume: quote.regularMarketVolume || 0,
            timestamp: Date.now(),
          });
        }
      } catch (err: any) {
        this.logger.debug(
          `Failed polling fallback price for ${sym}: ${err.message}`,
        );
      }
    }
  }
}
