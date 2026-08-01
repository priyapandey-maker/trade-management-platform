import { Module, forwardRef } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { MarketModule } from '../market/market.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MarketModule,
    forwardRef(() => NotificationModule),
  ],
  providers: [PortfolioService],
  controllers: [PortfolioController],
  exports: [PortfolioService],
})
export class PortfolioModule {}
