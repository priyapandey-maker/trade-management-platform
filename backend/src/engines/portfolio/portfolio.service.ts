import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, PortfolioPosition } from '@prisma/client';
import { MarketService } from '../market/market.service';
import { NotificationService } from '../notification/NotificationService';
import { TradeEventEngine } from '../notification/trade-event.engine';
import Decimal from 'decimal.js';
import {
  calculateInvestment,
  calculateCurrentValue,
  calculateLivePnL,
  calculateReturnPct,
  calculateRealizedPnL,
  calculateRealizedReturnPct,
  calculatePotentialProfit,
  calculateMissedProfit,
} from '../../shared/financial-calculations';

const prisma = new PrismaClient();

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);
  private portfolioCache: { data: any; timestamp: number } | null = null;
  private dashboardCache: { data: any; timestamp: number } | null = null;

  private clearCache() {
    this.portfolioCache = null;
    this.dashboardCache = null;
  }

  constructor(
    private readonly marketService: MarketService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => TradeEventEngine))
    private readonly tradeEventEngine: TradeEventEngine,
  ) {}

  private findQuotePrice(
    symbol: string,
    map: Record<string, number>,
  ): number | undefined {
    const norm = symbol.trim().toUpperCase();
    const base = norm.split('.')[0];
    const withNs = norm.includes('.') ? norm : `${norm}.NS`;

    return map[norm] ?? map[base] ?? map[withNs];
  }

  async getPortfolio(): Promise<any> {
    const nowTime = Date.now();
    if (
      this.portfolioCache &&
      nowTime - this.portfolioCache.timestamp < 10000
    ) {
      this.logger.debug('Returning cached portfolio data');
      return this.portfolioCache.data;
    }

    const positions: PortfolioPosition[] =
      await prisma.portfolioPosition.findMany({
        orderBy: { entryDate: 'desc' },
      });

    const now = new Date();
    const openPositions: any[] = [];
    const closedPositions: any[] = [];
    const archivedPositions: any[] = [];

    for (const p of positions) {
      if (p.status === 'OPEN') {
        openPositions.push(p);
      } else if (p.status === 'CLOSED') {
        closedPositions.push(p);
      } else {
        archivedPositions.push(p);
      }
    }

    // Refresh live quotes & evaluate Automatic Trade Closing + Row Alerts
    const symbols: string[] = Array.from(
      new Set(openPositions.map((p: PortfolioPosition) => p.symbol)),
    );
    if (symbols.length > 0) {
      try {
        const quotes = await this.marketService.getQuotes(symbols);
        const quoteMap: Record<string, number> = {};
        const changePercentMap: Record<string, number> = {};

        for (const q of quotes) {
          if (q && q.price) {
            const sym = (q.symbol || '').toUpperCase();
            const base = sym.split('.')[0];
            quoteMap[sym] = q.price;
            quoteMap[base] = q.price;
            quoteMap[`${base}.NS`] = q.price;

            const cp = q.changePercent !== undefined ? q.changePercent : 0;
            changePercentMap[sym] = cp;
            changePercentMap[base] = cp;
            changePercentMap[`${base}.NS`] = cp;
          }
        }

        for (const pos of openPositions) {
          const livePrice = this.findQuotePrice(pos.symbol, quoteMap);
          if (livePrice !== undefined) {
            const currentPrice = livePrice;
            const currentValue = calculateCurrentValue(
              currentPrice,
              pos.quantity,
              pos.tradeType,
              pos.buyPrice,
            );
            const profitLoss = calculateLivePnL(
              pos.buyPrice,
              currentPrice,
              pos.quantity,
              pos.tradeType,
            );
            const profitLossPct = calculateReturnPct(
              pos.buyPrice,
              currentPrice,
              pos.tradeType,
            );

            pos.currentPrice = currentPrice;
            pos.currentValue = currentValue;
            pos.profitLoss = profitLoss;
            pos.profitLossPct = profitLossPct;
            pos.changePercent =
              changePercentMap[pos.symbol] ||
              changePercentMap[pos.symbol.split('.')[0]] ||
              0;

            await prisma.portfolioPosition
              .update({
                where: { id: pos.id },
                data: {
                  currentPrice,
                  currentValue,
                  profitLoss,
                  profitLossPct,
                },
              })
              .catch(() => {});
          }
        }
      } catch (err: any) {
        this.logger.debug(
          `Could not refresh live CMP for portfolio: ${err.message}`,
        );
      }
    }

    const openList: any[] = [];
    const closedList: any[] = [];
    const archivedList: any[] = [];

    for (const p of positions) {
      const entryTime = new Date(p.entryDate).getTime();
      const bp = p.buyPrice;
      const qty = p.quantity;
      const tradeType = p.tradeType;

      const investedAmount = calculateInvestment(bp, qty);
      let currentValue = p.currentValue;
      let profitLoss = p.profitLoss;
      let profitLossPct = p.profitLossPct;
      let holdingPeriod = p.holdingPeriod;

      if (p.status === 'OPEN') {
        const currentPrice = p.currentPrice;
        currentValue = calculateCurrentValue(currentPrice, qty, tradeType, bp);
        profitLoss = calculateLivePnL(bp, currentPrice, qty, tradeType);
        profitLossPct = calculateReturnPct(bp, currentPrice, tradeType);
        holdingPeriod = Math.max(
          0,
          Math.floor((now.getTime() - entryTime) / (1000 * 60 * 60 * 24)),
        );

        const proximityThreshold = (p.nearBuyProximityPct || 1.0) / 100;
        const diffFromBuy = Math.abs(currentPrice - bp) / bp;
        const atBuyPrice = Math.abs(currentPrice - bp) < 0.01;
        const nearBuyPrice = diffFromBuy <= proximityThreshold;

        const pCopy = {
          ...p,
          investedAmount,
          currentValue,
          profitLoss,
          profitLossPct,
          holdingPeriod,
          atBuyPrice,
          nearBuyPrice,
          changePercent: (p as any).changePercent || 0,
        };

        // Self-heal DB if values differ
        const needsUpdate =
          Math.abs(p.investedAmount - investedAmount) > 0.001 ||
          Math.abs(p.currentValue - currentValue) > 0.001 ||
          Math.abs(p.profitLoss - profitLoss) > 0.001 ||
          Math.abs(p.profitLossPct - profitLossPct) > 0.001 ||
          p.holdingPeriod !== holdingPeriod;

        if (needsUpdate) {
          await prisma.portfolioPosition
            .update({
              where: { id: p.id },
              data: {
                investedAmount,
                currentValue,
                profitLoss,
                profitLossPct,
                holdingPeriod,
              },
            })
            .catch((err) =>
              this.logger.error(
                `Failed to self-heal position ${p.id}: ${err.message}`,
              ),
            );
        }

        openList.push(pCopy);
      } else if (p.status === 'CLOSED') {
        const exitPrice = p.sellingPrice ?? p.currentPrice ?? bp;
        currentValue = calculateCurrentValue(exitPrice, qty, tradeType, bp);
        profitLoss = calculateRealizedPnL(bp, exitPrice, qty, tradeType);
        profitLossPct = calculateRealizedReturnPct(bp, exitPrice, tradeType);

        if (holdingPeriod === null || holdingPeriod === undefined) {
          const exitTime = p.closedAt
            ? new Date(p.closedAt).getTime()
            : now.getTime();
          holdingPeriod = Math.max(
            0,
            Math.floor((exitTime - entryTime) / (1000 * 60 * 60 * 24)),
          );
        }

        const potentialProfit = calculatePotentialProfit(
          bp,
          p.targetPrice,
          qty,
          tradeType,
        );
        const { missedProfit, extraProfit } = calculateMissedProfit(
          bp,
          p.targetPrice,
          exitPrice,
          qty,
          tradeType,
        );

        const pCopy = {
          ...p,
          investedAmount,
          currentValue,
          profitLoss,
          profitLossPct,
          holdingPeriod,
          potentialProfit,
          missedProfit,
          extraProfit,
        };

        // Self-heal DB if values differ
        const needsUpdate =
          Math.abs(p.investedAmount - investedAmount) > 0.001 ||
          Math.abs(p.currentValue - currentValue) > 0.001 ||
          Math.abs(p.profitLoss - profitLoss) > 0.001 ||
          Math.abs(p.profitLossPct - profitLossPct) > 0.001 ||
          p.holdingPeriod !== holdingPeriod;

        if (needsUpdate) {
          await prisma.portfolioPosition
            .update({
              where: { id: p.id },
              data: {
                investedAmount,
                currentValue,
                profitLoss,
                profitLossPct,
                holdingPeriod,
              },
            })
            .catch((err) =>
              this.logger.error(
                `Failed to self-heal position ${p.id}: ${err.message}`,
              ),
            );
        }

        closedList.push(pCopy);
      } else {
        const pCopy = {
          ...p,
          investedAmount,
        };
        archivedList.push(pCopy);
      }
    }

    // Portfolio Calculations
    const totalInvestment = openList.reduce(
      (sum: number, p: any) => sum + p.investedAmount,
      0,
    );
    const totalPortfolioValue = openList.reduce(
      (sum: number, p: any) => sum + p.currentValue,
      0,
    );
    const currentPortfolioProfitLoss = openList.reduce(
      (sum: number, p: any) => sum + p.profitLoss,
      0,
    );
    const unrealizedProfit = currentPortfolioProfitLoss;
    const realizedProfit = closedList.reduce(
      (sum: number, p: any) => sum + p.profitLoss,
      0,
    );
    const totalPnL = realizedProfit + unrealizedProfit;

    const totalOpenPositions = openList.length;
    const totalClosedPositions = closedList.length;

    // Win Rate
    let winRate = 0;
    if (totalClosedPositions > 0) {
      const wins = closedList.filter((p: any) => p.profitLoss > 0).length;
      winRate = (wins / totalClosedPositions) * 100;
    }

    // Average Return %
    const allNonArchived = [...openList, ...closedList];
    const avgReturn =
      allNonArchived.length > 0
        ? allNonArchived.reduce(
            (sum: number, p: any) => sum + p.profitLossPct,
            0,
          ) / allNonArchived.length
        : 0;

    // Top Performers for Open Positions
    const sortedOpenByPerf = [...openList].sort(
      (a, b) => b.profitLossPct - a.profitLossPct,
    );
    const highestPerformingOpen =
      sortedOpenByPerf.length > 0 ? sortedOpenByPerf[0] : null;
    const secondHighestPerformingOpen =
      sortedOpenByPerf.length > 1 ? sortedOpenByPerf[1] : null;

    // Best & Worst Performing Trades Overall
    let bestPerformingTrade: any = null;
    let worstPerformingTrade: any = null;
    if (allNonArchived.length > 0) {
      bestPerformingTrade = allNonArchived.reduce(
        (best: any, p: any) =>
          p.profitLossPct > best.profitLossPct ? p : best,
        allNonArchived[0],
      );
      worstPerformingTrade = allNonArchived.reduce(
        (worst: any, p: any) =>
          p.profitLossPct < worst.profitLossPct ? p : worst,
        allNonArchived[0],
      );
    }

    const closedWithPeriods = closedList.filter(
      (p: any) => p.holdingPeriod !== null && p.holdingPeriod !== undefined,
    );
    const avgHoldingPeriod =
      closedWithPeriods.length > 0
        ? closedWithPeriods.reduce(
            (sum: number, p: any) => sum + (p.holdingPeriod || 0),
            0,
          ) / closedWithPeriods.length
        : 0;

    const totalCapitalDeployed =
      totalInvestment +
      closedList.reduce((sum: number, p: any) => sum + p.investedAmount, 0);
    const availableCashBalance = Math.max(0, 1000000 - totalInvestment);

    // Investor Management Calculations (derived from recalculated openList and closedList)
    const investorsMap: Record<string, any> = {};
    for (const p of openList) {
      const inv = p.investorName || '';
      if (!investorsMap[inv]) {
        investorsMap[inv] = {
          name: inv,
          totalInvestment: 0,
          currentValue: 0,
          realizedProfit: 0,
          unrealizedProfit: 0,
          totalTrades: 0,
          openTrades: 0,
          closedTrades: 0,
          wins: 0,
        };
      }
      const data = investorsMap[inv];
      data.totalTrades += 1;
      data.openTrades += 1;
      data.totalInvestment += p.investedAmount;
      data.currentValue += p.currentValue;
      data.unrealizedProfit += p.profitLoss;
    }
    for (const p of closedList) {
      const inv = p.investorName || '';
      if (!investorsMap[inv]) {
        investorsMap[inv] = {
          name: inv,
          totalInvestment: 0,
          currentValue: 0,
          realizedProfit: 0,
          unrealizedProfit: 0,
          totalTrades: 0,
          openTrades: 0,
          closedTrades: 0,
          wins: 0,
        };
      }
      const data = investorsMap[inv];
      data.totalTrades += 1;
      data.closedTrades += 1;
      data.totalInvestment += p.investedAmount;
      data.realizedProfit += p.profitLoss;
      if (p.profitLoss > 0) {
        data.wins += 1;
      }
    }

    const investorsList = Object.values(investorsMap).map((inv: any) => {
      const netProfit = inv.realizedProfit + inv.unrealizedProfit;
      const roi =
        inv.totalInvestment > 0 ? (netProfit / inv.totalInvestment) * 100 : 0;
      const winRate =
        inv.closedTrades > 0 ? (inv.wins / inv.closedTrades) * 100 : 0;
      return {
        ...inv,
        netProfit,
        roi,
        winRate,
      };
    });

    const result = {
      positions: {
        open: openList,
        closed: closedList,
        archived: archivedList,
        all: positions,
      },
      investors: investorsList,
      summary: {
        totalPortfolioValue,
        totalInvestment,
        currentPortfolioProfitLoss,
        realizedProfit,
        unrealizedProfit,
        totalPnL,
        totalOpenPositions,
        totalClosedPositions,
        winRate,
        avgReturn,
        highestPerformingOpen,
        secondHighestPerformingOpen,
        bestPerformingTrade,
        worstPerformingTrade,
        avgHoldingPeriod,
        totalCapitalDeployed,
        availableCashBalance,
      },
    };
    this.portfolioCache = { data: result, timestamp: Date.now() };
    return result;
  }

  async addPosition(data: any): Promise<PortfolioPosition> {
    this.clearCache();
    const symbol = data.symbol.trim().toUpperCase();
    const quantity = parseFloat(data.quantity);
    const buyPrice = parseFloat(data.buyPrice);
    const tradeType = data.tradeType || 'BUY';
    const brokerCharges = data.brokerCharges
      ? parseFloat(data.brokerCharges)
      : 0;
    const entryDate = data.entryDate ? new Date(data.entryDate) : new Date();

    if (tradeType === 'SELL') {
      // Historical Closed Trade Workflow
      const sellingPrice =
        data.sellingPrice !== undefined
          ? parseFloat(data.sellingPrice)
          : parseFloat(data.sellPrice);
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        throw new BadRequestException(
          'Sell Price is required and must be greater than 0 for historical trades.',
        );
      }

      const sellDate = data.sellDate
        ? new Date(data.sellDate)
        : data.closedAt
          ? new Date(data.closedAt)
          : new Date();
      const investedAmount = calculateInvestment(buyPrice, quantity);
      const currentValue = calculateCurrentValue(
        sellingPrice,
        quantity,
        tradeType,
        buyPrice,
      );
      const profitLoss = calculateRealizedPnL(
        buyPrice,
        sellingPrice,
        quantity,
        tradeType,
      );
      const profitLossPct = calculateRealizedReturnPct(
        buyPrice,
        sellingPrice,
        tradeType,
      );
      const holdingPeriod = Math.max(
        0,
        Math.floor(
          (sellDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      const position = await prisma.portfolioPosition.create({
        data: {
          symbol,
          company: data.company || symbol,
          tradeType,
          buyPrice,
          currentPrice: sellingPrice,
          sellingPrice,
          quantity,
          investedAmount,
          currentValue,
          profitLoss,
          profitLossPct,
          targetPrice: data.targetPrice ? parseFloat(data.targetPrice) : null,
          stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : null,
          nearBuyProximityPct: data.nearBuyProximityPct
            ? parseFloat(data.nearBuyProximityPct)
            : 1.0,
          buyPriceAlertActive: false,
          nearBuyAlertActive: false,
          brokerCharges,
          notes: data.notes || null,
          assetType: data.assetType || 'STOCK',
          investorName: data.investorName || '',
          status: 'CLOSED',
          entryDate,
          closedAt: sellDate,
          holdingPeriod,
          exitReason: data.exitReason || 'MANUAL_EXIT',
        },
      });

      return position;
    } else {
      // Live Open Position Workflow (BUY)
      let currentPrice = data.currentPrice
        ? parseFloat(data.currentPrice)
        : buyPrice;
      try {
        const liveQuote = await this.marketService.getQuote(symbol);
        if (liveQuote && liveQuote.price) {
          currentPrice = liveQuote.price;
        }
      } catch (e) {}

      const investedAmount = calculateInvestment(buyPrice, quantity);
      const currentValue = calculateCurrentValue(
        currentPrice,
        quantity,
        tradeType,
        buyPrice,
      );
      const profitLoss = calculateLivePnL(
        buyPrice,
        currentPrice,
        quantity,
        tradeType,
      );
      const profitLossPct = calculateReturnPct(
        buyPrice,
        currentPrice,
        tradeType,
      );

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
          nearBuyProximityPct: data.nearBuyProximityPct
            ? parseFloat(data.nearBuyProximityPct)
            : 1.0,
          buyPriceAlertActive: true,
          nearBuyAlertActive: true,
          brokerCharges,
          notes: data.notes || null,
          assetType: data.assetType || 'STOCK',
          investorName: data.investorName || '',
          status: 'OPEN',
          entryDate,
        },
      });

      await this.marketService.subscribeSymbols([symbol]).catch(() => {});
      return position;
    }
  }

  async editPosition(id: string, data: any): Promise<PortfolioPosition> {
    this.clearCache();
    const pos = await prisma.portfolioPosition.findUnique({ where: { id } });
    if (!pos)
      throw new NotFoundException(`Position with ID "${id}" not found.`);

    const buyPrice =
      data.buyPrice !== undefined ? parseFloat(data.buyPrice) : pos.buyPrice;
    const quantity =
      data.quantity !== undefined ? parseFloat(data.quantity) : pos.quantity;
    const brokerCharges =
      data.brokerCharges !== undefined
        ? parseFloat(data.brokerCharges)
        : pos.brokerCharges;
    const tradeType =
      data.tradeType !== undefined ? data.tradeType : pos.tradeType;
    const status = data.status !== undefined ? data.status : pos.status;

    let sellingPrice = pos.sellingPrice;
    if (data.sellingPrice !== undefined) {
      sellingPrice = parseFloat(data.sellingPrice);
    } else if (data.sellPrice !== undefined) {
      sellingPrice = parseFloat(data.sellPrice);
    }

    let closedAt = pos.closedAt;
    if (data.closedAt) {
      closedAt = new Date(data.closedAt);
    } else if (data.sellDate) {
      closedAt = new Date(data.sellDate);
    }

    const entryDate = data.entryDate ? new Date(data.entryDate) : pos.entryDate;

    const investedAmount = calculateInvestment(buyPrice, quantity);
    let currentValue = pos.currentValue;
    let currentPrice = pos.currentPrice;
    let profitLoss = 0;
    let profitLossPct = 0;
    let holdingPeriod = pos.holdingPeriod;

    if (
      tradeType === 'SELL' ||
      status === 'CLOSED' ||
      data.status === 'CLOSED' ||
      sellingPrice !== null
    ) {
      // Historical/Completed Trade
      const sp =
        sellingPrice !== null && sellingPrice !== undefined
          ? sellingPrice
          : currentPrice;
      currentPrice = sp;
      currentValue = calculateCurrentValue(sp, quantity, tradeType, buyPrice);
      profitLoss = calculateRealizedPnL(buyPrice, sp, quantity, tradeType);
      profitLossPct = calculateRealizedReturnPct(buyPrice, sp, tradeType);

      const finalClosedAt = closedAt || new Date();
      holdingPeriod = Math.max(
        0,
        Math.floor(
          (finalClosedAt.getTime() - new Date(entryDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
    } else {
      // Live Open Position
      currentPrice =
        data.currentPrice !== undefined
          ? parseFloat(data.currentPrice)
          : pos.currentPrice;
      currentValue = calculateCurrentValue(
        currentPrice,
        quantity,
        tradeType,
        buyPrice,
      );
      profitLoss = calculateLivePnL(
        buyPrice,
        currentPrice,
        quantity,
        tradeType,
      );
      profitLossPct = calculateReturnPct(buyPrice, currentPrice, tradeType);
    }

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
      targetPrice:
        data.targetPrice !== undefined
          ? data.targetPrice
            ? parseFloat(data.targetPrice)
            : null
          : pos.targetPrice,
      stopLoss:
        data.stopLoss !== undefined
          ? data.stopLoss
            ? parseFloat(data.stopLoss)
            : null
          : pos.stopLoss,
      nearBuyProximityPct:
        data.nearBuyProximityPct !== undefined
          ? parseFloat(data.nearBuyProximityPct)
          : pos.nearBuyProximityPct,
      notes: data.notes !== undefined ? data.notes : pos.notes,
      assetType: data.assetType !== undefined ? data.assetType : pos.assetType,
      investorName:
        data.investorName !== undefined ? data.investorName : pos.investorName,
      status: tradeType === 'SELL' ? 'CLOSED' : status,
      muteAlertsUntil:
        data.muteAlertsUntil !== undefined
          ? data.muteAlertsUntil
            ? new Date(data.muteAlertsUntil)
            : null
          : pos.muteAlertsUntil,
      entryDate,
    };

    if (
      tradeType === 'SELL' ||
      status === 'CLOSED' ||
      data.status === 'CLOSED' ||
      sellingPrice !== null
    ) {
      updateData.status = 'CLOSED';
      updateData.sellingPrice =
        sellingPrice !== null && sellingPrice !== undefined
          ? sellingPrice
          : currentPrice;
      updateData.closedAt = closedAt || new Date();
      updateData.holdingPeriod = holdingPeriod;
      updateData.exitReason =
        data.exitReason || pos.exitReason || 'MANUAL_EXIT';
    }

    // ⚡ RESET TRIGGER KEYS ON EDIT (Req 14)
    if (tradeType !== 'SELL' && status !== 'CLOSED') {
      const priceChanged =
        (data.buyPrice !== undefined &&
          parseFloat(data.buyPrice) !== pos.buyPrice) ||
        (data.targetPrice !== undefined &&
          (data.targetPrice ? parseFloat(data.targetPrice) : null) !==
            pos.targetPrice) ||
        (data.stopLoss !== undefined &&
          (data.stopLoss ? parseFloat(data.stopLoss) : null) !== pos.stopLoss);

      if (priceChanged) {
        await this.notificationService
          .resetPositionTriggerKeys(pos.symbol)
          .catch(() => {});
      }
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
    this.clearCache();
    const pos = await prisma.portfolioPosition.findUnique({ where: { id } });
    if (!pos)
      throw new NotFoundException(`Position with ID "${id}" not found.`);

    const sp =
      sellingPriceInput !== undefined && sellingPriceInput !== null
        ? sellingPriceInput
        : pos.currentPrice;
    const bc =
      brokerChargesInput !== undefined && brokerChargesInput !== null
        ? brokerChargesInput
        : pos.brokerCharges;
    const currentValue = calculateCurrentValue(
      sp,
      pos.quantity,
      pos.tradeType,
      pos.buyPrice,
    );
    const profitLoss = calculateRealizedPnL(
      pos.buyPrice,
      sp,
      pos.quantity,
      pos.tradeType,
    );
    const profitLossPct = calculateRealizedReturnPct(
      pos.buyPrice,
      sp,
      pos.tradeType,
    );

    const closedAt = sellingDateInput ? new Date(sellingDateInput) : new Date();
    const start = new Date(pos.entryDate).getTime();
    const end = closedAt.getTime();
    const holdingPeriod = Math.max(
      0,
      Math.floor((end - start) / (1000 * 60 * 60 * 24)),
    );

    const result = await prisma.portfolioPosition.update({
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

    if (
      !exitReasonInput ||
      (exitReasonInput !== 'TARGET_HIT' && exitReasonInput !== 'STOP_LOSS_HIT')
    ) {
      await this.tradeEventEngine
        .handleManualCloseEvent(pos, sp, profitLoss, profitLossPct)
        .catch(() => {});
    }

    return result;
  }

  async bulkDelete(ids: string[]): Promise<any> {
    this.clearCache();
    return prisma.portfolioPosition.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async bulkUpdate(positionsData: any[]): Promise<any[]> {
    this.clearCache();
    const results: PortfolioPosition[] = [];
    for (const data of positionsData) {
      if (data.id) {
        const res = await this.editPosition(data.id, data).catch((e: Error) => {
          this.logger.error(
            `Failed to update position ${data.id}: ${e.message}`,
          );
          return null;
        });
        if (res) results.push(res);
      }
    }
    return results;
  }

  async deletePosition(id: string): Promise<any> {
    this.clearCache();
    return prisma.portfolioPosition.delete({ where: { id } });
  }

  async getDashboard(): Promise<any> {
    const now = Date.now();
    if (this.dashboardCache && now - this.dashboardCache.timestamp < 20000) {
      this.logger.debug('Returning cached dashboard data');
      return this.dashboardCache.data;
    }

    const portfolioData = await this.getPortfolio();
    const { positions, summary, investors } = portfolioData;
    const { open, closed } = positions;

    // 1. Line Chart Data (Live Open Positions Buy Price vs CMP)
    const line = open.map((p: any) => ({
      symbol: p.symbol,
      BuyPrice: p.buyPrice,
      CMP: p.currentPrice,
    }));

    // 2. Bar Chart Data (Realized P&L by Symbol)
    const bar = closed.map((p: any) => ({
      symbol: p.symbol,
      PnL: p.profitLoss,
    }));

    // 3. Pie Chart Data (Composition)
    const pie = open.map((p: any) => ({
      name: p.symbol,
      value: p.investedAmount,
    }));

    // 4. Stacked Bar Chart Data (Invested vs Value)
    const stacked = open.map((p: any) => ({
      symbol: p.symbol,
      Invested: p.investedAmount,
      Value: p.currentValue,
    }));

    // 5. Area Chart Data (Cumulative Realized Return)
    let cumulative = 0;
    const area = [...closed]
      .sort(
        (a: any, b: any) =>
          new Date(a.closedAt || a.entryDate).getTime() -
          new Date(b.closedAt || b.entryDate).getTime(),
      )
      .map((p: any) => {
        cumulative += p.profitLoss;
        return {
          date: new Date(p.closedAt || p.entryDate).toLocaleDateString(
            'en-IN',
            { month: 'short', day: 'numeric' },
          ),
          Gain: cumulative,
        };
      });

    // 6. Radial Chart Data (Investor Allocations)
    const COLORS = [
      '#2563EB',
      '#10B981',
      '#64748B',
      '#0D9488',
      '#7C3AED',
      '#EA580C',
    ];
    const radial = investors.map((inv: any, idx: number) => ({
      name: inv.name,
      uv: inv.totalInvestment,
      fill: COLORS[idx % COLORS.length],
    }));

    // 7. Heatmap Grid Data
    const heatmap = open.map((p: any) => ({
      symbol: p.symbol,
      pct: p.profitLossPct,
      val: p.profitLoss,
    }));

    // 8. Histogram Bins
    const histogram = [
      { range: '0-5d', count: 0 },
      { range: '6-15d', count: 0 },
      { range: '16-30d', count: 0 },
      { range: '31d+', count: 0 },
    ];
    closed.forEach((p: any) => {
      const days = p.holdingPeriod || 0;
      if (days <= 5) histogram[0].count++;
      else if (days <= 15) histogram[1].count++;
      else if (days <= 30) histogram[2].count++;
      else histogram[3].count++;
    });

    // 9. Performers List
    const allNonArchived = [...open, ...closed];
    const gainers = allNonArchived
      .filter((p: any) => p.profitLossPct > 0)
      .sort((a: any, b: any) => b.profitLossPct - a.profitLossPct);
    const losers = allNonArchived
      .filter((p: any) => p.profitLossPct < 0)
      .sort((a: any, b: any) => a.profitLossPct - b.profitLossPct);

    const best1 = gainers[0] || null;
    const best2 = gainers[1] || null;
    const best3 = gainers[2] || null;

    const worst1 = losers[0] || null;
    const worst2 = losers[1] || null;
    const worst3 = losers[2] || null;

    const performers = [
      { label: '🏆 #1 Best Performer', data: best1, color: '#16A34A' },
      { label: '🥈 #2 Best Performer', data: best2, color: '#16A34A' },
      { label: '🥉 #3 Best Performer', data: best3, color: '#16A34A' },
      { label: '📉 #1 Worst Performer', data: worst1, color: '#DC2626' },
      { label: '📉 #2 Worst Performer', data: worst2, color: '#DC2626' },
      { label: '📉 #3 Worst Performer', data: worst3, color: '#DC2626' },
    ].filter((p) => p.data !== null);

    // 10. Fetch top 5 notifications
    const recentNotifications = await prisma.notification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const recentPositions = open.slice(0, 4).map((p: any) => ({
      id: p.id,
      symbol: p.symbol,
      company: p.company,
      profitLoss: p.profitLoss,
      holdingPeriod: p.holdingPeriod,
    }));

    const dashboardData = {
      summary,
      performers,
      recentNotifications,
      recentPositions,
      charts: {
        line,
        bar,
        pie,
        stacked,
        area,
        radial,
        heatmap,
        histogram,
      },
    };

    this.dashboardCache = { data: dashboardData, timestamp: now };
    return dashboardData;
  }
}
