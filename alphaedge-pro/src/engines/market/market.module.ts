import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { OrderBlockService } from './order-block.service';
import { MarketController } from './market.controller';
import { TwelveDataMarketProvider } from './providers/twelve-data-market.provider';
import { AlphaVantageMarketProvider } from './providers/alpha-vantage-market.provider';
import { YahooMarketProvider } from './providers/yahoo-market.provider';
import { MarketProviderFactory } from './providers/market-provider.factory';
import { RedisModule } from '../../core/services/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [
    TwelveDataMarketProvider,
    AlphaVantageMarketProvider,
    YahooMarketProvider,
    MarketProviderFactory,
    {
      provide: 'MARKET_DATA_PROVIDER',
      useExisting: MarketProviderFactory,
    },
    {
      provide: 'MARKET_PROVIDER',
      useExisting: MarketProviderFactory,
    },
    MarketService,
    OrderBlockService,
  ],
  controllers: [MarketController],
  exports: [MarketService, OrderBlockService, 'MARKET_DATA_PROVIDER', 'MARKET_PROVIDER'],
})
export class MarketModule {}
