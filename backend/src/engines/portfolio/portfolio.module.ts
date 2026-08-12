import { Module, forwardRef } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { TradeImportService } from './trade-import.service';
import { PortfolioController } from './portfolio.controller';
import { MarketModule } from '../market/market.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [MarketModule, forwardRef(() => NotificationModule)],
  providers: [PortfolioService, TradeImportService],
  controllers: [PortfolioController],
  exports: [PortfolioService, TradeImportService],
})
export class PortfolioModule {}
