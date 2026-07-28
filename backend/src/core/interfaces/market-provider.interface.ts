export interface TickData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

export interface QuoteData {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  high: number;
  low: number;
  volume: number;
  timestamp: Date | number | string;
}

export interface CandleData {
  date: string;       // ISO timestamp or YYYY-MM-DD
  time?: number;      // Unix timestamp in seconds or ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timezone?: string;  // e.g. "Asia/Kolkata" or "UTC"
}

export interface IMarketDataProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[], callback: (tick: TickData) => void): void;
  getQuote(symbol: string): Promise<QuoteData>;
  getQuotes(symbols: string[]): Promise<QuoteData[]>;
  getCandles(symbol: string, interval: string, range?: string): Promise<CandleData[]>;
}

// Backward compatibility & clean architecture aliases
export type IMarketProvider = IMarketDataProvider;
export type MarketDataProvider = IMarketDataProvider;
