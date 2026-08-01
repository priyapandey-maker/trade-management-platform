import { Module, forwardRef } from '@nestjs/common';
import { MarketModule } from '../market/market.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './NotificationService';
import { MarketPollingEngine } from './market-polling.engine';
import { MarketEvaluationEngine } from './market-evaluation.engine';
import { TradeEventEngine } from './trade-event.engine';
import { QueueWorker } from './queue.worker';
import { TelegramProvider } from './providers/TelegramProvider';
import { EmailProvider } from './providers/EmailProvider';
import { InAppProvider } from './providers/InAppProvider';
import { DailySummaryService } from './daily-summary.service';

@Module({
  imports: [forwardRef(() => MarketModule)],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    MarketPollingEngine,
    MarketEvaluationEngine,
    TradeEventEngine,
    QueueWorker,
    TelegramProvider,
    EmailProvider,
    InAppProvider,
    DailySummaryService,
  ],
  exports: [NotificationService, TradeEventEngine],
})
export class NotificationModule {}
