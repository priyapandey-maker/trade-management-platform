import { Injectable, Logger } from '@nestjs/common';
import { MarketDataProvider, TickData, QuoteData, CandleData } from '../../../core/interfaces/market-provider.interface';

/**
 * TwelveDataMarketProvider
 * Primary active market data provider for institutional research terminal.
 * Outstanding native support for NSE India (exchange=NSE), deep historical intraday time series (1m, 5m, 15m, 30m, 1h),
 * and macro intervals (1day, 1week, 1month) without truncation.
 */
@Injectable()
export class TwelveDataMarketProvider implements MarketDataProvider {
  private readonly logger = new Logger(TwelveDataMarketProvider.name);
  private readonly baseUrl = 'https://api.twelvedata.com';
  private symbols: Set<string> = new Set();
  private callback: ((tick: TickData) => void) | null = null;
  private timer: NodeJS.Timeout | null = null;

  private getApiKey(): string {
    return process.env.TWELVE_DATA_API_KEY || 'demo';
  }

  async connect(): Promise<void> {
    this.logger.log('Connected to Twelve Data Market Provider (Active Primary Engine)');
    this.timer = setInterval(() => this.pollPrices(), 15000);
  }

  async disconnect(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('Disconnected from Twelve Data Market Provider');
  }

  subscribe(symbols: string[], callback: (tick: TickData) => void): void {
    for (const sym of symbols) {
      this.symbols.add(sym.toUpperCase());
    }
    this.callback = callback;
    this.pollPrices();
  }

  /**
   * Translate institutional symbol (e.g. RELIANCE.NS) to Twelve Data parameters
   */
  private parseSymbolAndExchange(symbolInput: string): { symbol: string; exchange: string } {
    const raw = symbolInput.trim().toUpperCase();
    if (raw.endsWith('.NS')) {
      return { symbol: raw.replace('.NS', ''), exchange: 'NSE' };
    }
    if (raw.endsWith('.BSE')) {
      return { symbol: raw.replace('.BSE', ''), exchange: 'BSE' };
    }
    if (raw.endsWith('.TRT') || raw.endsWith('.BO')) {
      return { symbol: raw.split('.')[0], exchange: 'BSE' };
    }
    return { symbol: raw, exchange: 'NSE' }; // Default institutional exchange for India
  }

  /**
   * Map standard interval names to Twelve Data interval string
   */
  private mapInterval(interval: string): string {
    const norm = interval.toLowerCase().trim();
    switch (norm) {
      case '1m':
      case '1min':
        return '1min';
      case '5m':
      case '5min':
        return '5min';
      case '15m':
      case '15min':
        return '15min';
      case '30m':
      case '30min':
        return '30min';
      case '1h':
      case '60m':
      case '60min':
        return '1h';
      case '1d':
      case 'day':
      case 'daily':
        return '1day';
      case '1wk':
      case '1w':
      case 'week':
      case 'weekly':
        return '1week';
      case '1mo':
      case '1mth':
      case 'month':
      case 'monthly':
        return '1month';
      default:
        return '1week'; // Default strategy interval
    }
  }

  /**
   * Compute required outputsize based on timeframe range selection to prevent truncation
   */
  private getOutputSize(interval: string, range?: string): number {
    const tdInterval = this.mapInterval(interval);
    const isIntraday = ['1min', '5min', '15min', '30min', '1h'].includes(tdInterval);
    const rng = (range || '1Y').toUpperCase();

    if (rng === 'MAX') return 5000; // Twelve Data max limit
    if (rng === '5Y') return isIntraday ? 5000 : tdInterval === '1week' ? 265 : tdInterval === '1month' ? 60 : 1260;
    if (rng === '3Y') return isIntraday ? 5000 : tdInterval === '1week' ? 160 : tdInterval === '1month' ? 36 : 760;
    if (rng === '2Y') return isIntraday ? 3000 : tdInterval === '1week' ? 106 : tdInterval === '1month' ? 24 : 510;
    if (rng === '1Y') return isIntraday ? 2000 : tdInterval === '1week' ? 54 : tdInterval === '1month' ? 12 : 255;
    if (rng === 'YTD') {
      const now = new Date();
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
      return Math.max(20, Math.floor((dayOfYear * 5) / 7));
    }
    if (rng === '6M') return isIntraday ? 1500 : tdInterval === '1week' ? 27 : 130;
    if (rng === '3M') return isIntraday ? 800 : tdInterval === '1week' ? 14 : 66;
    if (rng === '1M') return isIntraday ? 350 : 23;
    if (rng === '5D') return isIntraday ? 200 : 10;
    if (rng === '1D') return isIntraday ? 80 : 5;

    return 300;
  }

  async getCandles(symbolInput: string, intervalInput: string, range = '1Y'): Promise<CandleData[]> {
    const { symbol, exchange } = this.parseSymbolAndExchange(symbolInput);
    const tdInterval = this.mapInterval(intervalInput);
    const outputSize = this.getOutputSize(intervalInput, range);
    const apiKey = this.getApiKey();

    const url = `${this.baseUrl}/time_series?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}&interval=${tdInterval}&outputsize=${outputSize}&apikey=${apiKey}`;

    this.logger.debug(`Twelve Data time_series request: ${symbol} (${exchange}) interval=${tdInterval} size=${outputSize}`);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Twelve Data HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status === 'error' || data.code || !data.values || !Array.isArray(data.values)) {
      const errMsg = data.message || (data.code ? `API Error Code ${data.code}` : 'Invalid values array returned');
      throw new Error(`Twelve Data time_series failed for ${symbolInput}: ${errMsg}`);
    }

    // Twelve Data returns time series in descending order (newest first).
    // Chart engine requires ascending chronological order (oldest first).
    const reversedValues = [...data.values].reverse();
    const tz = data.meta?.exchange_timezone || 'Asia/Kolkata';

    const candles: CandleData[] = reversedValues.map((v: any) => {
      const dtStr = v.datetime;
      const dtObj = new Date(dtStr);
      return {
        date: dtObj.toISOString(),
        time: Math.floor(dtObj.getTime() / 1000),
        open: Number(parseFloat(v.open || 0).toFixed(2)),
        high: Number(parseFloat(v.high || 0).toFixed(2)),
        low: Number(parseFloat(v.low || 0).toFixed(2)),
        close: Number(parseFloat(v.close || 0).toFixed(2)),
        volume: Number(parseInt(v.volume || 0, 10)),
        timezone: tz,
      };
    });

    if (candles.length === 0) {
      throw new Error(`No historical candles found in Twelve Data for ${symbolInput} (${tdInterval})`);
    }

    return candles;
  }

  async getQuote(symbolInput: string): Promise<QuoteData> {
    const { symbol, exchange } = this.parseSymbolAndExchange(symbolInput);
    const apiKey = this.getApiKey();
    const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}&apikey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Twelve Data quote HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data.status === 'error' || !data.close) {
      throw new Error(`Twelve Data quote failed for ${symbolInput}: ${data.message || 'No close price'}`);
    }

    const price = Number(parseFloat(data.close).toFixed(2));
    const prevClose = Number(parseFloat(data.previous_close || data.close).toFixed(2));
    const change = Number((price - prevClose).toFixed(2));
    const changePercent = prevClose !== 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

    return {
      symbol: symbolInput.toUpperCase(),
      company: data.name || symbol,
      price,
      change,
      changePercent,
      previousClose: prevClose,
      high: Number(parseFloat(data.high || data.close).toFixed(2)),
      low: Number(parseFloat(data.low || data.close).toFixed(2)),
      volume: Number(parseInt(data.volume || 0, 10)),
      timestamp: data.timestamp ? new Date(data.timestamp * 1000) : new Date(),
    };
  }

  async getQuotes(symbols: string[]): Promise<QuoteData[]> {
    return Promise.all(
      symbols.map((s) =>
        this.getQuote(s).catch((err) => {
          this.logger.debug(`Twelve Data getQuote failed for ${s}: ${err.message}`);
          throw err;
        })
      )
    );
  }

  private async pollPrices(): Promise<void> {
    if (this.symbols.size === 0 || !this.callback) return;
    const symArray = Array.from(this.symbols);
    for (const sym of symArray) {
      try {
        const q = await this.getQuote(sym);
        if (q && q.price) {
          this.callback({
            symbol: sym,
            price: q.price,
            volume: q.volume,
            timestamp: Date.now(),
          });
        }
      } catch (e: any) {
        // Silently skip tick errors to prevent log flooding during rate limits
      }
    }
  }
}
