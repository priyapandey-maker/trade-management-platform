'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';

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

  const fetchInvestorsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio');
      setInvestors(res.data.investors || []);
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
    '#64748B', // Slate
    '#0D9488', // Teal
    '#7C3AED', // Violet
    '#EA580C', // Orange
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
          className="btnSecondary"
          style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px', cursor: 'pointer' }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Global AUM Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Assets Under Management (AUM)</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>
            ₹{totalCapitalManaged.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Total Active Deployed Principal</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Current Portfolio Value</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>
            ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Live Portfolio Net Worth</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Net Gain</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: totalNetProfit >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
            {totalNetProfit >= 0 ? '+' : ''}₹{totalNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Realized + Unrealized</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Overall Portfolio ROI</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: overallROI >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
            {overallROI >= 0 ? '+' : ''}{overallROI.toFixed(2)}%
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Average Capital Efficiency</div>
        </div>
      </div>

      {/* Segmented Capital Distribution Bar */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 800, color: textCol, textTransform: 'uppercase', margin: '0 0 14px 0' }}>
          📊 Capital Allocation Share
        </h3>

        {totalCapitalManaged > 0 ? (
          <>
            {/* Segmented bar */}
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
                    title={`${inv.name}: ₹${inv.totalInvestment.toLocaleString('en-IN')} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Allocation Details Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              {investors.map((inv, idx) => {
                const pct = (inv.totalInvestment / totalCapitalManaged) * 100;
                const col = paletteColors[idx % paletteColors.length];
                return (
                  <div key={inv.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: col }} />
                    <span style={{ fontWeight: 700, color: textCol }}>{inv.name}</span>
                    <span style={{ color: subTextCol }}>
                      ₹{inv.totalInvestment.toLocaleString('en-IN')} ({pct.toFixed(1)}%)
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

            return (
              <div
                key={inv.name}
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer',
                  borderTop: `4px solid ${col}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: textCol, margin: 0 }}>{inv.name}</h3>
                    <span style={{ fontSize: '11.5px', color: subTextCol, fontWeight: 700 }}>
                      Portfolio Share: {share.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>ROI</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: inv.roi >= 0 ? '#10B981' : '#EF4444' }}>
                      {inv.roi >= 0 ? '+' : ''}{inv.roi.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${borderCol}`, marginBottom: '16px' }} />

                {/* Key Metrics Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '18px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block' }}>Total Capital Deployed</span>
                    <strong style={{ fontSize: '15px', color: textCol }}>
                      ₹{inv.totalInvestment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block' }}>Current Value</span>
                    <strong style={{ fontSize: '15px', color: textCol }}>
                      ₹{inv.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block' }}>Net Profit/Loss</span>
                    <strong style={{ fontSize: '15px', color: isProfit ? '#10B981' : '#EF4444' }}>
                      {isProfit ? '+' : ''}₹{inv.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, textTransform: 'uppercase', display: 'block' }}>Win Rate (Closed)</span>
                    <strong style={{ fontSize: '15px', color: '#10B981' }}>
                      {inv.winRate.toFixed(1)}%
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
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
