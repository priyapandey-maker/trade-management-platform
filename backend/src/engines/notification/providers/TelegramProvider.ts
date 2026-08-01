import { Injectable, Logger } from '@nestjs/common';
import { User, Notification } from '@prisma/client';
import { NotificationProvider } from '../NotificationProvider';

@Injectable()
export class TelegramProvider implements NotificationProvider {
  private readonly logger = new Logger(TelegramProvider.name);

  async send(user: User, notification: Notification): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not set. Skipping Telegram notification.');
      return;
    }

    // Split comma-separated chat IDs from the user settings
    const chatIds = user.telegramChatIds
      ? user.telegramChatIds.split(',').map((id) => id.trim()).filter((id) => id.length > 0)
      : [];

    if (chatIds.length === 0) {
      this.logger.debug(`No Telegram chat IDs configured for user ${user.id}.`);
      return;
    }

    // Format rich Telegram message using standard emojis (Branded premium styling)
    const emojiHeader =
      notification.type === 'NEAR_BUY' ? '📍 NEAR BUY PRICE' :
      notification.type === 'BUY_TRIGGER' ? '🟢 BUY PRICE REACHED' :
      notification.type === 'TARGET_HIT' ? '🎯 TARGET PRICE HIT' :
      notification.type === 'STOP_LOSS' ? '🛑 STOP LOSS REACHED' :
      notification.type === 'TRADE_CLOSED' ? '💼 POSITION CLOSED' :
      notification.type === 'DAILY_SUMMARY' ? '📊 DAILY SUMMARY' : '🔔 ALERT';

    const text = `
*${emojiHeader}*

*Stock:* ${notification.symbol}
*Company:* ${notification.company}
${notification.triggerPrice ? `*Price:* ₹${notification.triggerPrice}\n` : ''}
${notification.message ? `*Detail:* ${notification.message}\n` : ''}
*Time:* ${notification.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}

Open SHREE ASSOCIATES → http://localhost:3000
    `.trim();

    let anyFailed = false;
    let errorMsgs: string[] = [];

    for (const chatId of chatIds) {
      try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
          }),
        });

        if (!res.ok) {
          const bodyText = await res.text();
          throw new Error(`Telegram API returned ${res.status}: ${bodyText}`);
        }
      } catch (err: any) {
        anyFailed = true;
        errorMsgs.push(`chatId ${chatId}: ${err.message}`);
        this.logger.error(`Failed to send Telegram message to chatId ${chatId}: ${err.message}`);
      }
    }

    if (anyFailed) {
      throw new Error(`Failed to send to some chat IDs: ${errorMsgs.join('; ')}`);
    }
  }
}
