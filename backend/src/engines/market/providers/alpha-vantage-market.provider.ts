import { Injectable, Logger } from '@nestjs/common';
import { MarketDataProvider, TickData, QuoteData, CandleData } from '../../../core/interfaces/market-provider.interface';

/**
 * AlphaVantageMarketProvider
 * Secondary pluggable provider for institutional research terminal time series failover.
 * Supports Daily, Weekly, Monthly, and Intraday intervals with BSE/NSE symbol translation.
 */
@Injectable()
export class AlphaVantageMarketProvider implements MarketDataProvider {
  private readonly logger = new Logger(AlphaVantageMarketProvider.name);
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private symbols: Set<string> = new Set();
  private callback: ((tick: TickData) => void) | null = null;

  private getApiKey(): string {
    return process.env.ALPHA_VANTAGE_API_KEY || 'demo';
  }

  async connect(): Promise<void> {
    this.logger.log('Connected to Alpha Vantage Market Provider (Secondary Failover Engine)');
  }

  async disconnect(): Promise<void> {
    this.logger.log('Disconnected from Alpha Vantage Market Provider');
  }

  subscribe(symbols: string[], callback: (tick: TickData) => void): void {
    for (const sym of symbols) {
      this.symbols.add(sym.toUpperCase());
    }
    this.callback = callback;
  }

  private formatSymbol(symbolInput: string): string {
    const raw = symbolInput.trim().toUpperCase();
    if (raw.endsWith('.NS')) return raw.replace('.NS', '.BSE'); // Alpha Vantage prefers .BSE for Indian equities
    if (!raw.includes('.')) return `${raw}.BSE`;
    return raw;
  }

  async getCandles(symbolInput: string, intervalInput: string, range = '1Y'): Promise<CandleData[]> {
    const sym = this.formatSymbol(symbolInput);
    const apiKey = this.getApiKey();
    const normInterval = intervalInput.toLowerCase().trim();

    let func = 'TIME_SERIES_DAILY';
    let avIntervalParam = '';
    let timeSeriesKey = 'Time Series (Daily)';

    if (['1wk', '1w', 'week', 'weekly'].includes(normInterval)) {
      func = 'TIME_SERIES_WEEKLY';
      timeSeriesKey = 'Weekly Time Series';
    } else if (['1mo', '1mth', 'month', 'monthly'].includes(normInterval)) {
      func = 'TIME_SERIES_MONTHLY';
      timeSeriesKey = 'Monthly Time Series';
    } else if (['1m', '1min', '5m', '5min', '15m', '15min', '30m', '30min', '1h', '60m', '60min'].includes(normInterval)) {
      func = 'TIME_SERIES_INTRADAY';
      const intMap: Record<string, string> = {
        '1m': '1min', '1min': '1min',
        '5m': '5min', '5min': '5min',
        '15m': '15min', '15min': '15min',
        '30m': '30min', '30min': '30min',
        '1h': '60min', '60m': '60min', '60min': '60min',
      };
      const mappedInt = intMap[normInterval] || '15min';
      avIntervalParam = `&interval=${mappedInt}`;
      timeSeriesKey = `Time Series (${mappedInt})`;
    }

    const outputSizeParam = range === '1D' || range === '5D' || range === '1M' ? '&outputsize=compact' : '&outputsize=full';
    const url = `${this.baseUrl}?function=${func}&symbol=${encodeURIComponent(sym)}${avIntervalParam}${outputSizeParam}&apikey=${apiKey}`;

    this.logger.debug(`Alpha Vantage request: ${func} for ${sym}`);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Alpha Vantage HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data['Error Message'] || data['Note'] || !data[timeSeriesKey]) {
      const errMsg = data['Error Message'] || (data['Note'] ? 'Rate limit exceeded (Note returned)' : `Missing key ${timeSeriesKey}`);
      throw new Error(`Alpha Vantage getCandles failed for ${sym}: ${errMsg}`);
    }

    const timeSeries = data[timeSeriesKey];
    const dates = Object.keys(timeSeries).sort(); // Sort chronological ascending

    const candles: CandleData[] = dates.map((dateStr) => {
      const v = timeSeries[dateStr];
      const dtObj = new Date(dateStr);
      return {
        date: dtObj.toISOString(),
        time: Math.floor(dtObj.getTime() / 1000),
        open: Number(parseFloat(v['1. open'] || 0).toFixed(2)),
        high: Number(parseFloat(v['2. high'] || 0).toFixed(2)),
        low: Number(parseFloat(v['3. low'] || 0).toFixed(2)),
        close: Number(parseFloat(v['4. close'] || 0).toFixed(2)),
        volume: Number(parseInt(v['5. volume'] || 0, 10)),
        timezone: data['Meta Data']?.['6. Time Zone'] || data['Meta Data']?.['5. Time Zone'] || 'UTC',
      };
    });

    if (candles.length === 0) {
      throw new Error(`No candles parsed from Alpha Vantage for ${sym}`);
    }

    return candles;
  }

  async getQuote(symbolInput: string): Promise<QuoteData> {
    const sym = this.formatSymbol(symbolInput);
    const apiKey = this.getApiKey();
    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Alpha Vantage quote HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const q = data['Global Quote'];
    if (!q || !q['05. price']) {
      throw new Error(`Alpha Vantage quote failed for ${sym}: No Global Quote data`);
    }

    const price = Number(parseFloat(q['05. price']).toFixed(2));
    const prevClose = Number(parseFloat(q['08. previous close'] || q['05. price']).toFixed(2));
    const change = Number(parseFloat(q['09. change'] || 0).toFixed(2));
    const changePercent = Number(parseFloat((q['10. change percent'] || '0').replace('%', '')).toFixed(2));

    return {
      symbol: symbolInput.toUpperCase(),
      company: sym,
      price,
      change,
      changePercent,
      previousClose: prevClose,
      high: Number(parseFloat(q['03. high'] || price).toFixed(2)),
      low: Number(parseFloat(q['04. low'] || price).toFixed(2)),
      volume: Number(parseInt(q['06. volume'] || 0, 10)),
      timestamp: new Date(),
    };
  }

  async getQuotes(symbols: string[]): Promise<QuoteData[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  }
}
