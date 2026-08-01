import { Injectable, Logger } from '@nestjs/common';
import { User, Notification } from '@prisma/client';
import { NotificationProvider } from '../NotificationProvider';

@Injectable()
export class InAppProvider implements NotificationProvider {
  private readonly logger = new Logger(InAppProvider.name);

  async send(user: User, notification: Notification): Promise<void> {
    // In-app notifications are stored directly in the database.
    // The central Notification record is already persisted, so we log delivery here.
    this.logger.debug(`In-App notification recorded for user ${user.id}: ${notification.message}`);
  }
}
