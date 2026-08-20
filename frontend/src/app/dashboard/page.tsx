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
  TrendingDown, 
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

  // React Query cached fetch - parallel dashboard and portfolio data
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
    refetchInterval: 30000, // 30s auto-refresh
  });

  const dashboardData = dashboardAndPortfolio?.dashboard;
  const portfolioData = dashboardAndPortfolio?.portfolio;

  const summary = dashboardData?.summary || {};
  const openPositions = portfolioData?.positions?.open || [];
  const closedPositions = portfolioData?.positions?.closed || [];
  const growthData = dashboardData?.charts?.area || [];

  const cardBg = 'var(--color-surface-1)';
  const borderCol = 'var(--color-border)';
  const textCol = 'var(--color-text-primary)';
  const subTextCol = 'var(--color-text-secondary)';
  const chartThemeColor = '#2563EB';

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

  // --- PERFORMANCE LEADERS DEDUPLICATION & ROTATION ---
  const sortedByPerf = [...openPositions].sort((a: any, b: any) => b.profitLossPct - a.profitLossPct);
  const bestList = sortedByPerf.slice(0, 3);
  const worstListRaw = [...sortedByPerf].reverse().slice(0, 3);
  
  // Remove duplicates between best and worst groups when positions count < 6
  const bestIds = new Set(bestList.map((p: any) => p.id));
  const worstList = worstListRaw.filter((p: any) => !bestIds.has(p.id));

  // --- PORTFOLIO ALLOCATION CALCULATION ---
  const totalOpenInvested = openPositions.reduce((sum: number, p: any) => sum + p.investedAmount, 0);
  const allocationData = openPositions.map((p: any) => ({
    symbol: p.symbol,
    company: p.company,
    percentage: totalOpenInvested > 0 ? (p.investedAmount / totalOpenInvested) * 100 : 0,
  })).sort((a: any, b: any) => b.percentage - a.percentage).slice(0, 5);

  // --- COMBINE AND SORT LATEST EVENTS FOR RECENT ACTIVITY ---
  const allPositionsCombined = [
    ...openPositions.map((p: any) => ({ ...p, activityType: 'OPEN' })),
    ...closedPositions.map((p: any) => ({ ...p, activityType: 'CLOSE' }))
  ];
  const sortedActivity = allPositionsCombined.sort((a: any, b: any) => {
    const dateA = new Date(a.activityType === 'CLOSE' ? (a.closedAt || a.entryDate) : a.entryDate).getTime();
    const dateB = new Date(b.activityType === 'CLOSE' ? (b.closedAt || b.entryDate) : b.entryDate).getTime();
    return dateB - dateA;
  }).slice(0, 3);

  // Export PDF Report - preserving original logic
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const drawHeader = () => {
      doc.setFillColor(11, 15, 23);
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

      doc.setFillColor(16, 185, 129);
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
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('SHREE ASSOCIATES  •  Confidential Executive Report  •  Internal Use Only', 20, pageHeight - 15);
      
      const pageText = `Page ${i} of ${totalPages}`;
      doc.text(pageText, pageWidth - 20 - doc.getTextWidth(pageText), pageHeight - 15);
    }

    doc.save(`Shree_Associates_CEO_Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: subTextCol, fontSize: '15px' }}>
        Analyzing system balances...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: '#EF4444', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px' }}>
        ⚠️ Failed to load dashboard: {(error as any).message || 'Server error'}
      </div>
    );
  }

  const overallRoi = summary.totalInvestment > 0 ? (summary.totalPnL / summary.totalInvestment) * 100 : 0;
  const performanceChartData = growthData;
  const hasHistoricalData = performanceChartData && performanceChartData.length >= 2;

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: textCol, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={22} style={{ color: '#2563EB' }} />
            Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>Portfolio overview and market performance</p>
        </div>
        <button onClick={exportPDF} className="btn-secondary" style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={15} /> Export PDF Report
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ========================================================== */}
        {/* SECTION A: KPI ROW                                         */}
        {/* ========================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
          
          {/* Card 1: Total Portfolio Value */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Wallet size={12} style={{ color: '#2563EB' }} />
              Total Portfolio Value
            </span>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, fontVariantNumeric: 'tabular-nums' }}>
                {formatAbsoluteCurrency(summary.totalPortfolioValue)}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 800, marginTop: '8px',
                color: overallRoi >= 0 ? '#10B981' : '#EF4444',
                backgroundColor: overallRoi >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                padding: '2px 8px', borderRadius: '12px'
              }}>
                {overallRoi >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(overallRoi).toFixed(2)}% ROI
              </span>
            </div>
          </div>

          {/* Card 2: Total Return */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <TrendingUp size={12} style={{ color: (summary.totalPnL || 0) >= 0 ? '#10B981' : '#EF4444' }} />
              Total Return
            </span>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: (summary.totalPnL || 0) >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                {formatFinancialValue(summary.totalPnL)}
              </div>
              <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '6px' }}>
                {formatPercent(summary.totalInvestment > 0 ? (summary.totalPnL / summary.totalInvestment) * 100 : 0)} All Time
              </div>
            </div>
          </div>

          {/* Card 3: Today's Change */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <TrendingUp size={12} style={{ color: todaysChangeVal >= 0 ? '#10B981' : '#EF4444' }} />
              Today's Change
            </span>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: todaysChangeVal >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                {formatFinancialValue(todaysChangeVal)}
              </div>
              <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '6px' }}>
                {formatPercent(todaysChangePct)} Today
              </div>
            </div>
          </div>

          {/* Card 4: Active Positions */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Briefcase size={12} style={{ color: '#2563EB' }} />
              Active Positions
            </span>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, fontVariantNumeric: 'tabular-nums' }}>
                {summary.totalOpenPositions || openPositions.length}
              </div>
              <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '6px' }}>
                Currently Open Holdings
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* MAIN PERFORMANCE SECTION (Two-column)                      */}
        {/* ========================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.2fr', gap: '16px' }}>
          
          {/* Portfolio Performance (Growth area chart) */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '360px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 900, color: textCol, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PORTFOLIO PERFORMANCE
              </h3>
              <p style={{ fontSize: '12px', color: subTextCol, margin: '2px 0 0 0' }}>Portfolio value over time</p>
            </div>
            
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {hasHistoricalData ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '8px' }}>
                  {[...performanceChartData].reverse().slice(0, 10).map((day: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: idx < 9 ? `1px solid ${borderCol}` : 'none' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: textCol }}>{day.date}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: day.Gain >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                        {formatFinancialValue(day.Gain)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <p style={{ fontSize: '13px', color: subTextCol, margin: 0 }}>
                    Performance history will appear as more portfolio data is recorded.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Leaders Card */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '360px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Performance Leaders
                </span>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
                  <button 
                    onClick={() => setActiveLeaderTab('best')}
                    style={{ 
                      border: 'none', background: activeLeaderTab === 'best' ? '#FFFFFF' : 'none',
                      fontSize: '11px', fontWeight: 800, color: activeLeaderTab === 'best' ? '#2563EB' : subTextCol,
                      padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    BEST 3
                  </button>
                  <button 
                    onClick={() => setActiveLeaderTab('worst')}
                    style={{ 
                      border: 'none', background: activeLeaderTab === 'worst' ? '#FFFFFF' : 'none',
                      fontSize: '11px', fontWeight: 800, color: activeLeaderTab === 'worst' ? '#EF4444' : subTextCol,
                      padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    WORST 3
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeLeaderTab === 'best' ? (
                  bestList.length === 0 ? (
                    <div style={{ fontSize: '12.5px', color: subTextCol, fontStyle: 'italic', padding: '20px 0' }}>No performers available.</div>
                  ) : (
                    bestList.map((p, idx) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: subTextCol }}>0{idx + 1}</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: textCol }}>{p.symbol}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontVariantNumeric: 'tabular-nums' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#10B981' }}>{formatPercent(p.profitLossPct, 1)}</span>
                          <span style={{ fontSize: '12px', color: subTextCol }}>{formatFinancialValue(p.profitLoss, 0)}</span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  worstList.length === 0 ? (
                    <div style={{ fontSize: '12.5px', color: subTextCol, fontStyle: 'italic', padding: '20px 0' }}>No worst performers available.</div>
                  ) : (
                    worstList.map((p, idx) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: subTextCol }}>0{idx + 1}</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: textCol }}>{p.symbol}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontVariantNumeric: 'tabular-nums' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#EF4444' }}>{formatPercent(p.profitLossPct, 1)}</span>
                          <span style={{ fontSize: '12px', color: subTextCol }}>{formatFinancialValue(p.profitLoss, 0)}</span>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            <div style={{ fontSize: '11.5px', color: subTextCol, borderTop: `1px solid ${borderCol}`, paddingTop: '10px', marginTop: '10px' }}>
              Relative ranking derived from live asset P&amp;L percentages.
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* PORTFOLIO INSIGHTS (Two-column)                            */}
        {/* ========================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          
          {/* Portfolio Allocation progress bars */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', minHeight: '220px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: textCol, margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} style={{ color: '#2563EB' }} />
              Portfolio Allocation
            </h3>
            
            {allocationData.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12.5px', color: subTextCol, fontStyle: 'italic' }}>
                Allocation insights will appear as more holdings are added.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
                {allocationData.map((item: any) => (
                  <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderCol}` }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: textCol }}>{item.symbol}</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity feed */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', minHeight: '220px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: textCol, margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} style={{ color: '#2563EB' }} />
              Recent Activity
            </h3>
            
            {sortedActivity.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12.5px', color: subTextCol, fontStyle: 'italic' }}>
                No recent activity
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
                {sortedActivity.map((p: any, idx: number) => (
                  <div key={`${p.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: idx < sortedActivity.length - 1 ? '8px' : '0', borderBottom: idx < sortedActivity.length - 1 ? `1px solid ${borderCol}` : 'none' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: textCol }}>{p.symbol}</strong>
                      <span style={{ fontSize: '11px', color: subTextCol, marginLeft: '8px' }}>
                        {p.activityType === 'OPEN' ? 'Position opened' : 'Position closed'}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '12.5px', fontWeight: 800,
                      color: p.activityType === 'CLOSE' && p.profitLoss < 0 ? '#EF4444' : '#10B981',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {p.activityType === 'OPEN' 
                        ? formatAbsoluteCurrency(p.investedAmount, 0)
                        : formatFinancialValue(p.profitLoss, 0)
                      } {p.activityType === 'OPEN' ? 'invested' : 'realized'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ========================================================== */}
        {/* ACTIVE HOLDINGS TABLE                                      */}
        {/* ========================================================== */}
        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 900, color: textCol, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Holdings
            </h3>
            <Link href="/open" style={{ fontSize: '12.5px', fontWeight: 800, color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all positions →
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${borderCol}`, color: subTextCol }}>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Symbol</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Investor</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Current Value</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>P&amp;L</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>P&amp;L %</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.slice(0, 5).map((p: any) => (
                  <tr key={p.id} className="hover-row" style={{ borderBottom: `1px solid ${borderCol}` }}>
                    <td style={{ padding: '10px', fontWeight: 800, color: textCol }} title={p.company}>{p.symbol}</td>
                    <td style={{ padding: '10px', color: textCol }}>{p.investorName}</td>
                    <td style={{ padding: '10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 700 }}>
                      {formatAbsoluteCurrency(p.currentValue)}
                    </td>
                    <td style={{ padding: '10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 700, color: p.profitLoss >= 0 ? '#10B981' : '#EF4444' }}>
                      {formatFinancialValue(p.profitLoss)}
                    </td>
                    <td style={{ padding: '10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 800, color: p.profitLoss >= 0 ? '#10B981' : '#EF4444' }}>
                      {formatPercent(p.profitLossPct)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {p.profitLoss >= 0 ? (
                        <ArrowUpRight size={16} style={{ color: '#10B981', display: 'inline' }} />
                      ) : (
                        <ArrowDownRight size={16} style={{ color: '#EF4444', display: 'inline' }} />
                      )}
                    </td>
                  </tr>
                ))}
                {openPositions.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: subTextCol, fontStyle: 'italic' }}>
                      No active holdings.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
