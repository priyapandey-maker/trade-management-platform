import { Injectable, Logger } from '@nestjs/common';
import { User, Notification } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationProvider } from '../NotificationProvider';

@Injectable()
export class EmailProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: nodemailer.Transporter | null = null;

  private initTransporter() {
    if (this.transporter) return;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP configuration is missing. Email notifications are inactive.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async send(user: User, notification: Notification): Promise<void> {
    this.initTransporter();

    if (!this.transporter) {
      this.logger.debug('No SMTP transporter initialized. Skipping email.');
      return;
    }

    if (!user.email) {
      this.logger.warn(`No email configured for user ${user.id}. Skipping email.`);
      return;
    }

    const from = process.env.EMAIL_FROM || '"SHREE ASSOCIATES" <alerts@shreeassociates.com>';
    const subject = `[SHREE ASSOCIATES] Alert: ${notification.type} - ${notification.symbol}`;

    let html = '';
    try {
      const templatesDir = path.join(process.cwd(), 'templates');
      const layoutPath = path.join(templatesDir, 'layout.html');
      let templateName = '';

      switch (notification.type) {
        case 'NEAR_BUY':
          templateName = 'near-buy.html';
          break;
        case 'BUY_TRIGGER':
          templateName = 'buy-trigger.html';
          break;
        case 'TARGET_HIT':
          templateName = 'target-hit.html';
          break;
        case 'STOP_LOSS':
          templateName = 'stop-loss.html';
          break;
        case 'TRADE_CLOSED':
          templateName = 'trade-closed.html';
          break;
        case 'DAILY_SUMMARY':
          templateName = 'daily-summary.html';
          break;
        default:
          templateName = 'test-alert.html';
          break;
      }

      const componentPath = path.join(templatesDir, templateName);
      let baseLayout = fs.existsSync(layoutPath) ? fs.readFileSync(layoutPath, 'utf8') : '{{CONTENT}}';
      let componentContent = fs.existsSync(componentPath) ? fs.readFileSync(componentPath, 'utf8') : '<p>{{message}}</p>';

      // Parse metadata if available on notification
      let meta: any = {};
      try {
        // If triggerKey holds extra metadata or we can fetch/calculate it
      } catch (e) {}

      // Replace metadata fields
      const replacements: Record<string, string> = {
        '{{symbol}}': notification.symbol || '',
        '{{company}}': notification.company || '',
        '{{message}}': notification.message || '',
        '{{currentPrice}}': notification.triggerPrice ? notification.triggerPrice.toString() : '0',
        '{{buyPrice}}': '0',
        '{{targetPrice}}': '0',
        '{{stopLoss}}': '0',
        '{{profitLoss}}': '0',
        '{{profitLossPct}}': '0',
        '{{totalOpen}}': '0',
        '{{totalInvested}}': '0',
        '{{currentValue}}': '0',
        '{{unrealizedPnL}}': '0',
        '{{unrealizedPnLPct}}': '0',
        '{{color}}': '#16A34A',
      };

      for (const [placeholder, val] of Object.entries(replacements)) {
        componentContent = componentContent.replace(new RegExp(placeholder, 'g'), val);
      }

      html = baseLayout.replace('{{CONTENT}}', componentContent);
    } catch (err: any) {
      this.logger.error(`Error rendering email template: ${err.message}`);
      html = `<p>${notification.message}</p>`;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: user.email,
        subject,
        html,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send email alert to ${user.email}: ${err.message}`);
      throw err;
    }
  }
}
