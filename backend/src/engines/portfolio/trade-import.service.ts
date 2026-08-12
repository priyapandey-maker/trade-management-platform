import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient, PortfolioPosition } from '@prisma/client';
import Decimal from 'decimal.js';
import {
  calculateInvestment,
  calculateCurrentValue,
  calculateLivePnL,
  calculateReturnPct,
} from '../../shared/financial-calculations';

const prisma = new PrismaClient();

@Injectable()
export class TradeImportService {
  private readonly logger = new Logger(TradeImportService.name);

  /**
   * Helper to parse CSV string into an array of raw objects
   */
  parseCsv(fileContent: string): any[] {
    if (!fileContent || fileContent.trim() === '') {
      throw new BadRequestException('CSV content is empty.');
    }

    const lines = fileContent.split(/\r?\n/);
    if (lines.length === 0 || !lines[0]) {
      throw new BadRequestException('CSV header is missing.');
    }
    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/^["']|["']$/g, ''));

    // Validate headers
    const required = [
      'Investor',
      'Symbol',
      'Buy Price',
      'Quantity',
      'Target',
      'Stop Loss',
      'Buy Date',
      'Trade Type',
      'Notes',
    ];
    const missing = required.filter(
      (r) => !headers.some((h) => h.toLowerCase() === r.toLowerCase()),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Invalid CSV template. Missing headers: ${missing.join(', ')}`,
      );
    }

    const result: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;

      // Handle quotes in CSV values (simple parser)
      const values: string[] = [];
      let currentVal = '';
      let insideQuote = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

      const rowObj: any = {};
      headers.forEach((header, idx) => {
        rowObj[header] = values[idx] || '';
      });

      result.push(rowObj);
    }

    return result;
  }

  /**
   * Validate rows against trade models
   */
  validateRows(rows: any[]): { valid: any[]; invalid: any[] } {
    const valid: any[] = [];
    const invalid: any[] = [];

    rows.forEach((row, idx) => {
      const errors: string[] = [];

      // Map keys case-insensitively
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          const match = Object.keys(row).find(
            (rk) => rk.toLowerCase() === k.toLowerCase(),
          );
          if (match) return row[match];
        }
        return '';
      };

      const investorName = (getVal(['Investor']) || 'Shree').trim();
      const symbol = (getVal(['Symbol']) || '').trim().toUpperCase();
      const notes = (getVal(['Notes']) || '').trim();
      const tradeType = (getVal(['Trade Type', 'TradeType']) || 'BUY')
        .trim()
        .toUpperCase();
      const rawBuyPrice = getVal(['Buy Price', 'BuyPrice']);
      const rawQty = getVal(['Quantity', 'Qty']);
      const rawTarget = getVal(['Target', 'TargetPrice']);
      const rawStop = getVal(['Stop Loss', 'StopLoss', 'Stop']);
      const rawDate = getVal(['Buy Date', 'BuyDate', 'Date']);

      if (!symbol) {
        errors.push('Symbol is required.');
      } else if (!/^[A-Z0-9.\-]+$/.test(symbol)) {
        errors.push('Symbol contains invalid characters.');
      }

      const buyPriceNum = parseFloat(rawBuyPrice);
      if (isNaN(buyPriceNum) || buyPriceNum <= 0) {
        errors.push('Buy Price must be a number greater than 0.');
      }

      const qtyNum = parseFloat(rawQty);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        errors.push('Quantity must be a number greater than 0.');
      }

      let targetPriceNum: number | null = null;
      if (rawTarget) {
        const parsed = parseFloat(rawTarget);
        if (isNaN(parsed) || parsed <= 0) {
          errors.push('Target Price must be a number greater than 0.');
        } else {
          targetPriceNum = parsed;
        }
      }

      let stopLossNum: number | null = null;
      if (rawStop) {
        const parsed = parseFloat(rawStop);
        if (isNaN(parsed) || parsed <= 0) {
          errors.push('Stop Loss must be a number greater than 0.');
        } else {
          stopLossNum = parsed;
        }
      }

      if (tradeType !== 'BUY' && tradeType !== 'SELL') {
        errors.push('Trade Type must be BUY or SELL.');
      }

      // Check SL/TP logic
      if (tradeType === 'BUY') {
        if (targetPriceNum && targetPriceNum <= buyPriceNum) {
          errors.push(
            'Target Price must be greater than Buy Price for BUY trades.',
          );
        }
        if (stopLossNum && stopLossNum >= buyPriceNum) {
          errors.push('Stop Loss must be less than Buy Price for BUY trades.');
        }
      } else if (tradeType === 'SELL') {
        if (targetPriceNum && targetPriceNum >= buyPriceNum) {
          errors.push(
            'Target Price must be less than Buy Price for SELL trades.',
          );
        }
        if (stopLossNum && stopLossNum <= buyPriceNum) {
          errors.push(
            'Stop Loss must be greater than Buy Price for SELL trades.',
          );
        }
      }

      let entryDate = new Date();
      if (rawDate) {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) {
          errors.push('Buy Date is invalid.');
        } else {
          entryDate = d;
        }
      }

      if (errors.length > 0) {
        invalid.push({
          row: idx + 2, // 1-indexed Excel row offset (header is row 1)
          symbol: symbol || 'UNKNOWN',
          errors,
        });
      } else {
        valid.push({
          row: idx + 2,
          data: {
            symbol,
            company: symbol, // Fallback to symbol as company name
            investorName,
            buyPrice: buyPriceNum,
            quantity: qtyNum,
            targetPrice: targetPriceNum,
            stopLoss: stopLossNum,
            tradeType,
            entryDate,
            notes,
          },
        });
      }
    });

    return { valid, invalid };
  }

  /**
   * Check for duplicate records already in the database
   */
  async detectDuplicates(
    validRows: any[],
  ): Promise<{ ready: any[]; duplicates: any[] }> {
    const ready: any[] = [];
    const duplicates: any[] = [];

    for (const item of validRows) {
      const d = item.data;
      const startOfDay = new Date(d.entryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d.entryDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if duplicate position already exists (exact match on key fields)
      const existing = await prisma.portfolioPosition.findFirst({
        where: {
          symbol: d.symbol,
          buyPrice: d.buyPrice,
          quantity: d.quantity,
          investorName: d.investorName,
          status: 'OPEN',
          entryDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (existing) {
        duplicates.push({
          row: item.row,
          symbol: d.symbol,
          reason: `Duplicate of existing position (ID: ${existing.id}) in database.`,
        });
      } else {
        ready.push(item);
      }
    }

    return { ready, duplicates };
  }

  /**
   * Bulk insert records
   */
  async importTrades(readyRows: any[]): Promise<any[]> {
    const results: PortfolioPosition[] = [];

    for (const item of readyRows) {
      const d = item.data;

      const investedAmount = calculateInvestment(d.buyPrice, d.quantity);
      const currentValue = calculateCurrentValue(
        d.buyPrice,
        d.quantity,
        d.tradeType,
        d.buyPrice,
      );
      const profitLoss = calculateLivePnL(
        d.buyPrice,
        d.buyPrice,
        d.quantity,
        d.tradeType,
      );
      const profitLossPct = calculateReturnPct(
        d.buyPrice,
        d.buyPrice,
        d.tradeType,
      );

      const created = await prisma.portfolioPosition.create({
        data: {
          symbol: d.symbol,
          company: d.company,
          tradeType: d.tradeType,
          buyPrice: d.buyPrice,
          currentPrice: d.buyPrice,
          targetPrice: d.targetPrice,
          stopLoss: d.stopLoss,
          quantity: d.quantity,
          investedAmount,
          currentValue,
          profitLoss,
          profitLossPct,
          entryDate: d.entryDate,
          notes: d.notes,
          investorName: d.investorName,
          status: 'OPEN',
        },
      });

      results.push(created);
    }

    return results;
  }

  /**
   * Compile import details into a report
   */
  generateReport(imported: any[], duplicates: any[], invalid: any[]): any {
    return {
      summary: {
        totalProcessed: imported.length + duplicates.length + invalid.length,
        importedCount: imported.length,
        duplicateCount: duplicates.length,
        invalidCount: invalid.length,
        success: invalid.length === 0 && duplicates.length === 0,
      },
      imported: imported.map((item) => ({
        row: item.row,
        symbol: item.symbol || item.data?.symbol,
      })),
      duplicates: duplicates.map((item) => ({
        row: item.row,
        symbol: item.symbol,
        reason: item.reason,
      })),
      invalid: invalid.map((item) => ({
        row: item.row,
        symbol: item.symbol,
        errors: item.errors,
      })),
    };
  }
}
