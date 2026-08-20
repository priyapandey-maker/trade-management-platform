'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Layers, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Briefcase, 
  Activity
} from 'lucide-react';
import { formatDecimal } from '@/lib/financial-calculations';

export default function PortfolioPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [performerIndex, setPerformerIndex] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
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
      setInvestors(res.data.investors || []);
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

  // --- CONSOLIDATED INSIGHTS ---
  const largestPosition = [...openPositions].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))[0];
  const highestProfitPos = [...openPositions].sort((a, b) => (b.profitLoss || 0) - (a.profitLoss || 0))[0];
  const highestLossPos = [...openPositions].sort((a, b) => (a.profitLoss || 0) - (b.profitLoss || 0))[0];

  const cardBg = 'var(--color-surface-1)';
  const borderCol = 'var(--color-border)';
  const textCol = 'var(--color-text-primary)';
  const subTextCol = 'var(--color-text-secondary)';
  const COLORS = ['#2563EB', '#10B981', '#7C3AED', '#EA580C', '#64748B', '#0D9488'];

  // --- FORMATTERS ---
  const formatAbsoluteCurrency = (val: number, decimals: number = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    const absVal = Math.abs(val);
    return `₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const formatFinancialValue = (val: number, decimals: number = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    return `${isNegative ? '-' : '+'}₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const formatPercent = (val: number, decimals: number = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00%';
    const isNegative = val < 0;
    return `${isNegative ? '-' : '+'}${Math.abs(val).toFixed(decimals)}%`;
  };

  // --- PERFORMANCE LEADERS ROTATION ---
  // Sort ALL open positions by profitLossPct descending (best first)
  const sortedByPerf = [...openPositions].sort((a, b) => b.profitLossPct - a.profitLossPct);

  // BEST: top 3 from sorted list (highest %, regardless of sign)
  const bestList = sortedByPerf.slice(0, 3);

  // WORST: last 3 from sorted list, reversed so worst is first (lowest %, regardless of sign)
  const worstListRaw = [...sortedByPerf].reverse().slice(0, 3);

  // Deduplicate: if total positions < 6, some positions would appear in both groups.
  // Remove from worstList any position that already appears in bestList.
  const bestIds = new Set(bestList.map(p => p.id));
  const worstList = worstListRaw.filter(p => !bestIds.has(p.id));

  const performanceLeaders = [
    ...bestList.map((p, i) => ({ ...p, label: `BEST #${i + 1}`, isBest: true })),
    ...worstList.map((p, i) => ({ ...p, label: `WORST #${i + 1}`, isBest: false })),
  ];

  useEffect(() => {
    if (performanceLeaders.length <= 1) return;
    const interval = setInterval(() => {
      setPerformerIndex(prev => prev + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, [performanceLeaders.length]);

  const currentLeader = performanceLeaders.length > 0
    ? performanceLeaders[performerIndex % performanceLeaders.length]
    : null;

  // --- ACTIVE INSIGHTS CONSOLIDATION ---
  const uniqueActiveInsights: any[] = [];
  if (largestPosition) {
    uniqueActiveInsights.push({
      symbol: largestPosition.symbol,
      company: largestPosition.company,
      detail: `Current Value: ${formatAbsoluteCurrency(largestPosition.currentValue, 0)}`,
      labels: ['Largest Holding'],
      color: '#2563EB'
    });
  }
  if (highestProfitPos) {
    const existing = uniqueActiveInsights.find(x => x.symbol === highestProfitPos.symbol);
    if (existing) {
      existing.labels.push('Highest Profit');
      existing.detail += ` | Gain: ${formatFinancialValue(highestProfitPos.profitLoss, 0)}`;
    } else {
      uniqueActiveInsights.push({
        symbol: highestProfitPos.symbol,
        company: highestProfitPos.company,
        detail: `Gain: ${formatFinancialValue(highestProfitPos.profitLoss, 0)}`,
        labels: ['Highest Profit'],
        color: '#10B981'
      });
    }
  }
  if (highestLossPos && highestLossPos.symbol !== highestProfitPos?.symbol) {
    const existing = uniqueActiveInsights.find(x => x.symbol === highestLossPos.symbol);
    if (existing) {
      existing.labels.push('Highest Loss');
      existing.detail += ` | Loss: ${formatFinancialValue(highestLossPos.profitLoss, 0)}`;
    } else {
      uniqueActiveInsights.push({
        symbol: highestLossPos.symbol,
        company: highestLossPos.company,
        detail: `Loss: ${formatFinancialValue(highestLossPos.profitLoss, 0)}`,
        labels: ['Highest Loss'],
        color: '#EF4444'
      });
    }
  }

  const uniqueHistoricalInsights: any[] = [];
  if (summary?.bestPerformingTrade) {
    uniqueHistoricalInsights.push({
      symbol: summary.bestPerformingTrade.symbol,
      company: summary.bestPerformingTrade.company || summary.bestPerformingTrade.symbol,
      detail: `Closed Return: ${formatPercent(summary.bestPerformingTrade.profitLossPct, 1)}`,
      labels: ['Best Exit'],
      color: '#10B981'
    });
  }
  if (summary?.worstPerformingTrade) {
    const existing = uniqueHistoricalInsights.find(x => x.symbol === summary.worstPerformingTrade.symbol);
    if (existing) {
      existing.labels.push('Worst Exit');
    } else {
      uniqueHistoricalInsights.push({
        symbol: summary.worstPerformingTrade.symbol,
        company: summary.worstPerformingTrade.company || summary.worstPerformingTrade.symbol,
        detail: `Closed Return: ${formatPercent(summary.worstPerformingTrade.profitLossPct, 1)}`,
        labels: ['Worst Exit'],
        color: '#EF4444'
      });
    }
  }

  // Investor summary
  const totalInvestors = investors.length;
  const topContributors = [...investors].sort((a, b) => b.totalInvestment - a.totalInvestment).slice(0, 3);
  const totalCapitalAllocated = investors.reduce((sum, i) => sum + i.totalInvestment, 0);

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const drawHeader = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SHREE ASSOCIATES  |  Valuation Terminal', 20, 24);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      const dateStr = new Date().toLocaleString('en-IN');
      const userText = user?.email ? `User: ${user.email}` : 'User: Administrator';
      doc.text(`Report Date: ${dateStr}   |   ${userText}`, pageWidth - 20 - doc.getTextWidth(`Report Date: ${dateStr}   |   ${userText}`), 24);
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 40, pageWidth, 3, 'F');
    };

    drawHeader();

    doc.setFillColor(248, 250, 252);
    doc.rect(20, 65, pageWidth - 40, 95, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, 65, pageWidth - 40, 95, 'S');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE VALUATION SUMMARY', 32, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Total Portfolio Value: ${formatAbsoluteCurrency(summary?.totalPortfolioValue, 2)}`, 32, 110);
    doc.text(`Total Capital Invested: ${formatAbsoluteCurrency(summary?.totalInvestment, 2)}`, 32, 128);
    const overallPnL = (summary?.totalPortfolioValue || 0) - (summary?.totalInvestment || 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Unrealized P&L: ${formatFinancialValue(summary?.unrealizedProfit, 2)}`, pageWidth / 2 + 10, 110);
    const estROI = summary?.totalInvestment > 0 ? (overallPnL / summary.totalInvestment) * 100 : 0;
    doc.text(`Realized Profit/Loss: ${formatFinancialValue(summary?.realizedProfit, 2)}`, pageWidth / 2 + 10, 128);
    doc.text(`Estimated Net ROI %: ${formatPercent(estROI, 2)}`, pageWidth / 2 + 10, 146);

    const invHeaders = ['Investor Name', 'Capital Deployed', 'Current Value', 'Realized Gain', 'Unrealized Gain', 'ROI %', 'Win Rate'];
    const invRows = investors.map((inv: any) => [
      inv.name,
      formatAbsoluteCurrency(inv.totalInvestment, 0),
      formatAbsoluteCurrency(inv.currentValue, 0),
      formatFinancialValue(inv.realizedProfit, 0),
      formatFinancialValue(inv.unrealizedProfit, 0),
      formatPercent(inv.roi, 2),
      `${formatDecimal(inv.winRate)}%`
    ]);

    autoTable(doc, {
      head: [invHeaders],
      body: invRows,
      startY: 185,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    });

    const holdHeaders = ['Symbol', 'Asset Type', 'Qty', 'Buy Price', 'CMP', 'Invested Capital', 'Current Value', 'Live P&L'];
    const holdRows = openPositions.map((pos: any) => [
      pos.symbol,
      pos.assetType || 'STOCK',
      pos.quantity.toString(),
      formatAbsoluteCurrency(pos.buyPrice, 2),
      formatAbsoluteCurrency(pos.currentPrice, 2),
      formatAbsoluteCurrency(pos.investedAmount, 2),
      formatAbsoluteCurrency(pos.currentValue, 2),
      `${formatFinancialValue(pos.profitLoss, 2)} (${formatPercent(pos.profitLossPct, 2)})`
    ]);

    autoTable(doc, {
      head: [holdHeaders],
      body: holdRows,
      startY: (doc as any).lastAutoTable.finalY + 20,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('SHREE ASSOCIATES  •  Confidential Portfolio Valuation  •  Internal Use Only', 20, pageHeight - 15);
      const pageText = `Page ${i} of ${totalPages}`;
      doc.text(pageText, pageWidth - 20 - doc.getTextWidth(pageText), pageHeight - 15);
    }

    doc.save(`Shree_Associates_Portfolio_Valuations_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: textCol, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={22} style={{ color: '#2563EB' }} />
            Executive Valuation Terminal
          </h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
            Real-time portfolio valuations, asset metrics, and performance analytics.
          </p>
        </div>
        <button onClick={exportPDF} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={15} /> Export PDF
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ height: '70px', borderRadius: '12px', backgroundColor: '#F1F5F9', opacity: 0.6 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ============================= */}
          {/* 1. PORTFOLIO OVERVIEW KPIs   */}
          {/* ============================= */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>

            {/* Primary KPI: Total Portfolio Value */}
            <div className="premium-card" style={{ flex: 1.4, backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wallet size={12} style={{ color: '#2563EB' }} />
                Total Portfolio Value
              </span>
              <div>
                <div style={{ fontSize: isMobile ? '26px' : '34px', fontWeight: 900, color: textCol, marginTop: '10px', fontVariantNumeric: 'tabular-nums' }}>
                  {formatAbsoluteCurrency(summary?.totalPortfolioValue, 2)}
                </div>
                {summary?.totalInvestment > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', fontWeight: 800, marginTop: '10px',
                    color: (summary?.currentPortfolioProfitLoss || 0) >= 0 ? '#10B981' : '#EF4444',
                    backgroundColor: (summary?.currentPortfolioProfitLoss || 0) >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    padding: '3px 10px', borderRadius: '20px'
                  }}>
                    {(summary?.currentPortfolioProfitLoss || 0) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {(((summary?.currentPortfolioProfitLoss || 0) / summary.totalInvestment) * 100).toFixed(2)}% ROI
                  </span>
                )}
              </div>
            </div>

            {/* Secondary KPIs: Total Investment + Net Unrealized P&L */}
            <div style={{ flex: 2, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>

              <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={12} style={{ color: '#2563EB' }} />
                  Total Investment
                </span>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: textCol, marginTop: '10px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatAbsoluteCurrency(summary?.totalInvestment, 2)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Principal Capital Deployed</div>
                </div>
              </div>

              <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={12} style={{ color: (summary?.unrealizedProfit || 0) >= 0 ? '#10B981' : '#EF4444' }} />
                  Net Unrealized P&amp;L
                </span>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: (summary?.unrealizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '10px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatFinancialValue(summary?.unrealizedProfit, 2)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Active holdings value delta</div>
                </div>
              </div>

            </div>
          </div>

          {/* ============================= */}
          {/* 2. PERFORMANCE SIGNALS       */}
          {/* ============================= */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.2fr', gap: '16px' }}>

            {/* Consolidated Insights */}
            <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 900, color: textCol, margin: '0 0 16px 0', borderBottom: `1px solid ${borderCol}`, paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} style={{ color: '#2563EB' }} />
                Consolidated Portfolio Insights
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {uniqueActiveInsights.length === 0 && uniqueHistoricalInsights.length === 0 && (
                  <div style={{ color: subTextCol, fontStyle: 'italic', fontSize: '13px', textAlign: 'center', padding: '12px' }}>No position insights available.</div>
                )}
                {[...uniqueActiveInsights, ...uniqueHistoricalInsights].map((insight, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: `1px solid ${borderCol}`, gap: '12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {insight.labels.map((lbl: string) => (
                          <span key={lbl} style={{
                            fontSize: '9px', fontWeight: 800, textTransform: 'uppercase',
                            color: insight.color,
                            backgroundColor: insight.color === '#2563EB' ? 'rgba(37,99,235,0.08)' : insight.color === '#10B981' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                            padding: '2px 7px', borderRadius: '4px'
                          }}>{lbl}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: textCol, marginTop: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {insight.company} ({insight.symbol})
                      </div>

                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: insight.color, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {insight.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rotating Performance Leaders */}
            <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {currentLeader?.isBest ? <TrendingUp size={13} color="#10B981" /> : <TrendingDown size={13} color={currentLeader ? '#EF4444' : subTextCol} />}
                  Performance Leaders
                </span>
                {currentLeader && (
                  <span style={{
                    fontSize: '10px', fontWeight: 800,
                    color: currentLeader.isBest ? '#10B981' : '#EF4444',
                    backgroundColor: currentLeader.isBest ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    padding: '2px 8px', borderRadius: '4px'
                  }}>
                    {currentLeader.label}
                  </span>
                )}
              </div>

              {currentLeader ? (
                <div key={`${currentLeader.symbol}-${currentLeader.label}`} style={{ animation: 'fadeSlideIn 0.5s ease-out forwards' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: textCol, lineHeight: 1.2 }}>{currentLeader.symbol}</div>
                      <div style={{ fontSize: '12px', color: subTextCol, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                        CMP: {formatAbsoluteCurrency(currentLeader.currentPrice, 2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: currentLeader.isBest ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                        {formatPercent(currentLeader.profitLossPct, 2)}
                      </div>
                      <div style={{ fontSize: '12px', color: subTextCol, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                        {formatFinancialValue(currentLeader.profitLoss, 2)}
                      </div>
                    </div>
                  </div>
                  {/* Progress indicator dots */}
                  {performanceLeaders.length > 1 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '14px', justifyContent: 'center' }}>
                      {performanceLeaders.map((_, i) => (
                        <span key={i} style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          backgroundColor: i === (performerIndex % performanceLeaders.length)
                            ? (performanceLeaders[i]?.isBest ? '#10B981' : '#EF4444')
                            : '#E2E8F0',
                          transition: 'background-color 0.3s ease'
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: subTextCol, fontStyle: 'italic', textAlign: 'center' }}>No active positions to display.</div>
              )}
            </div>

          </div>

          {/* ============================= */}
          {/* 3. INVESTOR ALLOCATION       */}
          {/* ============================= */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '16px' }}>
            <div style={{ borderBottom: `1px solid ${borderCol}`, paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '13.5px', fontWeight: 900, color: textCol, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} style={{ color: '#2563EB' }} />
                  Investor Allocations &amp; Capital Shares
                </h3>
                <p style={{ fontSize: '12px', color: subTextCol, margin: '3px 0 0 0' }}>Client contributions, valuations, and individual performance.</p>
              </div>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>INVESTORS</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: textCol, marginTop: '1px' }}>{totalInvestors}</div>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>DEPLOYED</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563EB', marginTop: '1px' }}>{formatAbsoluteCurrency(totalCapitalAllocated, 0)}</div>
                </div>
              </div>
            </div>

            {totalInvestors > 0 && (
              <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {topContributors.map((inv, idx) => (
                  <div key={inv.name} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 11px', borderRadius: '20px', backgroundColor: '#F8FAFC', border: `1px solid ${borderCol}`, fontSize: '12px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                    <strong style={{ color: textCol }}>{inv.name}</strong>
                    <span style={{ color: subTextCol }}>({formatAbsoluteCurrency(inv.totalInvestment, 0)} | {((inv.totalInvestment / (totalCapitalAllocated || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            )}

            {investors.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: subTextCol, fontStyle: 'italic' }}>No investors found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderCol}`, color: subTextCol }}>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'left' }}>Investor</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Deployed</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Current Value</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Realized Gain</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Unrealized Gain</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Win Rate</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>ROI %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((inv) => {
                      const netProfit = inv.realizedProfit + inv.unrealizedProfit;
                      return (
                        <tr key={inv.name} className="hover-row" style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: '11px 10px', fontWeight: 800, color: textCol }}>{inv.name}</td>
                          <td style={{ padding: '11px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(inv.totalInvestment, 0)}</td>
                          <td style={{ padding: '11px 10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(inv.currentValue, 0)}</td>
                          <td style={{ padding: '11px 10px', color: inv.realizedProfit >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                            {formatFinancialValue(inv.realizedProfit, 0)}
                          </td>
                          <td style={{ padding: '11px 10px', color: inv.unrealizedProfit >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                            {formatFinancialValue(inv.unrealizedProfit, 0)}
                          </td>
                          <td style={{ padding: '11px 10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{inv.winRate?.toFixed(1)}%</td>
                          <td style={{ padding: '11px 10px', fontWeight: 800, color: netProfit >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                            {formatPercent(inv.roi, 2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============================= */}
          {/* 4. LIVE HOLDINGS             */}
          {/* ============================= */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '13.5px', fontWeight: 900, color: textCol, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={15} style={{ color: '#2563EB' }} />
              Live Active Asset Holdings
            </h3>
            {openPositions.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: subTextCol, fontStyle: 'italic' }}>No active positions currently held.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderCol}`, color: subTextCol }}>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'left' }}>Symbol</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Buy Price</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>CMP</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Invested</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Current Value</th>
                      <th style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Live P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((pos) => (
                      <tr key={pos.id} className="hover-row" style={{ borderBottom: `1px solid ${borderCol}` }}>
                        <td style={{ padding: '11px 10px', fontWeight: 800, color: textCol }} title={pos.company}>{pos.symbol}</td>
                        <td style={{ padding: '11px 10px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: '4px' }}>
                            {pos.assetType || 'STOCK'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{pos.quantity}</td>
                        <td style={{ padding: '11px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(pos.buyPrice, 2)}</td>
                        <td style={{ padding: '11px 10px', fontWeight: 800, color: textCol, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(pos.currentPrice, 2)}</td>
                        <td style={{ padding: '11px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(pos.investedAmount, 2)}</td>
                        <td style={{ padding: '11px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(pos.currentValue, 2)}</td>
                        <td style={{ padding: '11px 10px', fontWeight: 900, color: pos.profitLoss >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                          {formatFinancialValue(pos.profitLoss, 2)} ({formatPercent(pos.profitLossPct, 2)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
