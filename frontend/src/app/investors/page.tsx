'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';
import { User, TrendingUp, TrendingDown, Clock, FileText } from 'lucide-react';
import { formatDecimal } from '@/lib/financial-calculations';

interface InvestorStats {
  name: string;
  totalInvestment: number;
  currentValue: number;
  realizedProfit: number;
  unrealizedProfit: number;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  wins: number;
  netProfit: number;
  roi: number;
  winRate: number;
}

export default function InvestorsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [investors, setInvestors] = useState<InvestorStats[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded investor card state
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchInvestorsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio');
      setInvestors(res.data.investors || []);
      setPositions(res.data.positions?.all || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch investors data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestorsData();
  }, [fetchInvestorsData]);

  const totalCapitalManaged = investors.reduce((sum, inv) => sum + inv.totalInvestment, 0);
  const totalValue = investors.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalNetProfit = investors.reduce((sum, inv) => sum + inv.netProfit, 0);
  const overallROI = totalCapitalManaged > 0 ? (totalNetProfit / totalCapitalManaged) * 100 : 0;

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

  const paletteColors = [
    '#2563EB', // Navy/Blue
    '#10B981', // Emerald
    '#7C3AED', // Violet
    '#EA580C', // Orange
    '#64748B', // Slate
    '#0D9488', // Teal
  ];

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 900, color: textCol, margin: 0 }}>Investors Dashboard</h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
            Overview of total assets under management (AUM), capital allocation shares, and individual investor portfolio matrices.
          </p>
        </div>
        <button
          onClick={fetchInvestorsData}
          style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: cardBg, color: textCol, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Clock size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          {error}
        </div>
      )}

      {/* Global AUM Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Assets Under Management (AUM)</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>
            ₹{formatDecimal(totalCapitalManaged)}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Total Active Deployed Principal</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Current Portfolio Value</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>
            ₹{formatDecimal(totalValue)}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Live Portfolio Net Worth</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Net Gain</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: totalNetProfit >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
            {totalNetProfit >= 0 ? '+' : ''}₹{formatDecimal(totalNetProfit)}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Realized + Unrealized</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Overall Portfolio ROI</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: overallROI >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
            {overallROI >= 0 ? '+' : ''}{formatDecimal(overallROI)}%
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Average Capital Efficiency</div>
        </div>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 800, color: textCol, textTransform: 'uppercase', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Capital Allocation Share
        </h3>

        {totalCapitalManaged > 0 ? (
          <>
            <div style={{ display: 'flex', height: '24px', borderRadius: '8px', overflow: 'hidden', backgroundColor: isDark ? '#1E293B' : '#E2E8F0', marginBottom: '16px' }}>
              {investors.map((inv, idx) => {
                const pct = (inv.totalInvestment / totalCapitalManaged) * 100;
                if (pct <= 0) return null;
                const col = paletteColors[idx % paletteColors.length];
                return (
                  <div
                    key={inv.name}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: col,
                      height: '100%',
                      transition: 'all 0.3s ease',
                    }}
                    title={`${inv.name}: ₹${formatDecimal(inv.totalInvestment)} (${formatDecimal(pct)}%)`}
                  />
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              {investors.map((inv, idx) => {
                const pct = (inv.totalInvestment / totalCapitalManaged) * 100;
                const col = paletteColors[idx % paletteColors.length];
                return (
                  <div key={inv.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: col }} />
                    <span style={{ fontWeight: 700, color: textCol }}>{inv.name}</span>
                    <span style={{ color: subTextCol }}>
                      ₹{formatDecimal(inv.totalInvestment)} ({formatDecimal(pct)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ padding: '10px 0', color: subTextCol, fontSize: '13.5px' }}>
            No capital deployed yet. Create trade positions to see capital allocation charts.
          </div>
        )}
      </div>

      {/* Individual Investor Cards */}
      {loading && investors.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: subTextCol }}>Loading investors dashboard...</div>
      ) : investors.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>👥</div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: textCol, margin: 0 }}>No Investors Found</h3>
          <p style={{ fontSize: '13px', color: subTextCol, marginTop: '4px' }}>
            Deploy some capital and assign an investor name during trade creation to build this dashboard.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
          {investors.map((inv, idx) => {
            const share = totalCapitalManaged > 0 ? (inv.totalInvestment / totalCapitalManaged) * 100 : 0;
            const col = paletteColors[idx % paletteColors.length];
            const isProfit = inv.netProfit >= 0;

            // Compute investor specific portfolio statistics
            const investorPositions = positions.filter((p) => (p.investorName || 'Shree') === inv.name);
            const investorOpenPositions = investorPositions.filter((p) => p.status === 'OPEN');
            const investorClosedPositions = investorPositions.filter((p) => p.status === 'CLOSED');
            
            // 1. Largest Holding
            const largestHolding = [...investorOpenPositions].sort((a, b) => b.currentValue - a.currentValue)[0] || null;
            
            // 2. Average holding period
            const closedWithDuration = investorClosedPositions.filter((p) => p.holdingPeriod !== null);
            const avgHoldingDays = closedWithDuration.length > 0 
              ? closedWithDuration.reduce((acc, p) => acc + p.holdingPeriod, 0) / closedWithDuration.length
              : 0;

            // 3. Sector composition mapping
            const sectorAllocation: Record<string, number> = {};
            investorOpenPositions.forEach((p) => {
              const sec = p.assetType || 'STOCK';
              sectorAllocation[sec] = (sectorAllocation[sec] || 0) + p.investedAmount;
            });

            const isExpanded = expandedInvestor === inv.name;

            return (
              <div
                key={inv.name}
                onClick={() => setExpandedInvestor(isExpanded ? null : inv.name)}
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: isExpanded ? '0 10px 25px -5px rgba(0,0,0,0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  borderTop: `4px solid ${col}`,
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: textCol, margin: 0 }}>
                      {inv.name} {isExpanded ? '▼' : '►'}
                    </h3>
                    <span style={{ fontSize: '11.5px', color: subTextCol, fontWeight: 700 }}>
                      Portfolio Share: {formatDecimal(share)}%
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>ROI</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: inv.roi >= 0 ? '#10B981' : '#EF4444' }}>
                      {inv.roi >= 0 ? '+' : ''}{formatDecimal(inv.roi)}%
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${borderCol}`, marginBottom: '16px' }} />

                {/* Key Metrics Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '18px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block' }}>Total Capital Deployed</span>
                    <strong style={{ fontSize: '15px', color: textCol }}>
                      ₹{formatDecimal(inv.totalInvestment)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block' }}>Current Value</span>
                    <strong style={{ fontSize: '15px', color: textCol }}>
                      ₹{formatDecimal(inv.currentValue)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block' }}>Net Profit/Loss</span>
                    <strong style={{ fontSize: '15px', color: isProfit ? '#10B981' : '#EF4444' }}>
                      {isProfit ? '+' : ''}₹{formatDecimal(inv.netProfit)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block' }}>Win Rate (Closed)</span>
                    <strong style={{ fontSize: '15px', color: '#10B981' }}>
                      {formatDecimal(inv.winRate)}%
                    </strong>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${borderCol}`, marginBottom: '16px' }} />

                {/* Sub-counts row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: subTextCol }}>
                  <span>Active Live Trades: <strong>{inv.openTrades}</strong></span>
                  <span>Closed Trades: <strong>{inv.closedTrades}</strong></span>
                  <span>Total Trades: <strong>{inv.totalTrades}</strong></span>
                </div>

                {/* EXPANDED MINI-PORTFOLIO VIEW */}
                {isExpanded && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ marginTop: '20px', borderTop: `1px solid ${borderCol}`, paddingTop: '16px', cursor: 'default' }}
                  >
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: textCol, margin: '0 0 12px 0', textTransform: 'uppercase' }}>
                      Investor Portfolio breakdown
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: subTextCol, display: 'block', textTransform: 'uppercase' }}>Largest Active Position</span>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: textCol }}>
                          {largestHolding ? `${largestHolding.symbol} (₹${formatDecimal(largestHolding.currentValue)})` : '—'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: subTextCol, display: 'block', textTransform: 'uppercase' }}>Avg Holding Duration</span>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: textCol }}>
                          {avgHoldingDays > 0 ? `${formatDecimal(avgHoldingDays)} Days` : '—'}
                        </span>
                      </div>
                    </div>

                    <h5 style={{ fontSize: '11px', fontWeight: 850, color: subTextCol, margin: '14px 0 8px 0', textTransform: 'uppercase' }}>Sector Distribution</h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                      {Object.entries(sectorAllocation).map(([sec, val]: any) => (
                        <div key={sec} style={{ backgroundColor: isDark ? '#0F172A' : '#F1F5F9', border: `1px solid ${borderCol}`, padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', color: textCol }}>
                          {sec}: <strong>{formatDecimal((val / (inv.totalInvestment || 1)) * 100)}%</strong>
                        </div>
                      ))}
                      {Object.keys(sectorAllocation).length === 0 && <div style={{ fontSize: '12px', color: subTextCol }}>No open assets</div>}
                    </div>

                    <h5 style={{ fontSize: '11px', fontWeight: 850, color: subTextCol, margin: '14px 0 8px 0', textTransform: 'uppercase' }}>Active Holdings Grid</h5>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${borderCol}`, borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${borderCol}`, color: subTextCol }}>
                            <th style={{ padding: '6px 10px' }}>Symbol</th>
                            <th style={{ padding: '6px 10px' }}>Qty</th>
                            <th style={{ padding: '6px 10px' }}>Invested</th>
                            <th style={{ padding: '6px 10px' }}>P&amp;L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {investorOpenPositions.map((p: any) => (
                            <tr key={p.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                              <td style={{ padding: '8px 10px', fontWeight: 800, color: textCol }}>{p.symbol}</td>
                              <td style={{ padding: '8px 10px', color: textCol }}>{p.quantity}</td>
                              <td style={{ padding: '8px 10px', color: textCol }}>₹{formatDecimal(p.investedAmount)}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: p.profitLoss >= 0 ? '#10B981' : '#EF4444' }}>
                                {p.profitLoss >= 0 ? '+' : ''}{formatDecimal(p.profitLossPct)}%
                              </td>
                            </tr>
                          ))}
                          {investorOpenPositions.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: subTextCol }}>No active positions</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
