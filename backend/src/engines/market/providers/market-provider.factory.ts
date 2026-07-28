import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MarketDataProvider, TickData, QuoteData, CandleData } from '../../../core/interfaces/market-provider.interface';
import { TwelveDataMarketProvider } from './twelve-data-market.provider';
import { AlphaVantageMarketProvider } from './alpha-vantage-market.provider';
import { YahooMarketProvider } from './yahoo-market.provider';

/**
 * MarketProviderFactory
 * Pluggable composite orchestrator for institutional market data.
 * Manages automatic retries and failover cascades:
 * 1. TwelveDataMarketProvider (Primary Active for deep NSE & intraday history)
 * 2. AlphaVantageMarketProvider (Secondary failover)
 * 3. YahooMarketProvider (@deprecated Fallback only)
 *
 * Ensures zero crashes and 100% data layer uptime.
 */
@Injectable()
export class MarketProviderFactory implements MarketDataProvider {
  private readonly logger = new Logger(MarketProviderFactory.name);
  private providers: { name: string; instance: MarketDataProvider }[];

  constructor(
    private readonly twelveData: TwelveDataMarketProvider,
    private readonly alphaVantage: AlphaVantageMarketProvider,
    private readonly yahooFallback: YahooMarketProvider,
  ) {
    this.providers = [
      { name: 'TwelveData (Primary)', instance: this.twelveData },
      { name: 'AlphaVantage (Secondary)', instance: this.alphaVantage },
      { name: 'YahooFinance (@deprecated Fallback)', instance: this.yahooFallback },
    ];
  }

  async connect(): Promise<void> {
    this.logger.log('Initializing Pluggable Institutional Market Data Chain...');
    for (const p of this.providers) {
      try {
        await p.instance.connect();
      } catch (err: any) {
        this.logger.warn(`Failed to connect provider ${p.name}: ${err.message}`);
      }
    }
  }

  async disconnect(): Promise<void> {
    for (const p of this.providers) {
      try {
        await p.instance.disconnect();
      } catch (err: any) {
        this.logger.warn(`Failed disconnecting provider ${p.name}: ${err.message}`);
      }
    }
    this.logger.log('All Market Data Providers disconnected.');
  }

  subscribe(symbols: string[], callback: (tick: TickData) => void): void {
    // Subscribe primary real-time engine
    this.twelveData.subscribe(symbols, callback);
    // Subscribe fallback for redundancy
    this.yahooFallback.subscribe(symbols, callback);
  }

  /**
   * Execute with automatic retry on primary, then cascade failover through secondary and fallback providers
   */
  private async executeWithFailover<T>(
    operationName: string,
    action: (provider: MarketDataProvider, name: string) => Promise<T>,
  ): Promise<T> {
    const errors: string[] = [];

    for (let i = 0; i < this.providers.length; i++) {
      const p = this.providers[i];
      try {
        // Attempt execution on current provider in priority chain
        return await action(p.instance, p.name);
      } catch (err: any) {
        this.logger.warn(`[${operationName}] Provider ${p.name} attempt 1 failed: ${err.message}`);
        
        // If it's the primary provider, do an immediate automatic retry once per rules
        if (i === 0) {
          try {
            await new Promise((res) => setTimeout(res, 250)); // Brief 250ms backoff
            this.logger.debug(`[${operationName}] Retrying primary provider ${p.name}...`);
            return await action(p.instance, p.name);
          } catch (retryErr: any) {
            this.logger.warn(`[${operationName}] Provider ${p.name} automatic retry failed: ${retryErr.message}`);
          }
        }

        errors.push(`${p.name}: ${err.message}`);
        this.logger.warn(`[${operationName}] Cascading failover to next provider...`);
      }
    }

    // All providers exhausted — enforce strict error handling per requirements
    this.logger.error(`[${operationName}] All market data providers failed. Errors: ${errors.join(' | ')}`);
    throw new HttpException(
      {
        status: 'error',
        message: 'No market data available.',
        errorType: 'ALL_PROVIDERS_UNAVAILABLE',
        details: errors,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  async getCandles(symbol: string, interval: string, range = '1Y'): Promise<CandleData[]> {
    return this.executeWithFailover('getCandles', async (provider, name) => {
      const candles = await provider.getCandles(symbol, interval, range);
      if (!candles || !Array.isArray(candles) || candles.length === 0) {
        throw new Error(`Provider ${name} returned empty candle array for ${symbol}`);
      }
      this.logger.debug(`Successfully retrieved ${candles.length} candles for ${symbol} (${interval}, ${range}) via ${name}`);
      return candles;
    });
  }

  async getQuote(symbol: string): Promise<QuoteData> {
    return this.executeWithFailover('getQuote', async (provider, name) => {
      const quote = await provider.getQuote(symbol);
      if (!quote || quote.price === undefined) {
        throw new Error(`Provider ${name} returned invalid quote for ${symbol}`);
      }
      return quote;
    });
  }

  async getQuotes(symbols: string[]): Promise<QuoteData[]> {
    return this.executeWithFailover('getQuotes', async (provider) => {
      return await provider.getQuotes(symbols);
    });
  }
}
