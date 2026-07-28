'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';

export default function ExecutiveDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [summary, setSummary] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio');
      setPositions(res.data.positions?.all || []);
      setSummary(res.data.summary || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load executive dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Listen for header manual refresh
    const handleRefresh = () => fetchDashboardData();
    window.addEventListener('shree_manual_refresh', handleRefresh);
    return () => window.removeEventListener('shree_manual_refresh', handleRefresh);
  }, [fetchDashboardData]);

  const openPositions = positions.filter((p) => p.status === 'OPEN');
  const closedPositions = positions.filter((p) => p.status === 'CLOSED');

  // Top gainers & losers
  const sortedByReturn = [...positions].sort((a, b) => (b.profitLossPct || 0) - (a.profitLossPct || 0));
  const topGainers = sortedByReturn.filter((p) => (p.profitLossPct || 0) > 0).slice(0, 4);
  const topLosers = [...sortedByReturn].reverse().filter((p) => (p.profitLossPct || 0) < 0).slice(0, 4);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: textCol, margin: 0, letterSpacing: '-0.02em' }}>
            Executive Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0', fontWeight: 500 }}>
            High-level portfolio overview, capital allocation, and market indicators.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: subTextCol, fontWeight: 600 }}>Loading Dashboard...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* SECTION 1: PORTFOLIO SUMMARY */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💼</span> PORTFOLIO SUMMARY
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {/* Card 1 */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Portfolio Value</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: textCol, marginTop: '8px' }}>
                  ₹{summary?.totalPortfolioValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 700, marginTop: '4px' }}>
                  Live Valuation
                </div>
              </div>

              {/* Card 2 */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Investment</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: textCol, marginTop: '8px' }}>
                  ₹{summary?.totalInvestment?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, fontWeight: 500, marginTop: '4px' }}>
                  Active Capital
                </div>
              </div>

              {/* Card 3 */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Available Cash Balance</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#16A34A', marginTop: '8px' }}>
                  ₹{summary?.availableCashBalance?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'}
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, fontWeight: 500, marginTop: '4px' }}>
                  Unallocated Funds
                </div>
              </div>

              {/* Card 4 */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Unrealized P&L</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: (summary?.unrealizedProfit || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '8px' }}>
                  {(summary?.unrealizedProfit || 0) >= 0 ? '+' : ''}₹{summary?.unrealizedProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
                <div style={{ fontSize: '11.5px', color: (summary?.unrealizedProfit || 0) >= 0 ? '#16A34A' : '#DC2626', fontWeight: 700, marginTop: '4px' }}>
                  Open Positions
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: TRADING PERFORMANCE */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊</span> TRADING PERFORMANCE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Active Open Trades</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#2563EB', marginTop: '8px' }}>
                  {summary?.totalOpenPositions || 0}
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>In Market</div>
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Closed Trades</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: textCol, marginTop: '8px' }}>
                  {summary?.totalClosedPositions || 0}
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Realized Exits</div>
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Win Rate</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#16A34A', marginTop: '8px' }}>
                  {summary?.winRate?.toFixed(1) || '0.0'}%
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Target Hit Ratio</div>
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Average Return</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: (summary?.avgReturn || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '8px' }}>
                  {(summary?.avgReturn || 0) >= 0 ? '+' : ''}{summary?.avgReturn?.toFixed(2) || '0.00'}%
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Per Trade Average</div>
              </div>
            </div>
          </div>

          {/* SECTION 3: RISK & CAPITAL */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span> RISK &amp; CAPITAL
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Capital Deployed</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '8px' }}>
                  ₹{summary?.totalCapitalDeployed?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'}
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Historical Volume</div>
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Largest Allocation</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#16A34A', marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {summary?.bestPerformingTrade ? `${summary.bestPerformingTrade.symbol}` : '—'}
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Primary Position</div>
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Avg Holding Period</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '8px' }}>
                  {summary?.avgHoldingPeriod?.toFixed(1) || '0.0'} Days
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Duration Average</div>
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Realized Profit</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: (summary?.realizedProfit || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '8px' }}>
                  {(summary?.realizedProfit || 0) >= 0 ? '+' : ''}₹{summary?.realizedProfit?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'}
                </div>
                <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Closed P&L</div>
              </div>
            </div>
          </div>

          {/* SECTION 4: TODAY'S MARKET & TOP MOVERS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {/* Top Gainers Card */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#16A34A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🚀</span> TOP PERFORMING TRADES
              </div>
              {topGainers.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: subTextCol, fontStyle: 'italic' }}>No positive returns logged yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topGainers.map((pos) => (
                    <div key={pos.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '8px 12px', borderRadius: '6px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
                      <div>
                        <span style={{ fontWeight: 800, color: textCol }}>{pos.symbol}</span>
                        <span style={{ marginLeft: '8px', fontSize: '11.5px', color: subTextCol }}>{pos.company}</span>
                      </div>
                      <div style={{ fontWeight: 800, color: '#16A34A' }}>
                        +{pos.profitLossPct?.toFixed(1)}% (₹{pos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Losers Card */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span> TRADES UNDER PRESSURE
              </div>
              {topLosers.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: subTextCol, fontStyle: 'italic' }}>No negative trades currently recorded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topLosers.map((pos) => (
                    <div key={pos.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '8px 12px', borderRadius: '6px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
                      <div>
                        <span style={{ fontWeight: 800, color: textCol }}>{pos.symbol}</span>
                        <span style={{ marginLeft: '8px', fontSize: '11.5px', color: subTextCol }}>{pos.company}</span>
                      </div>
                      <div style={{ fontWeight: 800, color: '#DC2626' }}>
                        {pos.profitLossPct?.toFixed(1)}% (₹{pos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: RECENT TRADES SUMMARY TABLE */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: textCol, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> RECENT PORTFOLIO POSITIONS
            </div>

            {openPositions.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: subTextCol, fontStyle: 'italic', fontSize: '13px' }}>
                No active positions. Add positions in Open Positions to populate executive dashboard.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderCol}`, textAlign: 'left' }}>
                      <th style={{ padding: '10px', color: subTextCol, fontWeight: 800 }}>Symbol</th>
                      <th style={{ padding: '10px', color: subTextCol, fontWeight: 800 }}>Company Name</th>
                      <th style={{ padding: '10px', color: subTextCol, fontWeight: 800 }}>Type</th>
                      <th style={{ padding: '10px', color: subTextCol, fontWeight: 800 }}>Qty</th>
                      <th style={{ padding: '10px', color: subTextCol, fontWeight: 800 }}>Buy Price</th>
                      <th style={{ padding: '10px', color: subTextCol, fontWeight: 800 }}>CMP</th>
                      <th style={{ padding: '10px', color: subTextCol, fontWeight: 800 }}>Current Value</th>
                      <th style={{ padding: '10px', color: subTextCol, fontWeight: 800 }}>Live P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.slice(0, 5).map((pos) => {
                      const isProfit = pos.profitLoss >= 0;
                      return (
                        <tr key={pos.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }}>{pos.symbol}</td>
                          <td style={{ padding: '12px 10px', color: subTextCol }}>{pos.company}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 700 }}>{pos.tradeType}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>{pos.quantity}</td>
                          <td style={{ padding: '12px 10px' }}>₹{pos.buyPrice?.toFixed(2)}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 700 }}>₹{pos.currentPrice?.toFixed(2)}</td>
                          <td style={{ padding: '12px 10px' }}>₹{pos.currentValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: isProfit ? '#16A34A' : '#DC2626' }}>
                            {isProfit ? '+' : ''}₹{pos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isProfit ? '+' : ''}{pos.profitLossPct?.toFixed(1)}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
