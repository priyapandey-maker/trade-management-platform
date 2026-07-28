import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient, PortfolioPosition } from '@prisma/client';
import { MarketService } from '../market/market.service';

const prisma = new PrismaClient();

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(private readonly marketService: MarketService) {}

  private findQuotePrice(symbol: string, map: Record<string, number>): number | undefined {
    const norm = symbol.trim().toUpperCase();
    const base = norm.split('.')[0];
    const withNs = norm.includes('.') ? norm : `${norm}.NS`;

    return map[norm] ?? map[base] ?? map[withNs];
  }

  async getPortfolio(): Promise<any> {
    const positions = await prisma.portfolioPosition.findMany({
      orderBy: { entryDate: 'desc' },
    });

    const openPositions = positions.filter((p) => p.status === 'OPEN');
    const closedPositions = positions.filter((p) => p.status === 'CLOSED');
    const archivedPositions = positions.filter((p) => p.status === 'ARCHIVED');

    // Refresh live quotes for open positions with robust symbol normalization
    const symbols = Array.from(new Set(openPositions.map((p) => p.symbol)));
    if (symbols.length > 0) {
      try {
        const quotes = await this.marketService.getQuotes(symbols);
        const quoteMap: Record<string, number> = {};

        for (const q of quotes) {
          if (q && q.price) {
            const sym = (q.symbol || '').toUpperCase();
            const base = sym.split('.')[0];
            quoteMap[sym] = q.price;
            quoteMap[base] = q.price;
            quoteMap[`${base}.NS`] = q.price;
          }
        }

        for (const pos of openPositions) {
          const livePrice = this.findQuotePrice(pos.symbol, quoteMap);
          if (livePrice !== undefined) {
            const currentPrice = livePrice;
            const currentValue = currentPrice * pos.quantity;
            let profitLoss = 0;
            if (pos.tradeType === 'SELL') {
              profitLoss = (pos.buyPrice - currentPrice) * pos.quantity - pos.brokerCharges;
            } else {
              profitLoss = (currentPrice - pos.buyPrice) * pos.quantity - pos.brokerCharges;
            }
            const profitLossPct = pos.investedAmount > 0 ? (profitLoss / pos.investedAmount) * 100 : 0;

            pos.currentPrice = currentPrice;
            pos.currentValue = currentValue;
            pos.profitLoss = profitLoss;
            pos.profitLossPct = profitLossPct;

            await prisma.portfolioPosition.update({
              where: { id: pos.id },
              data: {
                currentPrice,
                currentValue,
                profitLoss,
                profitLossPct,
              },
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        this.logger.debug(`Could not refresh live CMP for portfolio: ${err.message}`);
      }
    }

    // Calculations excluding ARCHIVED
    const totalInvestment = openPositions.reduce((sum, p) => sum + p.investedAmount, 0);
    const totalPortfolioValue = openPositions.reduce((sum, p) => sum + p.currentValue, 0);
    const currentPortfolioProfitLoss = openPositions.reduce((sum, p) => sum + p.profitLoss, 0);
    const unrealizedProfit = currentPortfolioProfitLoss;
    const realizedProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);

    const totalOpenPositions = openPositions.length;
    const totalClosedPositions = closedPositions.length;

    // Win Rate
    let winRate = 0;
    if (totalClosedPositions > 0) {
      const wins = closedPositions.filter((p) => p.profitLoss > 0).length;
      winRate = (wins / totalClosedPositions) * 100;
    }

    // Average Return %
    const allNonArchived = [...openPositions, ...closedPositions];
    const avgReturn = allNonArchived.length > 0
      ? allNonArchived.reduce((sum, p) => sum + p.profitLossPct, 0) / allNonArchived.length
      : 0;

    // Best & Worst Performing Trades
    let bestPerformingTrade: PortfolioPosition | null = null;
    let worstPerformingTrade: PortfolioPosition | null = null;
    if (allNonArchived.length > 0) {
      bestPerformingTrade = allNonArchived.reduce((best, p) => (p.profitLossPct > best.profitLossPct ? p : best), allNonArchived[0]);
      worstPerformingTrade = allNonArchived.reduce((worst, p) => (p.profitLossPct < worst.profitLossPct ? p : worst), allNonArchived[0]);
    }

    // Average Holding Period
    const closedWithPeriods = closedPositions.filter((p) => p.holdingPeriod !== null && p.holdingPeriod !== undefined);
    const avgHoldingPeriod = closedWithPeriods.length > 0
      ? closedWithPeriods.reduce((sum, p) => sum + (p.holdingPeriod || 0), 0) / closedWithPeriods.length
      : 0;

    const totalCapitalDeployed = totalInvestment + closedPositions.reduce((sum, p) => sum + p.investedAmount, 0);
    const availableCashBalance = Math.max(0, 1000000 - totalInvestment);

    return {
      positions: {
        open: openPositions,
        closed: closedPositions,
        archived: archivedPositions,
        all: positions,
      },
      summary: {
        totalPortfolioValue,
        totalInvestment,
        currentPortfolioProfitLoss,
        realizedProfit,
        unrealizedProfit,
        totalOpenPositions,
        totalClosedPositions,
        winRate,
        avgReturn,
        bestPerformingTrade,
        worstPerformingTrade,
        avgHoldingPeriod,
        totalCapitalDeployed,
        availableCashBalance,
      },
    };
  }

  async addPosition(data: any): Promise<PortfolioPosition> {
    const symbol = data.symbol.trim().toUpperCase();
    const quantity = parseFloat(data.quantity);
    const buyPrice = parseFloat(data.buyPrice);
    
    // Attempt live CMP fetch on position creation
    let currentPrice = data.currentPrice ? parseFloat(data.currentPrice) : buyPrice;
    try {
      const liveQuote = await this.marketService.getQuote(symbol);
      if (liveQuote && liveQuote.price) {
        currentPrice = liveQuote.price;
      }
    } catch (e) {}

    const investedAmount = buyPrice * quantity;
    const currentValue = currentPrice * quantity;
    const brokerCharges = data.brokerCharges ? parseFloat(data.brokerCharges) : 0;
    const tradeType = data.tradeType || 'BUY';

    let profitLoss = 0;
    if (tradeType === 'SELL') {
      profitLoss = (buyPrice - currentPrice) * quantity - brokerCharges;
    } else {
      profitLoss = (currentPrice - buyPrice) * quantity - brokerCharges;
    }
    const profitLossPct = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;

    const entryDate = data.entryDate ? new Date(data.entryDate) : new Date();

    const position = await prisma.portfolioPosition.create({
      data: {
        symbol,
        company: data.company || symbol,
        tradeType,
        buyPrice,
        currentPrice,
        quantity,
        investedAmount,
        currentValue,
        profitLoss,
        profitLossPct,
        targetPrice: data.targetPrice ? parseFloat(data.targetPrice) : null,
        stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : null,
        brokerCharges,
        notes: data.notes || null,
        assetType: data.assetType || 'STOCK',
        status: 'OPEN',
        entryDate,
      },
    });

    await this.marketService.subscribeSymbols([symbol]).catch(() => {});
    return position;
  }

  async editPosition(id: string, data: any): Promise<PortfolioPosition> {
    const pos = await prisma.portfolioPosition.findUnique({ where: { id } });
    if (!pos) throw new NotFoundException(`Position with ID "${id}" not found.`);

    const buyPrice = data.buyPrice !== undefined ? parseFloat(data.buyPrice) : pos.buyPrice;
    const quantity = data.quantity !== undefined ? parseFloat(data.quantity) : pos.quantity;
    const currentPrice = data.currentPrice !== undefined ? parseFloat(data.currentPrice) : pos.currentPrice;
    const brokerCharges = data.brokerCharges !== undefined ? parseFloat(data.brokerCharges) : pos.brokerCharges;
    const tradeType = data.tradeType !== undefined ? data.tradeType : pos.tradeType;

    const investedAmount = buyPrice * quantity;
    const currentValue = currentPrice * quantity;

    let profitLoss = 0;
    if (tradeType === 'SELL') {
      profitLoss = (buyPrice - currentPrice) * quantity - brokerCharges;
    } else {
      profitLoss = (currentPrice - buyPrice) * quantity - brokerCharges;
    }
    const profitLossPct = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;

    const updateData: any = {
      buyPrice,
      quantity,
      currentPrice,
      investedAmount,
      currentValue,
      profitLoss,
      profitLossPct,
      brokerCharges,
      tradeType,
      targetPrice: data.targetPrice !== undefined ? (data.targetPrice ? parseFloat(data.targetPrice) : null) : pos.targetPrice,
      stopLoss: data.stopLoss !== undefined ? (data.stopLoss ? parseFloat(data.stopLoss) : null) : pos.stopLoss,
      notes: data.notes !== undefined ? data.notes : pos.notes,
      assetType: data.assetType !== undefined ? data.assetType : pos.assetType,
      status: data.status !== undefined ? data.status : pos.status,
    };

    if (data.entryDate) {
      updateData.entryDate = new Date(data.entryDate);
    }

    if (data.status === 'CLOSED' || data.sellingPrice !== undefined) {
      updateData.status = 'CLOSED';
      updateData.sellingPrice = data.sellingPrice !== undefined ? parseFloat(data.sellingPrice) : pos.sellingPrice || currentPrice;
      updateData.closedAt = data.closedAt ? new Date(data.closedAt) : new Date();
      updateData.exitReason = data.exitReason || 'MANUAL_EXIT';

      const start = new Date(updateData.entryDate || pos.entryDate).getTime();
      const end = new Date(updateData.closedAt).getTime();
      const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      updateData.holdingPeriod = Math.max(0, diffDays);
    }

    return prisma.portfolioPosition.update({
      where: { id },
      data: updateData,
    });
  }

  async closePosition(
    id: string,
    sellingPriceInput?: number,
    brokerChargesInput?: number,
    sellingDateInput?: string,
    notesInput?: string,
    exitReasonInput?: string,
  ): Promise<PortfolioPosition> {
    const pos = await prisma.portfolioPosition.findUnique({ where: { id } });
    if (!pos) throw new NotFoundException(`Position with ID "${id}" not found.`);

    const sp = sellingPriceInput !== undefined && sellingPriceInput !== null ? sellingPriceInput : pos.currentPrice;
    const bc = brokerChargesInput !== undefined && brokerChargesInput !== null ? brokerChargesInput : pos.brokerCharges;
    const currentValue = sp * pos.quantity;

    let profitLoss = 0;
    if (pos.tradeType === 'SELL') {
      profitLoss = (pos.buyPrice - sp) * pos.quantity - bc;
    } else {
      profitLoss = (sp - pos.buyPrice) * pos.quantity - bc;
    }
    const profitLossPct = pos.investedAmount > 0 ? (profitLoss / pos.investedAmount) * 100 : 0;

    const closedAt = sellingDateInput ? new Date(sellingDateInput) : new Date();
    const start = new Date(pos.entryDate).getTime();
    const end = closedAt.getTime();
    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    const holdingPeriod = Math.max(0, diffDays);

    return prisma.portfolioPosition.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt,
        sellingPrice: sp,
        brokerCharges: bc,
        currentPrice: sp,
        currentValue,
        profitLoss,
        profitLossPct,
        holdingPeriod,
        exitReason: exitReasonInput || 'MANUAL_EXIT',
        notes: notesInput !== undefined ? notesInput : pos.notes,
      },
    });
  }

  async duplicatePosition(id: string): Promise<PortfolioPosition> {
    const pos = await prisma.portfolioPosition.findUnique({ where: { id } });
    if (!pos) throw new NotFoundException(`Position with ID "${id}" not found.`);

    return prisma.portfolioPosition.create({
      data: {
        symbol: `${pos.symbol}-COPY`,
        company: `${pos.company} (Copy)`,
        tradeType: pos.tradeType,
        buyPrice: pos.buyPrice,
        currentPrice: pos.currentPrice,
        quantity: pos.quantity,
        investedAmount: pos.investedAmount,
        currentValue: pos.currentValue,
        profitLoss: pos.profitLoss,
        profitLossPct: pos.profitLossPct,
        targetPrice: pos.targetPrice,
        stopLoss: pos.stopLoss,
        brokerCharges: pos.brokerCharges,
        notes: pos.notes,
        assetType: pos.assetType,
        status: 'OPEN',
        entryDate: new Date(),
      },
    });
  }

  async archivePosition(id: string, archive: boolean): Promise<PortfolioPosition> {
    const pos = await prisma.portfolioPosition.findUnique({ where: { id } });
    if (!pos) throw new NotFoundException(`Position with ID "${id}" not found.`);

    return prisma.portfolioPosition.update({
      where: { id },
      data: {
        status: archive ? 'ARCHIVED' : 'OPEN',
      },
    });
  }

  async bulkDelete(ids: string[]): Promise<any> {
    return prisma.portfolioPosition.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async bulkUpdate(positionsData: any[]): Promise<any[]> {
    const results = [];
    for (const data of positionsData) {
      if (data.id) {
        const res = await this.editPosition(data.id, data).catch((e) => {
          this.logger.error(`Failed to update position ${data.id}: ${e.message}`);
          return null;
        });
        if (res) results.push(res);
      }
    }
    return results;
  }

  async deletePosition(id: string): Promise<any> {
    return prisma.portfolioPosition.delete({ where: { id } });
  }
}
