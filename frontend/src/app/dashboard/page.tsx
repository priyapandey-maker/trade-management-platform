'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
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

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio');
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
  const openPositions = data?.positions?.open || [];
  const closedPositions = data?.positions?.closed || [];

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

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
            🖥️ Trading Desk
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
                  <div style={{ fontSize: '26px', fontWeight: 900, color: textCol, marginTop: '6px' }}>₹{(summary.totalPortfolioValue || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, marginTop: '4px' }}>Active Capital Value</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Unrealized Live P&amp;L</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: (summary.currentPortfolioProfitLoss || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
                    {(summary.currentPortfolioProfitLoss || 0) >= 0 ? '+' : ''}₹{(summary.currentPortfolioProfitLoss || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
                    {(summary.realizedProfit || 0) >= 0 ? '+' : ''}₹{(summary.realizedProfit || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: subTextCol, marginTop: '4px' }}>Win Rate: {(summary.winRate || 0).toFixed(1)}%</div>
                </div>
              </div>

              {/* Middle Section: Best/Worst Performers & Recent Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                
                {/* Top Movers Breakdown */}
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: textCol, margin: '0 0 16px 0' }}>🏆 Top &amp; Worst Performers</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {summary.bestPerformingTrade ? (
                      <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC', border: `1px solid ${borderCol}` }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase' }}>Top Performer</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: textCol, marginTop: '4px' }}>
                          {summary.bestPerformingTrade.company} ({summary.bestPerformingTrade.symbol})
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
                          <span style={{ color: '#16A34A', fontWeight: 900 }}>+{summary.bestPerformingTrade.profitLossPct.toFixed(2)}%</span>
                          <span style={{ fontWeight: 700, color: textCol }}>+₹{summary.bestPerformingTrade.profitLoss.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: subTextCol }}>No trade data</div>
                    )}

                    {summary.worstPerformingTrade ? (
                      <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC', border: `1px solid ${borderCol}` }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>Lowest Performer</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: textCol, marginTop: '4px' }}>
                          {summary.worstPerformingTrade.company} ({summary.worstPerformingTrade.symbol})
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
                          <span style={{ color: summary.worstPerformingTrade.profitLossPct >= 0 ? '#16A34A' : '#DC2626', fontWeight: 900 }}>
                            {summary.worstPerformingTrade.profitLossPct.toFixed(2)}%
                          </span>
                          <span style={{ fontWeight: 700, color: textCol }}>
                            ₹{summary.worstPerformingTrade.profitLoss.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: subTextCol }}>No trade data</div>
                    )}
                  </div>
                </div>

                {/* Recent Activity Table */}
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: textCol, margin: '0 0 16px 0' }}>📋 Recent Position Activity</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {openPositions.slice(0, 4).map((p: any) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC', border: `1px solid ${borderCol}`, fontSize: '13px' }}>
                        <div>
                          <strong style={{ color: textCol }}>{p.symbol}</strong>
                          <span style={{ marginLeft: '8px', color: subTextCol, fontSize: '12px' }}>{p.company}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: p.profitLoss >= 0 ? '#16A34A' : '#DC2626' }}>
                            {p.profitLoss >= 0 ? '+' : ''}₹{p.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
          {/* OPTION 2: TRADING DESK (Dealing Desk Layout) */}
          {/* ========================================================================= */}
          {layoutOption === 'OPTION_2' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Top Desk Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Capital Deployed</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>₹{(summary.totalCapitalDeployed || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Total Exposure Deployed</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Available Cash Balance</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>₹{(summary.availableCashBalance || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Unallocated Capital</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Average Holding Period</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{(summary.avgHoldingPeriod || 0).toFixed(1)} Days</div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Turnover Speed</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Desk Win Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>{(summary.winRate || 0).toFixed(1)}%</div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Closed Success Ratio</div>
                </div>
              </div>

              {/* Active Trading Desk Positions Grid */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: textCol, margin: '0 0 16px 0' }}>⚡ Active Dealing Desk Positions</h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${borderCol}`, color: subTextCol, textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Symbol</th>
                        <th style={{ padding: '10px' }}>Type</th>
                        <th style={{ padding: '10px' }}>Qty</th>
                        <th style={{ padding: '10px' }}>Buy Price</th>
                        <th style={{ padding: '10px' }}>CMP</th>
                        <th style={{ padding: '10px' }}>Target</th>
                        <th style={{ padding: '10px' }}>Stop Loss</th>
                        <th style={{ padding: '10px' }}>Live P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openPositions.map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: '10px', fontWeight: 800, color: textCol }}>{p.symbol}</td>
                          <td style={{ padding: '10px', fontWeight: 700, color: p.tradeType === 'BUY' ? '#16A34A' : '#DC2626' }}>{p.tradeType}</td>
                          <td style={{ padding: '10px', color: textCol }}>{p.quantity}</td>
                          <td style={{ padding: '10px', color: textCol }}>₹{p.buyPrice}</td>
                          <td style={{ padding: '10px', fontWeight: 800, color: '#16A34A' }}>₹{p.currentPrice}</td>
                          <td style={{ padding: '10px', color: '#16A34A' }}>{p.targetPrice ? `₹${p.targetPrice}` : '-'}</td>
                          <td style={{ padding: '10px', color: '#DC2626' }}>{p.stopLoss ? `₹${p.stopLoss}` : '-'}</td>
                          <td style={{ padding: '10px', fontWeight: 800, color: p.profitLoss >= 0 ? '#16A34A' : '#DC2626' }}>
                            {p.profitLoss >= 0 ? '+' : ''}₹{p.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({p.profitLossPct.toFixed(2)}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
                  <div style={{ fontSize: '38px', fontWeight: 900, color: textCol, marginTop: '10px' }}>₹{(summary.totalPortfolioValue || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '13px', color: '#16A34A', fontWeight: 700, marginTop: '6px' }}>Net Institutional Assets</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '28px', borderRadius: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Unrealized Return</div>
                  <div style={{ fontSize: '38px', fontWeight: 900, color: (summary.currentPortfolioProfitLoss || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '10px' }}>
                    {(summary.currentPortfolioProfitLoss || 0) >= 0 ? '+' : ''}₹{(summary.currentPortfolioProfitLoss || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '13px', color: subTextCol, marginTop: '6px' }}>Current Market Gain</div>
                </div>

                <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '28px', borderRadius: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Realized Return</div>
                  <div style={{ fontSize: '38px', fontWeight: 900, color: (summary.realizedProfit || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '10px' }}>
                    {(summary.realizedProfit || 0) >= 0 ? '+' : ''}₹{(summary.realizedProfit || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
                      <strong style={{ color: textCol }}>₹{(summary.totalCapitalDeployed || 0).toLocaleString('en-IN')}</strong>
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
                      <strong style={{ color: '#16A34A' }}>{(summary.winRate || 0).toFixed(1)}%</strong>
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
