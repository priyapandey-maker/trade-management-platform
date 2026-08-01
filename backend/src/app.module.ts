import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketModule } from './engines/market/market.module';
import { PortfolioModule } from './engines/portfolio/portfolio.module';
import { AuthModule } from './engines/auth/auth.module';
import { NotificationModule } from './engines/notification/notification.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AuthModule,
    MarketModule,
    PortfolioModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
