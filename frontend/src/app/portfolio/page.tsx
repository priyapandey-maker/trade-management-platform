'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';

export default function PortfolioPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [summary, setSummary] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio');
      setPositions(res.data.positions?.all || []);
      setSummary(res.data.summary || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch portfolio valuations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();

    const handleRefresh = () => fetchPortfolioData();
    window.addEventListener('shree_manual_refresh', handleRefresh);
    return () => window.removeEventListener('shree_manual_refresh', handleRefresh);
  }, [fetchPortfolioData]);

  const openPositions = positions.filter((p) => p.status === 'OPEN');
  const closedPositions = positions.filter((p) => p.status === 'CLOSED');

  // Breakdown metrics
  const largestPosition = [...openPositions].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))[0];
  const highestProfitPos = [...openPositions].sort((a, b) => (b.profitLoss || 0) - (a.profitLoss || 0))[0];
  const highestLossPos = [...openPositions].sort((a, b) => (a.profitLoss || 0) - (b.profitLoss || 0))[0];

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 900, color: textCol, margin: 0 }}>Portfolio Valuation Dashboard</h1>
        <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
          Comprehensive 14-point KPI valuation audit, active holdings CMP breakdown, and risk metrics.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: subTextCol }}>Loading Portfolio valuations...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* 14 KPI CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* 1 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Portfolio Value</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '6px' }}>₹{summary?.totalPortfolioValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            {/* 2 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Investment</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '6px' }}>₹{summary?.totalInvestment?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            {/* 3 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Portfolio P&amp;L</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: (summary?.currentPortfolioProfitLoss || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
                {(summary?.currentPortfolioProfitLoss || 0) >= 0 ? '+' : ''}₹{summary?.currentPortfolioProfitLoss?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            {/* 4 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Realized Profit</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: (summary?.realizedProfit || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
                {(summary?.realizedProfit || 0) >= 0 ? '+' : ''}₹{summary?.realizedProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            {/* 5 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Unrealized Profit</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: (summary?.unrealizedProfit || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
                {(summary?.unrealizedProfit || 0) >= 0 ? '+' : ''}₹{summary?.unrealizedProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            {/* 6 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Open Positions</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#2563EB', marginTop: '6px' }}>{summary?.totalOpenPositions || 0}</div>
            </div>
            {/* 7 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Closed Positions</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{summary?.totalClosedPositions || 0}</div>
            </div>
            {/* 8 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Win Rate</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>{summary?.winRate?.toFixed(1) || '0.0'}%</div>
            </div>
            {/* 9 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Average Return</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: (summary?.avgReturn || 0) >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
                {(summary?.avgReturn || 0) >= 0 ? '+' : ''}{summary?.avgReturn?.toFixed(2) || '0.00'}%
              </div>
            </div>
            {/* 10 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Best Trade</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#16A34A', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🚀 {summary?.bestPerformingTrade ? `${summary.bestPerformingTrade.symbol} (+${summary.bestPerformingTrade.profitLossPct.toFixed(1)}%)` : '—'}
              </div>
            </div>
            {/* 11 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Worst Trade</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#DC2626', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ⚠️ {summary?.worstPerformingTrade ? `${summary.worstPerformingTrade.symbol} (${summary.worstPerformingTrade.profitLossPct.toFixed(1)}%)` : '—'}
              </div>
            </div>
            {/* 12 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Avg Holding Period</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{summary?.avgHoldingPeriod?.toFixed(1) || '0.0'} Days</div>
            </div>
            {/* 13 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Capital Deployed</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '6px' }}>₹{summary?.totalCapitalDeployed?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
            {/* 14 */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Available Cash</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>₹{summary?.availableCashBalance?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
          </div>

          {/* BREAKDOWN CARDS (Largest, Highest Profit, Highest Loss) */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol }}>💼 LARGEST POSITION</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{largestPosition ? largestPosition.symbol : '—'}</div>
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px', fontWeight: 700 }}>
                {largestPosition ? `₹${largestPosition.currentValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'No open holdings'}
              </div>
            </div>

            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol }}>🏆 HIGHEST PROFIT POSITION</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>{highestProfitPos ? highestProfitPos.symbol : '—'}</div>
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px', fontWeight: 700 }}>
                {highestProfitPos ? `+₹${highestProfitPos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (+${highestProfitPos.profitLossPct?.toFixed(1)}%)` : '—'}
              </div>
            </div>

            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol }}>⚠️ HIGHEST LOSS POSITION</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#DC2626', marginTop: '6px' }}>{highestLossPos ? highestLossPos.symbol : '—'}</div>
              <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', fontWeight: 700 }}>
                {highestLossPos ? `₹${highestLossPos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${highestLossPos.profitLossPct?.toFixed(1)}%)` : '—'}
              </div>
            </div>
          </div>

          {/* ACTIVE HOLDINGS SUMMARY TABLE WITH CMP */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 900, color: textCol }}>⚡ Active Portfolio Holdings Breakdown</h3>
            {openPositions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: subTextCol, fontStyle: 'italic' }}>No active holdings.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderCol}`, textAlign: 'left', color: subTextCol }}>
                      <th style={{ padding: '10px' }}>Symbol</th>
                      <th style={{ padding: '10px' }}>Company</th>
                      <th style={{ padding: '10px' }}>Qty</th>
                      <th style={{ padding: '10px' }}>Buy Price</th>
                      <th style={{ padding: '10px' }}>CMP</th>
                      <th style={{ padding: '10px' }}>Invested Value</th>
                      <th style={{ padding: '10px' }}>Current Value</th>
                      <th style={{ padding: '10px' }}>Live P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((pos) => {
                      const isProfit = pos.profitLoss >= 0;
                      return (
                        <tr key={pos.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }}>{pos.symbol}</td>
                          <td style={{ padding: '12px 10px', color: subTextCol }}>{pos.company}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>{pos.quantity}</td>
                          <td style={{ padding: '12px 10px' }}>₹{pos.buyPrice?.toFixed(2)}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }}>₹{pos.currentPrice?.toFixed(2)}</td>
                          <td style={{ padding: '12px 10px' }}>₹{pos.investedAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                          <td style={{ padding: '12px 10px' }}>₹{pos.currentValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626' }}>
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
