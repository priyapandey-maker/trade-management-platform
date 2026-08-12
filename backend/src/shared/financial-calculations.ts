import Decimal from 'decimal.js';

export function calculateInvestment(
  buyPrice: number,
  quantity: number,
): number {
  return new Decimal(buyPrice).mul(quantity).toNumber();
}

export function calculateCurrentValue(
  currentPrice: number,
  quantity: number,
  tradeType?: string,
  buyPrice?: number,
): number {
  return new Decimal(currentPrice).mul(quantity).toNumber();
}

export function calculateLivePnL(
  buyPrice: number,
  currentPrice: number,
  quantity: number,
  tradeType?: string,
): number {
  const bp = new Decimal(buyPrice);
  const cp = new Decimal(currentPrice);
  const qty = new Decimal(quantity);
  return cp.minus(bp).mul(qty).toNumber();
}

export function calculateReturnPct(
  buyPrice: number,
  currentPrice: number,
  tradeType?: string,
): number {
  if (buyPrice <= 0) return 0;
  const bp = new Decimal(buyPrice);
  const cp = new Decimal(currentPrice);
  return cp.minus(bp).div(bp).mul(100).toNumber();
}

export function calculateRealizedPnL(
  buyPrice: number,
  sellPrice: number,
  quantity: number,
  tradeType?: string,
): number {
  const bp = new Decimal(buyPrice);
  const sp = new Decimal(sellPrice);
  const qty = new Decimal(quantity);
  return sp.minus(bp).mul(qty).toNumber();
}

export function calculateRealizedReturnPct(
  buyPrice: number,
  sellPrice: number,
  tradeType?: string,
): number {
  if (buyPrice <= 0) return 0;
  const bp = new Decimal(buyPrice);
  const sp = new Decimal(sellPrice);
  return sp.minus(bp).div(bp).mul(100).toNumber();
}

export function calculatePotentialProfit(
  buyPrice: number,
  targetPrice: number | null | undefined,
  quantity: number,
  tradeType?: string,
): number {
  if (targetPrice === null || targetPrice === undefined) return 0;
  const bp = new Decimal(buyPrice);
  const tp = new Decimal(targetPrice);
  const qty = new Decimal(quantity);
  return tp.minus(bp).mul(qty).toNumber();
}

export function calculateMissedProfit(
  buyPrice: number,
  targetPrice: number | null | undefined,
  sellPrice: number,
  quantity: number,
  tradeType?: string,
): { missedProfit: number; extraProfit: number } {
  if (targetPrice === null || targetPrice === undefined) {
    return { missedProfit: 0, extraProfit: 0 };
  }
  const tp = new Decimal(targetPrice);
  const sp = new Decimal(sellPrice);
  const qty = new Decimal(quantity);

  if (sp.lt(tp)) {
    return {
      missedProfit: tp.minus(sp).mul(qty).toNumber(),
      extraProfit: 0,
    };
  } else {
    return {
      missedProfit: 0,
      extraProfit: sp.minus(tp).mul(qty).toNumber(),
    };
  }
}

export function formatDecimal(
  val: number | string | Decimal | null | undefined,
): string {
  if (val === null || val === undefined) return '—';
  const num = new Decimal(val);
  if (num.isNaN() || !num.isFinite()) return '—';
  if (num.abs().lt(0.005)) {
    return '0.00';
  }
  const formatted = num.toFixed(2);
  if (formatted === '-0.00') {
    return '0.00';
  }
  return formatted;
}
