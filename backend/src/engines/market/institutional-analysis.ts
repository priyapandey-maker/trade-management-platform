export interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBlockStrength {
  score: number;
  confidence: string;
  creationDate?: string;
  age?: number;
  widthPct: number;
  mitigated?: boolean;
  retestCount?: number;
}

export interface OrderBlock {
  top: number;
  bottom: number;
  startIndex: number;
  endIndex?: number;
  price?: number;
  volume?: number;
  type: 'BULLISH' | 'BEARISH';
  strength?: OrderBlockStrength;
}

export type ScannerZoneStatus = 'INSIDE_ZONE' | 'NEAR_ZONE' | 'FAR';

export function calculateRSI(candles: Candle[], period: number = 14): { current: number; period: number; state: string; history: number[] } {
  if (!candles || candles.length < period + 1) {
    return { current: 50, period, state: 'NEUTRAL', history: [50] };
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const history: number[] = [];

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    history.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
  }

  const current = history.length > 0 ? history[history.length - 1] : 50;

  let state = 'NEUTRAL';
  if (current >= 70) state = 'OVERBOUGHT';
  else if (current <= 30) state = 'OVERSOLD';

  return { current, period, state, history };
}

export function detectFVG(candles: Candle[]): { bullish: any[]; bearish: any[] } {
  const bullish: any[] = [];
  const bearish: any[] = [];
  if (!candles || candles.length < 3) return { bullish, bearish };

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    if (c3.low > c1.high) {
      bullish.push({ type: 'BULLISH', top: c3.low, bottom: c1.high, index: i - 1 });
    } else if (c3.high < c1.low) {
      bearish.push({ type: 'BEARISH', top: c1.low, bottom: c3.high, index: i - 1 });
    }
  }

  return { bullish, bearish };
}

export function calculateSupport(candles: Candle[]): { price: number; supportPrice: number; currentPrice: number; distancePct: number } {
  if (!candles || candles.length === 0) {
    return { price: 0, supportPrice: 0, currentPrice: 0, distancePct: 0 };
  }
  const currentPrice = candles[candles.length - 1].close;
  const lows = candles.map((c) => c.low);
  const supportPrice = Math.min(...lows);
  const distancePct = currentPrice > 0 ? ((currentPrice - supportPrice) / currentPrice) * 100 : 0;
  return { price: supportPrice, supportPrice, currentPrice, distancePct: Math.round(distancePct * 100) / 100 };
}

export function calculateResistance(candles: Candle[]): { price: number; resistancePrice: number; currentPrice: number; distancePct: number } {
  if (!candles || candles.length === 0) {
    return { price: 0, resistancePrice: 0, currentPrice: 0, distancePct: 0 };
  }
  const currentPrice = candles[candles.length - 1].close;
  const highs = candles.map((c) => c.high);
  const resistancePrice = Math.max(...highs);
  const distancePct = currentPrice > 0 ? ((resistancePrice - currentPrice) / currentPrice) * 100 : 0;
  return { price: resistancePrice, resistancePrice, currentPrice, distancePct: Math.round(distancePct * 100) / 100 };
}

export function generateRecommendation(data: any): string {
  let score = 50;

  if (data?.rsiValue <= 30) score += 20;
  if (data?.rsiValue >= 70) score -= 20;

  if (score >= 65) return 'ACCUMULATE';
  if (score <= 35) return 'REDUCE';
  return 'HOLD';
}

export function evaluateOrderBlocks(candles: Candle[], _opt?: any, _filterPct?: any): { bullish: OrderBlock[]; bearish: OrderBlock[] } {
  const bullish: OrderBlock[] = [];
  const bearish: OrderBlock[] = [];

  if (!candles || candles.length < 3) {
    return { bullish, bearish };
  }

  for (let i = 1; i < candles.length - 1; i++) {
    const curr = candles[i];
    const next = candles[i + 1];

    if (curr.close < curr.open && next.close > next.open && next.close > curr.high) {
      bullish.push({
        top: curr.high,
        bottom: curr.low,
        startIndex: i,
        endIndex: i + 1,
        type: 'BULLISH',
        strength: {
          score: 85,
          confidence: 'HIGH',
          widthPct: ((next.close - curr.close) / curr.close) * 100,
        },
      });
    } else if (curr.close > curr.open && next.close < next.open && next.close < curr.low) {
      bearish.push({
        top: curr.high,
        bottom: curr.low,
        startIndex: i,
        endIndex: i + 1,
        type: 'BEARISH',
        strength: {
          score: 85,
          confidence: 'HIGH',
          widthPct: ((curr.close - next.close) / curr.close) * 100,
        },
      });
    }
  }

  return { bullish, bearish };
}
