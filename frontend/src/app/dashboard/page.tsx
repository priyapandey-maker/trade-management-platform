'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  RadialBarChart, RadialBar, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Switchable Dashboard Layout Option: 'OPTION_1' | 'OPTION_2' | 'OPTION_3'
  const [layoutOption, setLayoutOption] = useState<'OPTION_1' | 'OPTION_2' | 'OPTION_3'>('OPTION_1');

  // Performer Widget Index
  const [performerIndex, setPerformerIndex] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio/dashboard');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch executive dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const summary = data?.summary || {};
  const performers = data?.performers || [];
  const recentPositions = data?.recentPositions || [];

  useEffect(() => {
    if (performers.length === 0) return;
    const interval = setInterval(() => {
      setPerformerIndex((prev) => (prev + 1) % performers.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [performers.length]);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

  const chartThemeColor = '#16A34A';
  const chartAltColor = '#2563EB';
  const COLORS = ['#2563EB', '#10B981', '#64748B', '#0D9488', '#7C3AED', '#EA580C'];

  const lineData = data?.charts?.line || [];
  const barData = data?.charts?.bar || [];
  const pieData = data?.charts?.pie || [];
  const stackedData = data?.charts?.stacked || [];
  const areaData = data?.charts?.area || [];
  const radialData = data?.charts?.radial || [];
  const heatmapData = data?.charts?.heatmap || [];
  const histogramBins = data?.charts?.histogram || [
    { range: '0-5d', count: 0 },
    { range: '6-15d', count: 0 },
    { range: '16-30d', count: 0 },
    { range: '31d+', count: 0 },
  ];

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Executive Header & Layout Option Switcher */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 900, color: textCol, margin: 0 }}>Executive Dashboard</h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
            High-level executive overview, institutional risk metrics, and presentation views.
          </p>
        </div>

        {/* 3 Layout Option Selector */}
        <div style={{ backgroundColor: isDark ? '#0F172A' : '#F1F5F9', border: `1px solid ${borderCol}`, borderRadius: '10px', padding: '4px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '4px', width: isMobile ? '100%' : 'auto' }}>
          <button
            onClick={() => setLayoutOption('OPTION_1')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: layoutOption === 'OPTION_1' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
              color: layoutOption === 'OPTION_1' ? '#16A34A' : subTextCol,
              fontWeight: layoutOption === 'OPTION_1' ? 800 : 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: layoutOption === 'OPTION_1' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            🏛️ Executive Summary
          </button>

          <button
            onClick={() => setLayoutOption('OPTION_2')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: layoutOption === 'OPTION_2' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
              color: layoutOption === 'OPTION_2' ? '#16A34A' : subTextCol,
              fontWeight: layoutOption === 'OPTION_2' ? 800 : 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: layoutOption === 'OPTION_2' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            🖥️ Trading Desk (Charts)
          </button>

          <button
            onClick={() => setLayoutOption('OPTION_3')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: layoutOption === 'OPTION_3' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
              color: layoutOption === 'OPTION_3' ? '#16A34A' : subTextCol,
              fontWeight: layoutOption === 'OPTION_3' ? 800 : 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: layoutOption === 'OPTION_3' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            👔 Client Presentation
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && !data ? (
        <div style={{ padding: '60px', textAlign: 'center', color: subTextCol }}>Loading executive overview...</div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* OPTION 1: EXECUTIVE SUMMARY (Bloomberg Terminal Style) */}
          {/* ========================================================================= */}
          {layoutOption === 'OPTION_1' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Top Executive KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Portfolio Valuation</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: textCol, marginTop: '6px' }}>
                    ₹{(summary.totalPortfolioValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, marginTop: '4px' }}>Active Capital Value</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Unrealized Live P&amp;L</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: (summary.currentPortfolioProfitLoss || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
                    {(summary.currentPortfolioProfitLoss || 0) >= 0 ? '+' : ''}₹{(summary.currentPortfolioProfitLoss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: subTextCol, marginTop: '4px' }}>Current Market Gain/Loss</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Active Open Trades</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{summary.totalOpenPositions || 0}</div>
                  <div style={{ fontSize: '12px', color: subTextCol, marginTop: '4px' }}>{summary.totalClosedPositions || 0} Closed Historical</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Realized Closed P&amp;L</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: (summary.realizedProfit || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
                    {(summary.realizedProfit || 0) >= 0 ? '+' : ''}₹{(summary.realizedProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: subTextCol, marginTop: '4px' }}>Win Rate: {(summary.winRate || 0).toFixed(2)}%</div>
                </div>
              </div>

              {/* Middle Section: Rotating Performer Widget & Recent Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                
                {/* Rotating Performer Card */}
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '12px', overflow: 'hidden', minHeight: '180px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: textCol, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📊 Portfolio Performer Rotation
                  </h3>
                  
                  {performers.length > 0 && performers[performerIndex] ? (
                    <div key={performerIndex} className="animate-fade-slide" style={{ padding: '16px', borderRadius: '8px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC', border: `1px solid ${borderCol}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: performers[performerIndex].color, textTransform: 'uppercase' }}>
                          {performers[performerIndex].label}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: textCol }}>
                          {performers[performerIndex].data.symbol}
                        </span>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: textCol, marginTop: '8px' }}>
                        {performers[performerIndex].data.company}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: performers[performerIndex].color }}>
                          {performers[performerIndex].data.profitLossPct >= 0 ? '+' : ''}{performers[performerIndex].data.profitLossPct.toFixed(2)}%
                        </span>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: subTextCol }}>
                          {performers[performerIndex].data.profitLoss >= 0 ? '+' : ''}₹{performers[performerIndex].data.profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: subTextCol, fontSize: '13.5px' }}>No positions recorded.</div>
                  )}
                </div>

                {/* Recent Activity Table */}
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: textCol, margin: '0 0 16px 0' }}>📋 Recent Position Activity</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recentPositions.map((p: any) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC', border: `1px solid ${borderCol}`, fontSize: '13px' }}>
                        <div>
                          <strong style={{ color: textCol }}>{p.symbol}</strong>
                          <span style={{ marginLeft: '8px', color: subTextCol, fontSize: '12px' }}>{p.company}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: p.profitLoss >= 0 ? '#16A34A' : '#DC2626' }}>
                            {p.profitLoss >= 0 ? '+' : ''}₹{p.profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '11px', color: subTextCol }}>{p.holdingPeriod} Days Active</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 2: TRADING DESK (Dealing Desk Layout with Recharts) */}
          {/* ========================================================================= */}
          {layoutOption === 'OPTION_2' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Top Desk Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Capital Deployed</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>
                    ₹{(summary.totalCapitalDeployed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Total Exposure Deployed</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Available Cash Balance</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>
                    ₹{(summary.availableCashBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Unallocated Capital</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Average Holding Period</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{(summary.avgHoldingPeriod || 0).toFixed(1)} Days</div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Turnover Speed</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Desk Win Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>{(summary.winRate || 0).toFixed(2)}%</div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Closed Success Ratio</div>
                </div>
              </div>

              {/* 8 Charts Grid */}
              {mounted && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
                  
                  {/* 1. Line Chart: Live CMP vs Buy Price */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '320px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>📈 LINE CHART: Buy Price vs CMP</h4>
                    {lineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="88%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
                          <XAxis dataKey="symbol" stroke={subTextCol} fontSize={10} />
                          <YAxis stroke={subTextCol} fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                          <Line type="monotone" dataKey="BuyPrice" stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="CMP" stroke="#10b981" strokeWidth={2.5} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol }}>No open positions</div>
                    )}
                  </div>

                  {/* 2. Bar Chart: Realized P&L by Symbol */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '320px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>📊 BAR CHART: Realized P&amp;L</h4>
                    {barData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="88%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
                          <XAxis dataKey="symbol" stroke={subTextCol} fontSize={10} />
                          <YAxis stroke={subTextCol} fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                          <Bar dataKey="PnL" fill={chartThemeColor}>
                            {barData.map((entry: any, idx: number) => (
                              <Cell key={`cell-${idx}`} fill={entry.PnL >= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol }}>No closed positions</div>
                    )}
                  </div>

                  {/* 3. Pie Chart: Capital Allocation Share */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '320px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>🍕 PIE CHART: Portfolio Composition</h4>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="88%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry: any, idx: number) => (
                              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => value ? `₹${value.toLocaleString('en-IN')}` : ''} contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol }}>No open positions</div>
                    )}
                  </div>

                  {/* 4. Stacked Bar Chart: Deployed vs Current value */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '320px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>🗄️ STACKED BAR: Invested vs Current value</h4>
                    {stackedData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="88%">
                        <BarChart data={stackedData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
                          <XAxis dataKey="symbol" stroke={subTextCol} fontSize={10} />
                          <YAxis stroke={subTextCol} fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                          <Bar dataKey="Invested" stackId="a" fill="#3b82f6" />
                          <Bar dataKey="Value" stackId="a" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol }}>No open positions</div>
                    )}
                  </div>

                  {/* 5. Area Chart: Cumulative Realized Returns */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '320px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>🏔️ AREA CHART: Cumulative Realized Gain</h4>
                    {areaData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="88%">
                        <AreaChart data={areaData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
                          <XAxis dataKey="date" stroke={subTextCol} fontSize={10} />
                          <YAxis stroke={subTextCol} fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                          <Area type="monotone" dataKey="Gain" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol }}>No closed trades to map trend</div>
                    )}
                  </div>

                  {/* 6. Radial Bar Chart: Investor Capital Managed */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '320px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>🎯 RADIAL BAR: Investor Capital Share</h4>
                    {radialData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="88%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={10} data={radialData}>
                          <RadialBar background dataKey="uv" />
                          <Tooltip formatter={(value: any) => value ? `₹${value.toLocaleString('en-IN')}` : ''} contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol }}>No investor share recorded</div>
                    )}
                  </div>

                  {/* 7. Heatmap Grid: Asset Risk Distribution Grid */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '320px', overflow: 'hidden' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>🌶️ PERFORMANCE HEATMAP: Active Assets</h4>
                    {heatmapData.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', height: '80%', overflowY: 'auto', padding: '5px' }}>
                        {heatmapData.map((h: any) => {
                          const isProfit = h.pct >= 0;
                          const bg = isProfit
                            ? `rgba(16, 185, 129, ${Math.min(1, 0.15 + Math.abs(h.pct) / 20)})`
                            : `rgba(239, 68, 68, ${Math.min(1, 0.15 + Math.abs(h.pct) / 20)})`;
                          const col = isProfit ? '#10b981' : '#ef4444';
                          return (
                            <div
                              key={h.symbol}
                              style={{
                                backgroundColor: bg,
                                border: `1.5px solid ${col}`,
                                borderRadius: '8px',
                                padding: '12px 8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                              }}
                              title={`${h.symbol}: ${h.pct.toFixed(2)}% (₹${h.val.toLocaleString('en-IN')})`}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <div style={{ fontSize: '12.5px', fontWeight: 900, color: textCol }}>{h.symbol}</div>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: textCol, marginTop: '4px' }}>
                                {isProfit ? '+' : ''}{h.pct.toFixed(1)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol }}>No open assets</div>
                    )}
                  </div>

                  {/* 8. Histogram: Holding Period Distribution */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '320px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>🧱 HISTOGRAM: Closed Holding Duration Bins</h4>
                    {histogramBins.some((b: any) => b.count > 0) ? (
                      <ResponsiveContainer width="100%" height="88%">
                        <BarChart data={histogramBins}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
                          <XAxis dataKey="range" stroke={subTextCol} fontSize={10} />
                          <YAxis stroke={subTextCol} fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol }}>No closed positions to map frequency</div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 3: CLIENT PRESENTATION (Minimal, Elegant Executive View) */}
          {/* ========================================================================= */}
          {layoutOption === 'OPTION_3' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Giant Minimalist KPI Header Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '28px', borderRadius: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total Portfolio Value</div>
                  <div style={{ fontSize: '38px', fontWeight: 900, color: textCol, marginTop: '10px' }}>
                    ₹{(summary.totalPortfolioValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '13px', color: '#16A34A', fontWeight: 700, marginTop: '6px' }}>Net Institutional Assets</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '28px', borderRadius: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Unrealized Return</div>
                  <div style={{ fontSize: '38px', fontWeight: 900, color: (summary.currentPortfolioProfitLoss || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '10px' }}>
                    {(summary.currentPortfolioProfitLoss || 0) >= 0 ? '+' : ''}₹{(summary.currentPortfolioProfitLoss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '13px', color: subTextCol, marginTop: '6px' }}>Current Market Gain</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '28px', borderRadius: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Realized Return</div>
                  <div style={{ fontSize: '38px', fontWeight: 900, color: (summary.realizedProfit || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '10px' }}>
                    {(summary.realizedProfit || 0) >= 0 ? '+' : ''}₹{(summary.realizedProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '13px', color: subTextCol, marginTop: '6px' }}>Historical Booked Gain</div>
                </div>
              </div>

              {/* Clean Executive Summary Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: textCol, margin: '0 0 16px 0' }}>💼 Portfolio Composition</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${borderCol}` }}>
                      <span style={{ color: subTextCol }}>Total Capital Deployed</span>
                      <strong style={{ color: textCol }}>
                        ₹{(summary.totalCapitalDeployed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${borderCol}` }}>
                      <span style={{ color: subTextCol }}>Active Open Trades</span>
                      <strong style={{ color: textCol }}>{summary.totalOpenPositions || 0} Positions</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                      <span style={{ color: subTextCol }}>Closed Historical Trades</span>
                      <strong style={{ color: textCol }}>{summary.totalClosedPositions || 0} Positions</strong>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: textCol, margin: '0 0 16px 0' }}>📊 Performance Analytics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${borderCol}` }}>
                      <span style={{ color: subTextCol }}>Closed Win Rate</span>
                      <strong style={{ color: '#16A34A' }}>{(summary.winRate || 0).toFixed(2)}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${borderCol}` }}>
                      <span style={{ color: subTextCol }}>Average Trade Return</span>
                      <strong style={{ color: (summary.avgReturn || 0) >= 0 ? '#16A34A' : '#DC2626' }}>
                        {(summary.avgReturn || 0) >= 0 ? '+' : ''}{(summary.avgReturn || 0).toFixed(2)}%
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                      <span style={{ color: subTextCol }}>Average Holding Period</span>
                      <strong style={{ color: textCol }}>{(summary.avgHoldingPeriod || 0).toFixed(1)} Days</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}
