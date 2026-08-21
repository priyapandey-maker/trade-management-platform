'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart, ShieldCheck, Activity, ArrowUpRight } from 'lucide-react';

/* ─────────────────────────────────────────────
   Illustrative Financial Preview Datasets
───────────────────────────────────────────── */
const performanceDataMap: Record<string, { time: string; equity: number; benchmark: number }[]> = {
  '1D': [
    { time: '09:15', equity: 12400000, benchmark: 12400000 },
    { time: '09:45', equity: 12380000, benchmark: 12395000 },
    { time: '10:15', equity: 12415000, benchmark: 12402000 },
    { time: '10:45', equity: 12395000, benchmark: 12410000 },
    { time: '11:15', equity: 12440000, benchmark: 12420000 },
    { time: '11:45', equity: 12415000, benchmark: 12415000 },
    { time: '12:15', equity: 12435000, benchmark: 12405000 },
    { time: '12:45', equity: 12420000, benchmark: 12412000 },
    { time: '13:15', equity: 12470000, benchmark: 12425000 },
    { time: '13:45', equity: 12455000, benchmark: 12420000 },
    { time: '14:15', equity: 12495000, benchmark: 12435000 },
    { time: '14:45', equity: 12460000, benchmark: 12428000 },
    { time: '15:15', equity: 12510000, benchmark: 12445000 },
    { time: '15:30', equity: 12485000, benchmark: 12440000 },
  ],
  '1W': [
    { time: 'Mon AM', equity: 12100000, benchmark: 12100000 },
    { time: 'Mon PM', equity: 12140000, benchmark: 12115000 },
    { time: 'Tue AM', equity: 12080000, benchmark: 12105000 },
    { time: 'Tue PM', equity: 12220000, benchmark: 12150000 },
    { time: 'Wed AM', equity: 12150000, benchmark: 12140000 },
    { time: 'Wed PM', equity: 12180000, benchmark: 12190000 },
    { time: 'Thu AM', equity: 12290000, benchmark: 12220000 },
    { time: 'Thu PM', equity: 12350000, benchmark: 12240000 },
    { time: 'Fri AM', equity: 12310000, benchmark: 12260000 },
    { time: 'Fri PM', equity: 12485000, benchmark: 12290000 },
  ],
  '1M': [
    { time: '1st', equity: 11800000, benchmark: 11800000 },
    { time: '3rd', equity: 11760000, benchmark: 11790000 },
    { time: '6th', equity: 11880000, benchmark: 11820000 },
    { time: '9th', equity: 11840000, benchmark: 11850000 },
    { time: '12th', equity: 11950000, benchmark: 11880000 },
    { time: '15th', equity: 11910000, benchmark: 11920000 },
    { time: '18th', equity: 12050000, benchmark: 11950000 },
    { time: '21st', equity: 12150000, benchmark: 11990000 },
    { time: '24th', equity: 12090000, benchmark: 11970000 },
    { time: '27th', equity: 12280000, benchmark: 12020000 },
    { time: '30th', equity: 12485000, benchmark: 12050000 },
  ],
  '3M': [
    { time: 'W1', equity: 11200000, benchmark: 11200000 },
    { time: 'W2', equity: 11150000, benchmark: 11180000 },
    { time: 'W3', equity: 11350000, benchmark: 11250000 },
    { time: 'W4', equity: 11280000, benchmark: 11300000 },
    { time: 'W5', equity: 11490000, benchmark: 11380000 },
    { time: 'W6', equity: 11600000, benchmark: 11450000 },
    { time: 'W7', equity: 11520000, benchmark: 11480000 },
    { time: 'W8', equity: 11750000, benchmark: 11500000 },
    { time: 'W9', equity: 11690000, benchmark: 11550000 },
    { time: 'W10', equity: 11980000, benchmark: 11650000 },
    { time: 'W11', equity: 12250000, benchmark: 11780000 },
    { time: 'W12', equity: 12150000, benchmark: 11800000 },
    { time: 'W13', equity: 12485000, benchmark: 11850000 },
  ],
  '1Y': [
    { time: 'Jan', equity: 10000000, benchmark: 10000000 },
    { time: 'Feb', equity: 9850000, benchmark: 9950000 },
    { time: 'Mar', equity: 10250000, benchmark: 10100000 },
    { time: 'Apr', equity: 10180000, benchmark: 10150000 },
    { time: 'May', equity: 10600000, benchmark: 10300000 },
    { time: 'Jun', equity: 10700000, benchmark: 10400000 },
    { time: 'Jul', equity: 10550000, benchmark: 10450000 },
    { time: 'Aug', equity: 11150000, benchmark: 10600000 },
    { time: 'Sep', equity: 11500000, benchmark: 10900000 },
    { time: 'Oct', equity: 11380000, benchmark: 10850000 },
    { time: 'Nov', equity: 11950000, benchmark: 11100000 },
    { time: 'Dec', equity: 12485000, benchmark: 11300000 },
  ],
};

const sectorAllocationData = [
  { sector: 'Financials', allocation: 34, capital: '₹42.3 L' },
  { sector: 'Technology', allocation: 28, capital: '₹34.9 L' },
  { sector: 'Energy', allocation: 18, capital: '₹22.4 L' },
  { sector: 'Consumer', allocation: 12, capital: '₹14.9 L' },
  { sector: 'Cash/Debt', allocation: 8, capital: '₹10.0 L' },
];

const topHoldingsData = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', returnPct: 18.4, value: '₹34.12 L' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', returnPct: 14.2, value: '₹18.90 L' },
  { symbol: 'INFY.NS', name: 'Infosys Limited', returnPct: 11.8, value: '₹14.48 L' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', returnPct: 9.6, value: '₹30.04 L' },
];

const tooltipStyle = {
  backgroundColor: '#0b101b',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '12px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  fontFamily: 'var(--font-mono)'
};

/* ─────────────────────────────────────────────
   A. PORTFOLIO PERFORMANCE CHART COMPONENT
───────────────────────────────────────────── */
export const LandingPortfolioPerformance: React.FC<{ isTerminal?: boolean }> = ({ isTerminal }) => {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const chartData = performanceDataMap[timeframe] || performanceDataMap['1M'];

  return (
    <div style={isTerminal ? {
      padding: '24px'
    } : {
      backgroundColor: '#0d121f',
      border: '1px solid #1f2937',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Header & Timeframe Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
            PORTFOLIO VALUATION &amp; BENCHMARK
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
              ₹1.24 Cr
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '100px', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={13} /> +12.45% All-Time
            </span>
          </div>
        </div>

        {/* Timeframe Pills */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#07090e', padding: '3px', borderRadius: '8px', border: '1px solid #1f2937' }}>
          {(['1D', '1W', '1M', '3M', '1Y'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                border: 'none',
                backgroundColor: timeframe === tf ? '#6366f1' : 'transparent',
                color: timeframe === tf ? '#ffffff' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div style={{ height: '240px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="shreePortfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1c2738" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis
              domain={['dataMin - 200000', 'dataMax + 200000']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(val: any, name: any) => [
                `₹${((val || 0) / 100000).toFixed(2)} Lakhs`,
                name === 'equity' ? 'Portfolio Value' : 'NIFTY 50 Index'
              ]}
            />
            <Area type="monotone" dataKey="equity" stroke="#818cf8" strokeWidth={2.5} fill="url(#shreePortfolioGradient)" />
            <Line type="monotone" dataKey="benchmark" stroke="#475569" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '16px', fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#818cf8' }} />
          Portfolio Trajectory
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#475569' }} />
          NIFTY 50 Benchmark
        </span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   B. SECTOR ALLOCATION BAR CHART COMPONENT
───────────────────────────────────────────── */
export const LandingSectorAllocation: React.FC = () => {
  return (
    <div style={{
      backgroundColor: '#0d121f',
      border: '1px solid #1f2937',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
              CAPITAL ALLOCATION
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              Sector Weighting
            </div>
          </div>
          <BarChart3 size={18} style={{ color: '#818cf8' }} />
        </div>

        <div style={{ height: '210px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorAllocationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1c2738" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="sector" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => [`${val || 0}% Allocation`, 'Sector Weight']} />
              <Bar dataKey="allocation" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1f2937', paddingTop: '12px', marginTop: '12px', fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
        <span>Top Sector: Financials (34%)</span>
        <span>Cash Reserve: 8%</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   C. TOP HOLDINGS PERFORMANCE VISUALIZATION
───────────────────────────────────────────── */
export const LandingTopHoldingsVisual: React.FC = () => {
  return (
    <div style={{
      backgroundColor: '#0d121f',
      border: '1px solid #1f2937',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
            TOP ASSET PERFORMERS
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
            Unrealized Asset Returns
          </div>
        </div>
        <TrendingUp size={18} style={{ color: '#10b981' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {topHoldingsData.map((holding) => (
          <div key={holding.symbol} style={{ backgroundColor: '#07090e', border: '1px solid #1f2937', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc' }}>{holding.symbol}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{holding.name} • {holding.value}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '100px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                +{holding.returnPct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
