import { User, Notification } from '@prisma/client';

export interface NotificationProvider {
  send(user: User, notification: Notification): Promise<void>;
}
