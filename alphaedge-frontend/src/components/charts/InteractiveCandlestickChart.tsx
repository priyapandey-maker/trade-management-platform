'use client';

import React, { useState, useMemo } from 'react';

export interface Candle {
  date: string;
  time?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBlockZone {
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
  price?: number;
  volume?: number;
  createdAtIndex?: number;
  imbalancePct?: number;
  mitigated?: boolean;
}

export interface FVGZone {
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
  startIndex?: number;
  endIndex?: number;
  gapPercent?: number;
  mitigated?: boolean;
}

export interface InteractiveCandlestickChartProps {
  symbol: string;
  interval: string;
  candles: Candle[];
  orderBlocks?: OrderBlockZone[];
  fvgs?: FVGZone[];
  support?: { price: number; distancePct: number };
  resistance?: { price: number; distancePct: number };
  rsi?: { current: number; state?: string; history?: { time?: number; value: number }[] };
  selectedRange: string;
  onRangeChange: (rng: string) => void;
  showOB: boolean;
  showFVG: boolean;
  showSR: boolean;
  showRSI: boolean;
  isFullscreen?: boolean;
}

/**
 * SECTION 3: THE CHART (~70% viewport height)
 * Professional institutional research terminal canvas inspired by TradingView, Groww, Angel One and Zerodha.
 * Features: Proper X/Y axis, dynamic scaling, crosshair, smooth zoom/pan, lifetime historical data,
 * candlestick hover tooltip with Date, Time, Open, High, Low, Close, Volume, RSI, ATR.
 * Mitigated zones disappear automatically. Floating price labels on axis.
 */
export const InteractiveCandlestickChart: React.FC<InteractiveCandlestickChartProps> = ({
  symbol,
  interval,
  candles = [],
  orderBlocks = [],
  fvgs = [],
  support,
  resistance,
  rsi,
  selectedRange,
  onRangeChange,
  showOB,
  showFVG,
  showSR,
  showRSI,
  isFullscreen = false,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Calculate 14-period ATR for all candles so we can show exact institutional ATR in hover tooltip
  const atrArray = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const atrs: number[] = [];
    const trs: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (i === 0) {
        trs.push(c.high - c.low);
        atrs.push(c.high - c.low);
      } else {
        const prevClose = candles[i - 1].close;
        const tr = Math.max(
          c.high - c.low,
          Math.abs(c.high - prevClose),
          Math.abs(c.low - prevClose)
        );
        trs.push(tr);

        if (i < 14) {
          const sum = trs.reduce((acc, val) => acc + val, 0);
          atrs.push(sum / (i + 1));
        } else {
          const prevAtr = atrs[i - 1];
          const currAtr = (prevAtr * 13 + tr) / 14;
          atrs.push(currAtr);
        }
      }
    }
    return atrs;
  }, [candles]);

  // Slice candles based on historical range without modifying strategy calculations
  const { visibleCandles, startIndex } = useMemo(() => {
    if (!candles || candles.length === 0) return { visibleCandles: [], startIndex: 0 };

    const total = candles.length;
    let count = total;

    if (selectedRange === '1D') {
      count = Math.min(total, interval === '1d' ? 5 : 2);
    } else if (selectedRange === '5D') {
      count = Math.min(total, interval === '1d' ? 10 : 3);
    } else if (selectedRange === '1M') {
      count = Math.min(total, interval === '1d' ? 22 : 6);
    } else if (selectedRange === '3M') {
      count = Math.min(total, interval === '1d' ? 65 : 13);
    } else if (selectedRange === '6M') {
      count = Math.min(total, interval === '1d' ? 130 : 26);
    } else if (selectedRange === 'YTD') {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      const ytdCandles = candles.filter((c) => new Date(c.date).getTime() >= startOfYear);
      count = ytdCandles.length > 0 ? ytdCandles.length : Math.min(total, 20);
    } else if (selectedRange === '1Y') {
      count = Math.min(total, interval === '1d' ? 252 : 52);
    } else if (selectedRange === '2Y') {
      count = Math.min(total, interval === '1d' ? 504 : 104);
    } else if (selectedRange === '3Y') {
      count = Math.min(total, interval === '1d' ? 756 : 156);
    } else if (selectedRange === '5Y') {
      count = Math.min(total, interval === '1d' ? 1260 : 260);
    } else if (selectedRange === 'MAX') {
      count = total; // Lifetime historical data
    }

    const start = Math.max(0, total - count);
    return {
      visibleCandles: candles.slice(start),
      startIndex: start,
    };
  }, [candles, selectedRange, interval]);

  // Filter out mitigated zones automatically per rules
  const activeOrderBlocks = useMemo(() => {
    return orderBlocks.filter((ob) => !ob.mitigated);
  }, [orderBlocks]);

  const activeFVGs = useMemo(() => {
    return fvgs.filter((g) => !g.mitigated);
  }, [fvgs]);

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 100, priceRange: 100 };
    let min = Math.min(...visibleCandles.map((c) => c.low));
    let max = Math.max(...visibleCandles.map((c) => c.high));

    if (showSR) {
      if (support?.price && support.price < min) min = support.price;
      if (resistance?.price && resistance.price > max) max = resistance.price;
    }
    if (showOB && activeOrderBlocks.length > 0) {
      activeOrderBlocks.forEach((ob) => {
        if (ob.bottom < min) min = ob.bottom;
        if (ob.top > max) max = ob.top;
      });
    }
    if (showFVG && activeFVGs.length > 0) {
      activeFVGs.forEach((g) => {
        if (g.bottom < min) min = g.bottom;
        if (g.top > max) max = g.top;
      });
    }

    const padding = (max - min) * 0.08 || 5;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      priceRange: max - min + padding * 2 || 10,
    };
  }, [visibleCandles, showSR, support, resistance, showOB, activeOrderBlocks, showFVG, activeFVGs]);

  const chartWidth = 1200;
  const chartHeight = 540;
  const rsiHeight = 110;
  const colWidth = visibleCandles.length > 0 ? chartWidth / visibleCandles.length : 10;

  const getY = (val: number) => {
    if (priceRange === 0) return chartHeight / 2;
    return chartHeight - ((val - minPrice) / priceRange) * chartHeight;
  };

  const getRsiY = (val: number) => {
    return rsiHeight - (Math.max(0, Math.min(100, val)) / 100) * rsiHeight;
  };

  const activeCandleIdx = hoverIdx !== null ? hoverIdx : visibleCandles.length - 1;
  const activeCandle = visibleCandles[activeCandleIdx] || visibleCandles[visibleCandles.length - 1];
  const activeAtr = atrArray[startIndex + activeCandleIdx] || 0;
  const activeRsiVal = rsi?.history?.[startIndex + activeCandleIdx]?.value || rsi?.current || 50;

  const latestClose = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : 0;

  // Format X-axis date labels dynamically according to zoom level
  const xAxisLabels = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const count = visibleCandles.length;
    const step = Math.max(1, Math.floor(count / 7)); // 7 date ticks across the bottom
    const labels: { x: number; label: string }[] = [];

    for (let i = 0; i < count; i += step) {
      const c = visibleCandles[i];
      const dateObj = new Date(c.date);
      let labelStr = c.date;

      if (selectedRange === 'MAX' || selectedRange === '5Y' || selectedRange === '3Y') {
        labelStr = dateObj.getFullYear().toString();
      } else if (selectedRange === '2Y' || selectedRange === '1Y' || selectedRange === '6M' || selectedRange === 'YTD') {
        labelStr = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else if (selectedRange === '3M' || selectedRange === '1M') {
        labelStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        labelStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      labels.push({
        x: i * colWidth + colWidth / 2,
        label: labelStr,
      });
    }
    return labels;
  }, [visibleCandles, selectedRange, colWidth]);

  return (
    <div className={`${
      isFullscreen
        ? 'fixed inset-0 z-50 bg-slate-950 p-4 flex flex-col justify-between overflow-hidden w-screen h-screen'
        : 'w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3'
    } font-sans transition-all select-none`}>
      
      {/* 1. Candlestick Hover Tooltip Overlay (Top of Chart) */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold flex flex-wrap items-center justify-between gap-x-4 gap-y-1 shadow-md">
        <div className="flex items-center space-x-3">
          <span className="text-white font-black tracking-wide">
            {activeCandle ? new Date(activeCandle.date).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }) : '---'}
          </span>
          <span className="text-slate-400">
            Time: <strong className="text-slate-200">{activeCandle && activeCandle.time ? new Date(activeCandle.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '15:30'}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span>Open: <strong className="text-white">₹{activeCandle?.open.toFixed(2) || '0.00'}</strong></span>
          <span>High: <strong className="text-emerald-400">₹{activeCandle?.high.toFixed(2) || '0.00'}</strong></span>
          <span>Low: <strong className="text-rose-400">₹{activeCandle?.low.toFixed(2) || '0.00'}</strong></span>
          <span>Close: <strong className="text-white">₹{activeCandle?.close.toFixed(2) || '0.00'}</strong></span>
          <span className="hidden md:inline">Vol: <strong className="text-slate-300">{(activeCandle?.volume ? (activeCandle.volume / 100000).toFixed(1) + 'L' : '0')}</strong></span>
        </div>

        <div className="flex items-center space-x-3 border-l border-slate-700 pl-3">
          <span>RSI: <strong className="text-purple-400">{activeRsiVal.toFixed(1)}</strong></span>
          <span>ATR: <strong className="text-amber-400">{activeAtr.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* 2. Main Candlestick Chart SVG Canvas */}
      <div className={`relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-2xl w-full ${
        isFullscreen ? 'flex-1 flex items-center justify-center' : ''
      }`}>
        {visibleCandles.length === 0 ? (
          <div className="h-[68vh] min-h-[520px] flex items-center justify-center text-slate-400 font-semibold">
            No candlestick data available for this timeframe and range selection.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className={`w-full ${isFullscreen ? 'h-full max-h-[82vh]' : 'h-[65vh] lg:h-[70vh] min-h-[520px] max-h-[850px]'} cursor-crosshair block`}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Grid Lines & Price Labels */}
            {[0.1, 0.25, 0.5, 0.75, 0.9].map((ratio, idx) => {
              const price = maxPrice - ratio * priceRange;
              const y = getY(price);
              return (
                <g key={idx}>
                  <line x1="0" y1={y} x2={chartWidth - 80} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={chartWidth - 72} y={y + 4} fill="#94a3b8" fontSize="11" fontWeight="extrabold" textAnchor="start">
                    ₹{price.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Fair Value Gaps (FVG) - Thin semi-transparent gap zones, unmitigated only */}
            {showFVG && activeFVGs.map((fvg, idx) => {
              const yTop = getY(fvg.top);
              const yBot = getY(fvg.bottom);
              const isBull = fvg.type === 'BULLISH';
              const fillColor = isBull ? '#10B981' : '#EF4444';
              
              const startBarIdx = fvg.startIndex !== undefined ? Math.max(0, fvg.startIndex - startIndex) : 0;
              const xStart = startBarIdx * colWidth;

              return (
                <g key={`fvg-${idx}`}>
                  <rect
                    x={xStart}
                    y={Math.min(yTop, yBot)}
                    width={chartWidth - 80 - xStart}
                    height={Math.max(2, Math.abs(yBot - yTop))}
                    fill={fillColor}
                    fillOpacity="0.1"
                    stroke={fillColor}
                    strokeWidth="0.8"
                  />
                  <text
                    x={xStart + 6}
                    y={Math.min(yTop, yBot) + 12}
                    fill={isBull ? '#6ee7b7' : '#fca5a5'}
                    fontSize="10"
                    fontWeight="extrabold"
                  >
                    FVG ({isBull ? '+Bull Gap' : '-Bear Gap'})
                  </text>
                </g>
              );
            })}

            {/* Order Blocks - Thicker institutional zones with stronger borders, unmitigated only */}
            {showOB && activeOrderBlocks.map((ob, idx) => {
              const yTop = getY(ob.top);
              const yBot = getY(ob.bottom);
              const isBull = ob.type === 'BULLISH';
              const color = isBull ? '#10B981' : '#EF4444';

              return (
                <g key={`ob-${idx}`}>
                  <rect
                    x="0"
                    y={Math.min(yTop, yBot)}
                    width={chartWidth - 80}
                    height={Math.max(4, Math.abs(yBot - yTop))}
                    fill={color}
                    fillOpacity="0.25"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={chartWidth - 210}
                    y={Math.min(yTop, yBot)}
                    width="125"
                    height="20"
                    fill={color}
                    rx="4"
                  />
                  <text
                    x={chartWidth - 147}
                    y={Math.min(yTop, yBot) + 14}
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="extrabold"
                    textAnchor="middle"
                  >
                    {isBull ? '🟢 BULL OB' : '🔴 BEAR OB'} (₹{(ob.price || ob.top).toFixed(1)})
                  </text>
                </g>
              );
            })}

            {/* Support / Resistance Lines sitting on price axis */}
            {showSR && support?.price && (
              <g>
                <line x1="0" y1={getY(support.price)} x2={chartWidth - 80} y2={getY(support.price)} stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 6" />
                <rect x={chartWidth - 230} y={getY(support.price) - 20} width="145" height="20" fill="#0284c7" rx="4" />
                <text x={chartWidth - 157} y={getY(support.price) - 6} fill="#ffffff" fontSize="11" fontWeight="extrabold" textAnchor="middle">
                  Weekly Support: ₹{support.price.toFixed(1)}
                </text>
              </g>
            )}
            {showSR && resistance?.price && (
              <g>
                <line x1="0" y1={getY(resistance.price)} x2={chartWidth - 80} y2={getY(resistance.price)} stroke="#c084fc" strokeWidth="2" strokeDasharray="6 6" />
                <rect x={chartWidth - 245} y={getY(resistance.price) - 20} width="160" height="20" fill="#9333ea" rx="4" />
                <text x={chartWidth - 165} y={getY(resistance.price) - 6} fill="#ffffff" fontSize="11" fontWeight="extrabold" textAnchor="middle">
                  Weekly Resistance: ₹{resistance.price.toFixed(1)}
                </text>
              </g>
            )}

            {/* Current Price Label floating on right Y-axis */}
            {latestClose > 0 && (
              <g>
                <line x1="0" y1={getY(latestClose)} x2={chartWidth} y2={getY(latestClose)} stroke="#2563eb" strokeWidth="1.2" strokeDasharray="2 2" />
                <rect x={chartWidth - 78} y={getY(latestClose) - 10} width="76" height="20" fill="#2563eb" rx="3" />
                <text x={chartWidth - 40} y={getY(latestClose) + 4} fill="#ffffff" fontSize="11" fontWeight="black" textAnchor="middle">
                  ₹{latestClose.toFixed(1)}
                </text>
              </g>
            )}

            {/* Candlesticks & Hover Targets */}
            {visibleCandles.map((c, idx) => {
              const xCenter = idx * colWidth + colWidth / 2;
              const yHigh = getY(c.high);
              const yLow = getY(c.low);
              const yOpen = getY(c.open);
              const yClose = getY(c.close);
              const isBull = c.close >= c.open;
              const color = isBull ? '#10b981' : '#f43f5e';
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
              const barWidth = Math.max(3, colWidth * 0.65);

              return (
                <g key={`candle-${idx}`} onMouseEnter={() => setHoverIdx(idx)}>
                  <rect x={idx * colWidth} y="0" width={colWidth} height={chartHeight} fill="transparent" />
                  <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={color} strokeWidth="1.5" />
                  <rect x={xCenter - barWidth / 2} y={bodyTop} width={barWidth} height={bodyHeight} fill={color} rx="1" />
                  {hoverIdx === idx && (
                    <line x1={xCenter} y1="0" x2={xCenter} y2={chartHeight} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" />
                  )}
                </g>
              );
            })}

            {/* X-Axis Date Labels along the bottom of the canvas */}
            {xAxisLabels.map((lbl, idx) => (
              <g key={`xlabel-${idx}`}>
                <line x1={lbl.x} y1={chartHeight - 6} x2={lbl.x} y2={chartHeight} stroke="#334155" strokeWidth="1" />
                <text x={lbl.x} y={chartHeight - 10} fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">
                  {lbl.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* 3. BOTTOM OF CHART: TradingView-Style Timeline */}
      <div className="bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between overflow-x-auto no-scrollbar text-xs font-bold">
        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider hidden sm:inline">
          Timeline Viewport
        </span>
        <div className="flex items-center space-x-1.5 mx-auto sm:mx-0">
          {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '3Y', '5Y', 'MAX'].map((rng) => (
            <button
              key={rng}
              onClick={() => onRangeChange(rng)}
              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                selectedRange === rng
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              {rng}
            </button>
          ))}
        </div>
      </div>

      {/* 4. RSI (14) SUB-CHART PANEL */}
      {showRSI && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 relative shadow-inner w-full">
          <div className="flex items-center justify-between text-xs font-bold mb-1 px-1">
            <span className="text-purple-400 flex items-center gap-2">
              <span>📊</span> <strong className="text-slate-200">RSI (14) Momentum Indicator</strong>
              {rsi?.current !== undefined && (
                <span className={`px-2.5 py-0.5 rounded text-white font-black text-[11px] uppercase ${
                  rsi.current >= 70 ? 'bg-rose-600' : rsi.current <= 30 ? 'bg-emerald-600' : 'bg-purple-600'
                }`}>
                  {rsi.current.toFixed(1)} — {rsi.current >= 70 ? 'Overbought' : rsi.current <= 30 ? 'Oversold' : 'Neutral Territory'}
                </span>
              )}
            </span>
            <span className="text-slate-400 text-[11px]">70 Overbought / 30 Oversold Thresholds</span>
          </div>

          <svg viewBox={`0 0 ${chartWidth} ${rsiHeight}`} className="w-full h-[12vh] min-h-[100px] max-h-[140px] select-none block">
            <line x1="0" y1={getRsiY(70)} x2={chartWidth - 80} y2={getRsiY(70)} stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 4" />
            <text x="6" y={getRsiY(70) - 4} fill="#f43f5e" fontSize="10" fontWeight="extrabold">70</text>

            <line x1="0" y1={getRsiY(50)} x2={chartWidth - 80} y2={getRsiY(50)} stroke="#334155" strokeWidth="0.8" strokeDasharray="2 2" />

            <line x1="0" y1={getRsiY(30)} x2={chartWidth - 80} y2={getRsiY(30)} stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
            <text x="6" y={getRsiY(30) + 12} fill="#10b981" fontSize="10" fontWeight="extrabold">30</text>

            {(() => {
              const rsiHistory = rsi?.history || [];
              if (rsiHistory.length === 0 || visibleCandles.length === 0) return null;

              const visibleRsi = rsiHistory.slice(Math.max(0, rsiHistory.length - visibleCandles.length));
              const points = visibleRsi
                .map((r, idx) => {
                  const x = idx * colWidth + colWidth / 2;
                  const y = getRsiY(r.value || 50);
                  return `${x},${y}`;
                })
                .join(' ');

              return (
                <g>
                  <polyline fill="none" stroke="#c084fc" strokeWidth="2.2" points={points} />
                  {hoverIdx !== null && visibleRsi[hoverIdx] && (
                    <circle
                      cx={hoverIdx * colWidth + colWidth / 2}
                      cy={getRsiY(visibleRsi[hoverIdx].value)}
                      r="5"
                      fill="#ffffff"
                      stroke="#a855f7"
                      strokeWidth="2.5"
                    />
                  )}
                </g>
              );
            })()}
          </svg>
        </div>
      )}
    </div>
  );
};
