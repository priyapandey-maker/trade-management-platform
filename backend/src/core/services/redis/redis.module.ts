import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
