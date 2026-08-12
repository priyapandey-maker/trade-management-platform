import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private cache = new Map<string, string>();

  constructor(private eventEmitter: EventEmitter2) {}

  async hset(key: string, field: string, value: string): Promise<void> {
    this.cache.set(`${key}:${field}`, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.cache.get(`${key}:${field}`) || null;
  }

  async publish(channel: string, message: string): Promise<void> {
    this.eventEmitter.emit(channel, message);
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    this.eventEmitter.on(channel, (payload) => callback(payload as string));
  }
}
