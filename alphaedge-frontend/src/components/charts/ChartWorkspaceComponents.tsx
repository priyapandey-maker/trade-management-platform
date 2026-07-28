'use client';

import React from 'react';

export interface TopResearchToolbarProps {
  symbolInput: string;
  onSymbolInputChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  activeSymbol: string;
  companyName?: string;
  cmp: number;
  priceChange: number;
  priceChangePct: number;
  exchange?: string;
  isLive?: boolean;
  loading?: boolean;
}

/**
 * SECTION 1: Top Research Toolbar (~72px height)
 * Contains Symbol Search (center aligned), Company Name, Price, Change, Exchange, Live Status.
 * Zero large buttons. Zero banners.
 */
export const TopResearchToolbar: React.FC<TopResearchToolbarProps> = ({
  symbolInput,
  onSymbolInputChange,
  onSearchSubmit,
  activeSymbol,
  companyName,
  cmp,
  priceChange,
  priceChangePct,
  exchange = 'NSE',
  isLive = true,
  loading,
}) => {
  const isPositive = priceChange >= 0;

  return (
    <header className="h-[72px] min-h-[72px] bg-white px-6 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4 w-full select-none overflow-hidden">
      {/* Left: Ticker Info & Price */}
      <div className="flex items-center space-x-4 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-xl font-black text-slate-900 tracking-tight truncate">{activeSymbol}</span>
          {companyName && (
            <span className="text-xs font-bold text-slate-500 truncate hidden lg:inline max-w-[200px]">
              {companyName}
            </span>
          )}
          <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
            {exchange}
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex items-baseline space-x-2">
          <span className="text-lg font-black text-slate-900">
            ₹{cmp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-black px-2 py-0.5 rounded ${
            isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Center: Symbol Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:flex justify-center">
        <form onSubmit={onSearchSubmit} className="relative w-full">
          <input
            type="text"
            value={symbolInput}
            onChange={(e) => onSymbolInputChange(e.target.value.toUpperCase())}
            placeholder="Search symbol (e.g. RELIANCE.NS, TCS.NS)..."
            className="w-full pl-9 pr-20 py-1.5 rounded-full border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:border-blue-600 focus:bg-white transition text-center shadow-2xs"
          />
          <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
          <button
            type="submit"
            disabled={loading}
            className="absolute right-1 top-1 px-3 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider transition disabled:opacity-50"
          >
            {loading ? '...' : 'Load'}
          </button>
        </form>
      </div>

      {/* Right: Live Status Indicator */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="tracking-wider">{isLive ? '● LIVE' : '○ SYNC'}</span>
        </div>
      </div>
    </header>
  );
};

export interface ChartControlsToolbarProps {
  selectedRange: string;
  onRangeChange: (rng: string) => void;
  interval: string;
  onIntervalChange: (tf: string) => void;
  showOB: boolean;
  onToggleOB: (val: boolean) => void;
  showFVG: boolean;
  onToggleFVG: (val: boolean) => void;
  showSR: boolean;
  onToggleSR: (val: boolean) => void;
  showRSI: boolean;
  onToggleRSI: (val: boolean) => void;
  onToggleFullscreen?: () => void;
  onResetZoom?: () => void;
  onExport?: () => void;
}

/**
 * SECTION 2: Chart Controls Toolbar
 * Single horizontal toolbar containing Time Range, Chart Interval, Overlay Toggles, and Toolbar Buttons.
 * Zero large blue buttons. Everything fits in one professional toolbar.
 */
export const ChartControlsToolbar: React.FC<ChartControlsToolbarProps> = ({
  selectedRange,
  onRangeChange,
  interval,
  onIntervalChange,
  showOB,
  onToggleOB,
  showFVG,
  onToggleFVG,
  showSR,
  onToggleSR,
  showRSI,
  onToggleRSI,
  onToggleFullscreen,
  onResetZoom,
  onExport,
}) => {
  const timeRanges = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '3Y', '5Y', 'MAX'];
  const intervals = [
    { id: '1m', label: '1m' },
    { id: '5m', label: '5m' },
    { id: '15m', label: '15m' },
    { id: '30m', label: '30m' },
    { id: '1h', label: '1H' },
    { id: '1d', label: '1D' },
    { id: '1wk', label: '1W' },
    { id: '1mo', label: '1M' },
  ];

  return (
    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 w-full overflow-x-auto no-scrollbar text-xs font-bold text-slate-700 select-none whitespace-nowrap">
      {/* 1. Time Range */}
      <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200/80 shrink-0">
        <span className="text-[10px] font-black uppercase text-slate-400 px-1.5">Range</span>
        {timeRanges.map((rng) => (
          <button
            key={rng}
            onClick={() => onRangeChange(rng)}
            className={`px-2 py-0.5 rounded text-[11px] font-black transition ${
              selectedRange === rng
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {rng}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-slate-200 shrink-0"></div>

      {/* 2. Chart Interval */}
      <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200/80 shrink-0">
        <span className="text-[10px] font-black uppercase text-slate-400 px-1.5">Interval</span>
        {intervals.map((tf) => (
          <button
            key={tf.id}
            onClick={() => onIntervalChange(tf.id)}
            className={`px-2 py-0.5 rounded text-[11px] font-black transition ${
              interval === tf.id || (interval === '1d' && tf.id === '1d') || (interval === '1wk' && tf.id === '1wk')
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-slate-200 shrink-0"></div>

      {/* 3. Overlay Toggles */}
      <div className="flex items-center space-x-3 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/80 shrink-0 text-[11px]">
        <label className="flex items-center space-x-1 cursor-pointer select-none hover:text-slate-950">
          <input type="checkbox" checked={showOB} onChange={(e) => onToggleOB(e.target.checked)} className="rounded border-slate-300 text-blue-600 w-3 h-3" />
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Order Blocks</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer select-none hover:text-slate-950">
          <input type="checkbox" checked={showFVG} onChange={(e) => onToggleFVG(e.target.checked)} className="rounded border-slate-300 text-blue-600 w-3 h-3" />
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> FVGs</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer select-none hover:text-slate-950">
          <input type="checkbox" checked={showSR} onChange={(e) => onToggleSR(e.target.checked)} className="rounded border-slate-300 text-blue-600 w-3 h-3" />
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Support & Rest</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer select-none hover:text-slate-950">
          <input type="checkbox" checked={showRSI} onChange={(e) => onToggleRSI(e.target.checked)} className="rounded border-slate-300 text-blue-600 w-3 h-3" />
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> RSI</span>
        </label>
      </div>

      <div className="h-5 w-px bg-slate-200 shrink-0"></div>

      {/* 4. Toolbar Buttons */}
      <div className="flex items-center space-x-1 shrink-0 text-[11px]">
        {[
          { icon: '✛', label: 'Crosshair', title: 'Crosshair Mode' },
          { icon: '⏰', label: 'Alert', title: 'Set Price Alert' },
          { icon: '↗', label: 'Long', title: 'Long Position Tool' },
          { icon: '↘', label: 'Short', title: 'Short Position Tool' },
          { icon: '📏', label: 'Measure', title: 'Measure Distance & Time' },
        ].map((btn, idx) => (
          <button
            key={idx}
            title={btn.title}
            onClick={() => {}}
            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200/70 transition flex items-center gap-1"
          >
            <span>{btn.icon}</span> <span className="hidden xl:inline">{btn.label}</span>
          </button>
        ))}

        {onResetZoom && (
          <button
            onClick={onResetZoom}
            title="Reset Zoom Level"
            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200/70 transition"
          >
            ↺ Reset
          </button>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title="Toggle Immersive Fullscreen Terminal"
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-extrabold transition shadow-2xs"
          >
            ⛶ Fullscreen
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            title="Export Chart Data / Print"
            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200/70 transition"
          >
            📥 Export
          </button>
        )}
      </div>
    </div>
  );
};

export interface ResearchSummaryGridProps {
  recommendationAction: string;
  recommendationScore: string | number;
  rsiValue: number;
  rsiStatus: string;
  buyZonePrice: number;
  buyZoneDistancePct: number;
  sellZonePrice: number;
  sellZoneDistancePct: number;
  riskRewardRatio: string;
  trendStatus: string;
  institutionalAccumulation: string;
}

/**
 * SECTION 4: Research Summary
 * Exactly six cards. Zero paragraphs. Zero stacked narrative text.
 * Desktop layout: 3 cards per row. Mobile: 1 card per row.
 */
export const ResearchSummaryGrid: React.FC<ResearchSummaryGridProps> = ({
  recommendationAction,
  recommendationScore,
  rsiValue,
  rsiStatus,
  buyZonePrice,
  buyZoneDistancePct,
  sellZonePrice,
  sellZoneDistancePct,
  riskRewardRatio,
  trendStatus,
  institutionalAccumulation,
}) => {
  const isBuy = recommendationAction === 'BUY';
  const isHold = recommendationAction === 'HOLD';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-1 select-none">
      {/* Card 1: Recommendation */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Recommendation</span>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-black px-2.5 py-0.5 rounded uppercase shadow-2xs ${
            isBuy ? 'bg-emerald-600 text-white' : isHold ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
          }`}>
            {recommendationAction || 'HOLD'}
          </span>
          <span className="text-base font-black text-slate-900">{recommendationScore}</span>
        </div>
      </div>

      {/* Card 2: RSI */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">RSI (14)</span>
        <div className="flex items-center space-x-2">
          <span className="text-base font-black text-purple-700">{rsiValue.toFixed(1)}</span>
          <span className={`text-xs font-black px-2 py-0.5 rounded uppercase ${
            rsiValue >= 70 ? 'bg-rose-100 text-rose-800' : rsiValue <= 30 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
          }`}>
            {rsiStatus || 'Neutral'}
          </span>
        </div>
      </div>

      {/* Card 3: Nearest Buy Zone */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Nearest Buy Zone</span>
        <div className="flex items-center space-x-2">
          <span className="text-base font-black text-emerald-600">₹{buyZonePrice.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
          <span className="text-xs font-bold text-slate-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
            Distance {buyZoneDistancePct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Card 4: Nearest Sell Zone */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Nearest Sell Zone</span>
        <div className="flex items-center space-x-2">
          <span className="text-base font-black text-rose-600">₹{sellZonePrice.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
          <span className="text-xs font-bold text-slate-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
            Distance {sellZoneDistancePct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Card 5: Risk Reward */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Risk Reward</span>
        <span className="text-base font-black text-blue-700 bg-blue-50 px-3 py-0.5 rounded-lg border border-blue-200/60">
          {riskRewardRatio || '1 : 2.5'}
        </span>
      </div>

      {/* Card 6: Trend */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Trend & Structure</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-black text-slate-900">{trendStatus || 'Bullish'}</span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[150px]">
            {institutionalAccumulation || 'Accumulation Zone'}
          </span>
        </div>
      </div>
    </div>
  );
};
