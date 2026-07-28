import { Injectable, Logger } from '@nestjs/common';
import { 
  evaluateOrderBlocks, 
  Candle, 
  OrderBlock, 
  ScannerZoneStatus 
} from './institutional-analysis';

export interface WeeklyCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBlockZone {
  top: number;
  bottom: number;
  createdAtIndex: number;
  type: 'BULLISH' | 'BEARISH';
  imbalancePct: number;
  strengthScore?: number;
  confidence?: string;
}

export type FvgZoneStatus = 'INSIDE_BUY_ZONE' | 'NEAR_BUY_ZONE' | 'INSIDE_SELL_ZONE' | 'NEAR_SELL_ZONE' | 'NEUTRAL';

export interface OrderBlockResult {
  state: 'BULLISH_ZONE' | 'NEUTRAL' | 'BEARISH_ZONE';
  zoneStatus: FvgZoneStatus;
  zoneStatusLabel: string;
  distanceToNearestZonePct: number;
  activeBullishZones: OrderBlockZone[];
  activeBearishZones: OrderBlockZone[];
  latestZone: OrderBlockZone | null;
  explanation: string;
}

@Injectable()
export class OrderBlockService {
  private readonly logger = new Logger(OrderBlockService.name);

  /**
   * Delegates all technical calculations to the shared @shree/institutional-analysis package.
   * Requirement 1: Zero duplicated mathematical calculations in the backend.
   */
  evaluateWeeklyOrderBlocks(candles: WeeklyCandle[], filterPct = 0.5): OrderBlockResult {
    if (!candles || candles.length < 10) {
      return {
        state: 'NEUTRAL',
        zoneStatus: 'NEUTRAL',
        zoneStatusLabel: 'Neutral',
        distanceToNearestZonePct: 0,
        activeBullishZones: [],
        activeBearishZones: [],
        latestZone: null,
        explanation: 'Insufficient weekly historical candle data to evaluate institutional Order Blocks.',
      };
    }

    // Convert to shared Candle interface
    const sharedCandles: Candle[] = candles.map((c) => ({
      date: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    // Call shared institutional analysis engine
    const res = evaluateOrderBlocks(sharedCandles, undefined, filterPct);

    const mapZone = (ob: OrderBlock): OrderBlockZone => ({
      top: ob.top,
      bottom: ob.bottom,
      createdAtIndex: ob.startIndex,
      type: ob.type,
      imbalancePct: ob.strength ? ob.strength.widthPct : 0,
      strengthScore: ob.strength ? ob.strength.score : 50,
      confidence: ob.strength ? ob.strength.confidence : 'MEDIUM',
    });

    const bullZones = res.bullish.map(mapZone);
    const bearZones = res.bearish.map(mapZone);

    const latestBull = bullZones.length > 0 ? bullZones[bullZones.length - 1] : null;
    const latestBear = bearZones.length > 0 ? bearZones[bearZones.length - 1] : null;

    let state: 'BULLISH_ZONE' | 'NEUTRAL' | 'BEARISH_ZONE' = 'NEUTRAL';
    let latestZone: OrderBlockZone | null = null;
    let explanation = 'No active weekly bullish or bearish order block zone detected. Market is currently in a neutral consolidation phase.';

    if (latestBull && !latestBear) {
      state = 'BULLISH_ZONE';
      latestZone = latestBull;
      explanation = `Active Weekly Bullish Order Block detected between ₹${latestBull.bottom.toFixed(2)} and ₹${latestBull.top.toFixed(2)} (unmitigated). Suitable institutional demand environment.`;
    } else if (latestBear && !latestBull) {
      state = 'BEARISH_ZONE';
      latestZone = latestBear;
      explanation = `Active Weekly Bearish Order Block detected between ₹${latestBear.bottom.toFixed(2)} and ₹${latestBear.top.toFixed(2)}. Overhead institutional supply present; avoid buying.`;
    } else if (latestBull && latestBear) {
      if (latestBull.createdAtIndex >= latestBear.createdAtIndex) {
        state = 'BULLISH_ZONE';
        latestZone = latestBull;
        explanation = `Recent Weekly Bullish Order Block (₹${latestBull.bottom.toFixed(2)} - ₹${latestBull.top.toFixed(2)}) dominates older bearish structure. Favorable demand environment.`;
      } else {
        state = 'BEARISH_ZONE';
        latestZone = latestBear;
        explanation = `Recent Weekly Bearish Order Block (₹${latestBear.bottom.toFixed(2)} - ₹${latestBear.top.toFixed(2)}) dominates market structure. Avoid buying until supply is absorbed.`;
      }
    }

    const currentPrice = candles[candles.length - 1].close;
    let zoneStatus: FvgZoneStatus = 'NEUTRAL';
    let zoneStatusLabel = 'Neutral';
    let minDistancePct = 999;

    for (const z of bullZones) {
      if (currentPrice >= z.bottom && currentPrice <= z.top) {
        zoneStatus = 'INSIDE_BUY_ZONE';
        zoneStatusLabel = 'Inside Buy Zone';
        minDistancePct = 0;
        break;
      } else if (currentPrice > z.top) {
        const dist = ((currentPrice - z.top) / currentPrice) * 100;
        if (dist < minDistancePct) minDistancePct = dist;
        if (dist <= 5.0) {
          zoneStatus = 'NEAR_BUY_ZONE';
          zoneStatusLabel = 'Near Buy Zone';
        }
      } else if (currentPrice < z.bottom) {
        const dist = ((z.bottom - currentPrice) / currentPrice) * 100;
        if (dist < minDistancePct) minDistancePct = dist;
      }
    }

    for (const z of bearZones) {
      if (currentPrice >= z.bottom && currentPrice <= z.top) {
        if ((zoneStatus as string) !== 'INSIDE_BUY_ZONE') {
          zoneStatus = 'INSIDE_SELL_ZONE';
          zoneStatusLabel = 'Inside Sell Zone';
          minDistancePct = 0;
        }
      } else if (currentPrice < z.bottom) {
        const dist = ((z.bottom - currentPrice) / currentPrice) * 100;
        if (dist < minDistancePct) minDistancePct = dist;
        if (dist <= 5.0 && (zoneStatus as string) === 'NEUTRAL') {
          zoneStatus = 'NEAR_SELL_ZONE';
          zoneStatusLabel = 'Near Sell Zone';
        }
      } else if (currentPrice > z.top) {
        const dist = ((currentPrice - z.top) / currentPrice) * 100;
        if (dist < minDistancePct) minDistancePct = dist;
      }
    }

    if (minDistancePct === 999) minDistancePct = 0;

    return {
      state,
      zoneStatus,
      zoneStatusLabel,
      distanceToNearestZonePct: Number(minDistancePct.toFixed(2)),
      activeBullishZones: bullZones,
      activeBearishZones: bearZones,
      latestZone,
      explanation,
    };
  }
}
