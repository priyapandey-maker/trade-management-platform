export enum NotificationType {
  NEAR_BUY = 'NEAR_BUY',
  BUY_TRIGGER = 'BUY_TRIGGER',
  TARGET_HIT = 'TARGET_HIT',
  STOP_LOSS = 'STOP_LOSS',
  TRADE_CLOSED = 'TRADE_CLOSED',
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  PRICE_MOVEMENT = 'PRICE_MOVEMENT',
  TEST = 'TEST',
}

export enum ProviderType {
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DISABLED = 'DISABLED',
}

export interface NotificationPayload {
  type: NotificationType;
  symbol: string;
  company: string;
  message: string;
  triggerPrice?: number;
  triggerKey?: string;
  metadata?: any;
}
