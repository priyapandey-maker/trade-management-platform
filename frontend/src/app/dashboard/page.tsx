'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';
import { 
  TrendingUp, 
  FileText, 
  Wallet, 
  Briefcase, 
  Layers, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity 
} from 'lucide-react';
import { formatDecimal } from '@/lib/financial-calculations';

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [activeLeaderTab, setActiveLeaderTab] = useState<'best' | 'worst'>('best');

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // React Query fetch - parallel dashboard and portfolio data
  const { data: dashboardAndPortfolio, isLoading, error } = useQuery({
    queryKey: ['dashboardAndPortfolio'],
    queryFn: async () => {
      const [dashRes, portRes] = await Promise.all([
        api.get('/portfolio/dashboard'),
        api.get('/portfolio')
      ]);
      return {
        dashboard: dashRes.data,
        portfolio: portRes.data
      };
    },
    refetchInterval: 30000,
  });

  const dashboardData = dashboardAndPortfolio?.dashboard;
  const portfolioData = dashboardAndPortfolio?.portfolio;

  const summary = dashboardData?.summary || {};
  const openPositions = portfolioData?.positions?.open || [];
  const closedPositions = portfolioData?.positions?.closed || [];

  const cardBg = 'var(--color-surface-1)';
  const borderCol = 'var(--color-border)';
  const textCol = 'var(--color-text-primary)';
  const subTextCol = 'var(--color-text-secondary)';

  // --- SIGN-SAFE FINANCIAL FORMATTERS ---
  const formatAbsoluteCurrency = (val: number, decimals: number = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `₹${formatted}`;
  };

  const formatFinancialValue = (val: number, decimals: number = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `${isNegative ? '-' : '+'}₹${formatted}`;
  };

  const formatPercent = (val: number, decimals: number = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00%';
    const isNegative = val < 0;
    return `${isNegative ? '-' : '+'}${Math.abs(val).toFixed(decimals)}%`;
  };

  // --- CALCULATE TODAY'S PORTFOLIO CHANGE ---
  const todaysChangeVal = openPositions.reduce((sum: number, p: any) => {
    const cp = p.changePercent || 0;
    return sum + (p.currentValue * cp / 100);
  }, 0);
  const todaysChangePct = summary.totalInvestment > 0 ? (todaysChangeVal / summary.totalInvestment) * 100 : 0;

  // --- PERFORMANCE LEADERS DEDUPLICATION ---
  const sortedByPerf = [...openPositions].sort((a: any, b: any) => b.profitLossPct - a.profitLossPct);
  const bestList = sortedByPerf.slice(0, 3);
  const worstListRaw = [...sortedByPerf].reverse().slice(0, 3);
  const bestIds = new Set(bestList.map((p: any) => p.id));
  const worstList = worstListRaw.filter((p: any) => !bestIds.has(p.id));

  // --- PORTFOLIO ALLOCATION NUMERICAL BREAKDOWN (NO PROGRESS BARS) ---
  const totalOpenInvested = openPositions.reduce((sum: number, p: any) => sum + p.investedAmount, 0);
  const allocationData = openPositions.map((p: any) => ({
    symbol: p.symbol,
    company: p.company,
    investedAmount: p.investedAmount,
    percentage: totalOpenInvested > 0 ? (p.investedAmount / totalOpenInvested) * 100 : 0,
  })).sort((a: any, b: any) => b.percentage - a.percentage).slice(0, 5);

  // --- RECENT ACTIVITY ---
  const allPositionsCombined = [
    ...openPositions.map((p: any) => ({ ...p, activityType: 'OPEN' })),
    ...closedPositions.map((p: any) => ({ ...p, activityType: 'CLOSE' }))
  ];
  const sortedActivity = allPositionsCombined.sort((a: any, b: any) => {
    const dateA = new Date(a.activityType === 'CLOSE' ? (a.closedAt || a.entryDate) : a.entryDate).getTime();
    const dateB = new Date(b.activityType === 'CLOSE' ? (b.closedAt || b.entryDate) : b.entryDate).getTime();
    return dateB - dateA;
  }).slice(0, 4);

  // Export PDF Report
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const drawHeader = () => {
      doc.setFillColor(7, 9, 14);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SHREE ASSOCIATES  |  Executive Dashboard Valuation Terminal', 20, 24);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      const dateStr = new Date().toLocaleString('en-IN');
      const userText = user?.email ? `User: ${user.email}` : 'User: Administrator';
      doc.text(`Report Date: ${dateStr}   |   ${userText}`, pageWidth - 20 - doc.getTextWidth(`Report Date: ${dateStr}   |   ${userText}`), 24);

      doc.setFillColor(99, 102, 241);
      doc.rect(0, 40, pageWidth, 3, 'F');
    };

    drawHeader();

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE PORTFOLIO SUMMARY', 20, 70);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Portfolio Value: ₹${(summary.totalPortfolioValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, 95);
    doc.text(`Total Capital Invested: ₹${(summary.totalInvestment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, 115);
    doc.text(`Available Cash Balance: ₹${(summary.availableCashBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, 135);
    doc.text(`Total Capital Deployed: ₹${(summary.totalCapitalDeployed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, 155);

    doc.text(`Unrealized Profit/Loss: ₹${(summary.unrealizedProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 350, 95);
    doc.text(`Realized Profit/Loss: ₹${(summary.realizedProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 350, 115);
    doc.text(`Average Trade Return: ${formatDecimal(summary.avgReturn)}%`, 350, 135);
    doc.text(`System Win Rate: ${formatDecimal(summary.winRate)}%`, 350, 155);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Current Active Holdings', 20, 190);

    const headers = ['Symbol', 'Investor', 'Trade Type', 'Buy Price', 'Current Price', 'Quantity', 'Invested Capital', 'Current Value', 'P&L (Unrealized)'];
    const rows = openPositions.map((p: any) => [
      p.symbol,
      p.investorName,
      p.tradeType,
      `₹${formatDecimal(p.buyPrice)}`,
      `₹${formatDecimal(p.currentPrice)}`,
      p.quantity.toString(),
      `₹${formatDecimal(p.investedAmount)}`,
      `₹${formatDecimal(p.currentValue)}`,
      `₹${formatDecimal(p.profitLoss)} (${formatDecimal(p.profitLossPct)}%)`
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 200,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [13, 18, 31], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(31, 41, 55);
      doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('SHREE ASSOCIATES  •  Confidential Executive Report  •  Internal Use Only', 20, pageHeight - 15);
      
      const pageText = `Page ${i} of ${totalPages}`;
      doc.text(pageText, pageWidth - 20 - doc.getTextWidth(pageText), pageHeight - 15);
    }

    doc.save(`Shree_Associates_Executive_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: subTextCol, fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
        Analyzing system balances...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px' }}>
        ⚠️ Failed to load dashboard: {(error as any).message || 'Server error'}
      </div>
    );
  }

  const overallRoi = summary.totalInvestment > 0 ? (summary.totalPnL / summary.totalInvestment) * 100 : 0;

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: textCol, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} style={{ color: '#818cf8' }} />
            Dashboard Terminal
          </h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>Executive portfolio metrics &amp; asset valuation</p>
        </div>
        <button onClick={exportPDF} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0d121f', color: textCol, border: `1px solid ${borderCol}` }}>
          <FileText size={15} style={{ color: '#818cf8' }} /> Export PDF Report
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ========================================================== */}
        {/* KPI ROW                                                    */}
        {/* ========================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
          
          {/* Card 1: Total Portfolio Value */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wallet size={13} style={{ color: '#818cf8' }} />
              Total Portfolio Value
            </span>
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: textCol, fontFamily: 'var(--font-mono)' }}>
                {formatAbsoluteCurrency(summary.totalPortfolioValue)}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 700, marginTop: '8px',
                color: overallRoi >= 0 ? '#10b981' : '#ef4444',
                backgroundColor: overallRoi >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                padding: '2px 8px', borderRadius: '100px', fontFamily: 'var(--font-mono)'
              }}>
                {overallRoi >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(overallRoi).toFixed(2)}% ROI
              </span>
            </div>
          </div>

          {/* Card 2: Total Return */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={13} style={{ color: (summary.totalPnL || 0) >= 0 ? '#10b981' : '#ef4444' }} />
              Total Return (PnL)
            </span>
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: (summary.totalPnL || 0) >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {formatFinancialValue(summary.totalPnL)}
              </div>
              <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                {formatPercent(summary.totalInvestment > 0 ? (summary.totalPnL / summary.totalInvestment) * 100 : 0)} All-time Gain
              </div>
            </div>
          </div>

          {/* Card 3: Today's Change */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={13} style={{ color: todaysChangeVal >= 0 ? '#10b981' : '#ef4444' }} />
              Today's Change
            </span>
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: todaysChangeVal >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {formatFinancialValue(todaysChangeVal)}
              </div>
              <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                {formatPercent(todaysChangePct)} Intraday Shift
              </div>
            </div>
          </div>

          {/* Card 4: Active Positions */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={13} style={{ color: '#818cf8' }} />
              Active Positions
            </span>
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: textCol, fontFamily: 'var(--font-mono)' }}>
                {summary.totalOpenPositions || openPositions.length} Holdings
              </div>
              <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '6px' }}>
                Open Market Holdings
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* TWO COLUMN SUMMARY SECTION (NO CHARTS & NO PROGRESS BARS)  */}
        {/* ========================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          
          {/* Performance Leaders (Tabbed List) */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                  Performance Leaders
                </span>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#07090e', padding: '3px', borderRadius: '6px', border: `1px solid ${borderCol}` }}>
                  <button 
                    onClick={() => setActiveLeaderTab('best')}
                    style={{ 
                      border: 'none', background: activeLeaderTab === 'best' ? '#1f2937' : 'none',
                      fontSize: '11px', fontWeight: 800, color: activeLeaderTab === 'best' ? '#818cf8' : subTextCol,
                      padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)'
                    }}
                  >
                    TOP 3
                  </button>
                  <button 
                    onClick={() => setActiveLeaderTab('worst')}
                    style={{ 
                      border: 'none', background: activeLeaderTab === 'worst' ? '#1f2937' : 'none',
                      fontSize: '11px', fontWeight: 800, color: activeLeaderTab === 'worst' ? '#ef4444' : subTextCol,
                      padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)'
                    }}
                  >
                    BOTTOM 3
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeLeaderTab === 'best' ? (
                  bestList.length === 0 ? (
                    <div style={{ fontSize: '13px', color: subTextCol, fontStyle: 'italic', padding: '20px 0' }}>No active positions available.</div>
                  ) : (
                    bestList.map((p, idx) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#07090e', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, fontFamily: 'var(--font-mono)' }}>0{idx + 1}</span>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: textCol }}>{p.symbol}</div>
                            <div style={{ fontSize: '11px', color: subTextCol }}>{p.company}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>{formatPercent(p.profitLossPct, 1)}</span>
                          <span style={{ fontSize: '11.5px', color: subTextCol }}>{formatFinancialValue(p.profitLoss, 0)}</span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  worstList.length === 0 ? (
                    <div style={{ fontSize: '13px', color: subTextCol, fontStyle: 'italic', padding: '20px 0' }}>No bottom performers available.</div>
                  ) : (
                    worstList.map((p, idx) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#07090e', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, fontFamily: 'var(--font-mono)' }}>0{idx + 1}</span>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: textCol }}>{p.symbol}</div>
                            <div style={{ fontSize: '11px', color: subTextCol }}>{p.company}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#ef4444' }}>{formatPercent(p.profitLossPct, 1)}</span>
                          <span style={{ fontSize: '11.5px', color: subTextCol }}>{formatFinancialValue(p.profitLoss, 0)}</span>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: subTextCol, borderTop: `1px solid ${borderCol}`, paddingTop: '10px', marginTop: '12px', fontFamily: 'var(--font-mono)' }}>
              Ranking calculated from live asset return percentages.
            </div>
          </div>

          {/* Portfolio Allocation Breakdown (Pure Numerical Table, No Progress Bars) */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} style={{ color: '#818cf8' }} />
              Portfolio Capital Allocation
            </h3>
            
            {allocationData.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: subTextCol, fontStyle: 'italic' }}>
                No capital allocation data available.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {allocationData.map((item: any) => (
                  <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#07090e', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: textCol }}>{item.symbol}</div>
                      <div style={{ fontSize: '11px', color: subTextCol }}>{formatAbsoluteCurrency(item.investedAmount, 0)} Deployed</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ========================================================== */}
        {/* RECENT ACTIVITY & ACTIVE HOLDINGS                          */}
        {/* ========================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '16px' }}>
          
          {/* Recent Activity */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} style={{ color: '#818cf8' }} />
              Recent Activity
            </h3>
            
            {sortedActivity.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: subTextCol, fontStyle: 'italic' }}>
                No recent activity records.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {sortedActivity.map((p: any, idx: number) => (
                  <div key={`${p.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#07090e', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: textCol }}>{p.symbol}</strong>
                      <div style={{ fontSize: '11px', color: subTextCol }}>
                        {p.activityType === 'OPEN' ? 'Position opened' : 'Position closed'}
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '12px', fontWeight: 800,
                      color: p.activityType === 'CLOSE' && p.profitLoss < 0 ? '#ef4444' : '#10b981',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {p.activityType === 'OPEN' 
                        ? formatAbsoluteCurrency(p.investedAmount, 0)
                        : formatFinancialValue(p.profitLoss, 0)
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Holdings Table */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                Active Holdings Table
              </h3>
              <Link href="/open" style={{ fontSize: '12.5px', fontWeight: 700, color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View all positions →
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${borderCol}`, color: subTextCol, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    <th style={{ padding: '10px', fontWeight: 700 }}>SYMBOL</th>
                    <th style={{ padding: '10px', fontWeight: 700 }}>INVESTOR</th>
                    <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>VALUE</th>
                    <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>P&amp;L</th>
                    <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>RETURN %</th>
                    <th style={{ padding: '10px', fontWeight: 700, textAlign: 'center' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {openPositions.slice(0, 5).map((p: any) => (
                    <tr key={p.id} className="hover-row" style={{ borderBottom: `1px solid ${borderCol}` }}>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: textCol }} title={p.company}>{p.symbol}</td>
                      <td style={{ padding: '12px 10px', color: textCol }}>{p.investorName}</td>
                      <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 600 }}>
                        {formatAbsoluteCurrency(p.currentValue)}
                      </td>
                      <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700, color: p.profitLoss >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatFinancialValue(p.profitLoss)}
                      </td>
                      <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 800, color: p.profitLoss >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatPercent(p.profitLossPct)}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '10px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                          color: p.profitLoss >= 0 ? '#10b981' : '#ef4444',
                          backgroundColor: p.profitLoss >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          padding: '2px 8px', borderRadius: '100px'
                        }}>
                          {p.profitLoss >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {p.profitLoss >= 0 ? 'BULLISH' : 'BEARISH'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {openPositions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: subTextCol, fontStyle: 'italic' }}>
                        No active holdings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
