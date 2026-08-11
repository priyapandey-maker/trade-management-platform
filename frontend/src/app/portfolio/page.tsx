'use client';

import React, { useEffect, useState, useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar, Cell,
  PieChart, Pie,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Clock, FileText } from 'lucide-react';
import { formatDecimal } from '@/lib/financial-calculations';

export default function PortfolioPage() {
  
  const { user } = useAuth();
  

  const [summary, setSummary] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
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

  // Consolidated insights metrics
  const largestPosition = [...openPositions].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))[0];
  const highestProfitPos = [...openPositions].sort((a, b) => (b.profitLoss || 0) - (a.profitLoss || 0))[0];
  const highestLossPos = [...openPositions].sort((a, b) => (a.profitLoss || 0) - (b.profitLoss || 0))[0];

  const cardBg = '#FFFFFF';
  const borderCol = '#E2E8F0';
  const textCol = '#0F172A';
  const subTextCol = '#64748B';

  const chartThemeColor = '#10B981';
  const chartAltColor = '#2563EB';
  const COLORS = ['#2563EB', '#10B981', '#7C3AED', '#EA580C', '#64748B', '#0D9488'];

  // --- CHART DATA GENERATION ---

  // 1. Portfolio Growth (Cumulative Realized returns over closed exits timeline)
  let cumulativeValue = 0;
  const growthData = [...closedPositions]
    .sort((a, b) => new Date(a.closedAt || a.entryDate).getTime() - new Date(b.closedAt || b.entryDate).getTime())
    .map((p: any) => {
      cumulativeValue += p.profitLoss;
      return {
        date: new Date(p.closedAt || p.entryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        Gain: cumulativeValue,
      };
    });

  // 2. Monthly P&L (Realized P&L by closing month)
  const monthlyMap: Record<string, number> = {};
  closedPositions.forEach((p) => {
    if (!p.closedAt) return;
    const m = new Date(p.closedAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthlyMap[m] = (monthlyMap[m] || 0) + p.profitLoss;
  });
  const monthlyData = Object.entries(monthlyMap).map(([month, PnL]) => ({ month, PnL }));

  // 3. Sector Allocation (Composition by assetType)
  const sectorMap: Record<string, number> = {};
  openPositions.forEach((p) => {
    const type = p.assetType || 'STOCK';
    sectorMap[type] = (sectorMap[type] || 0) + p.investedAmount;
  });
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

  // 4. Capital Allocation (Invested vs Current value by Symbol)
  const stackedData = openPositions.map((p) => ({
    symbol: p.symbol,
    Invested: p.investedAmount,
    Value: p.currentValue,
  }));

  // 5. Win vs Loss (Closed Trades Ratio)
  const winsCount = closedPositions.filter((p) => p.profitLoss > 0).length;
  const lossesCount = closedPositions.filter((p) => p.profitLoss <= 0).length;
  const winLossData = [
    { name: 'Wins', value: winsCount, fill: '#10B981' },
    { name: 'Losses', value: lossesCount, fill: '#EF4444' },
  ];

  // Investor details
  const totalInvestors = investors.length;
  const topContributors = [...investors]
    .sort((a, b) => b.totalInvestment - a.totalInvestment)
    .slice(0, 3);
  const totalCapitalAllocated = investors.reduce((sum, i) => sum + i.totalInvestment, 0);

  const exportPDF = () => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const drawHeader = () => {
      doc.setFillColor(11, 15, 23);
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

      doc.setFillColor(16, 185, 129);
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
    doc.text(`Total Portfolio Value: ₹${summary?.totalPortfolioValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 32, 110);
    doc.text(`Total Capital Invested: ₹${summary?.totalInvestment?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 32, 128);
    doc.text(`Available Cash Balance: ₹${summary?.availableCashBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 32, 146);

    const overallPnL = (summary?.totalPortfolioValue || 0) - (summary?.totalInvestment || 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Unrealized P&L: ₹${summary?.unrealizedProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth / 2 + 10, 110);
    doc.text(`Realized Profit/Loss: ₹${summary?.realizedProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth / 2 + 10, 128);
    const estROI = summary?.totalInvestment > 0 ? (overallPnL / summary.totalInvestment) * 100 : 0;
    doc.text(`Estimated Net ROI %: ${overallPnL >= 0 ? '+' : ''}${formatDecimal(estROI)}%`, pageWidth / 2 + 10, 146);

    doc.setFillColor(248, 250, 252);
    doc.rect(20, 175, pageWidth - 40, 80, 'F');
    doc.rect(20, 175, pageWidth - 40, 80, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PERFORMANCE INSIGHTS & STATS', 32, 195);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Best Performing Exit: ${summary?.bestPerformingTrade ? `${summary.bestPerformingTrade.symbol} (+${formatDecimal(summary.bestPerformingTrade.profitLossPct)}%)` : '—'}`, 32, 220);
    doc.text(`Worst Performing Exit: ${summary?.worstPerformingTrade ? `${summary.worstPerformingTrade.symbol} (${formatDecimal(summary.worstPerformingTrade.profitLossPct)}%)` : '—'}`, 32, 238);

    doc.text(`Open Position Win Rate: ${formatDecimal(summary?.winRate)}%`, pageWidth / 2 + 10, 220);
    doc.text(`Average Return Rate: ${formatDecimal(summary?.avgReturn)}%`, pageWidth / 2 + 10, 238);

    const assetHeaders = ['Asset Class / Sector', 'Invested Capital', 'Percentage Share'];
    const assetRows = sectorData.map((s: any) => [
      s.name,
      `₹${s.value.toLocaleString('en-IN')}`,
      `${formatDecimal((s.value / (summary?.totalInvestment || 1)) * 100)}%`
    ]);

    autoTable(doc, {
      head: [assetHeaders],
      body: assetRows,
      startY: 270,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    });

    const investorStartY = (doc as any).lastAutoTable.finalY + 20;
    
    // Add page if investor class hits boundary
    const nextY = investorStartY + 60;
    if (nextY > pageHeight - 30) {
      doc.addPage();
      drawHeader();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Investor Shares & Allocations', 20, investorStartY === 70 ? 70 : investorStartY);

    const invHeaders = ['Investor Name', 'Capital Deployed', 'Current Value', 'ROI %', 'Win Rate'];
    const invRows = investors.map((inv: any) => [
      inv.name,
      `₹${inv.totalInvestment.toLocaleString('en-IN')}`,
      `₹${inv.currentValue.toLocaleString('en-IN')}`,
      `${inv.roi >= 0 ? '+' : ''}${formatDecimal(inv.roi)}%`,
      `${formatDecimal(inv.winRate)}%`
    ]);

    autoTable(doc, {
      head: [invHeaders],
      body: invRows,
      startY: investorStartY === 70 ? 80 : investorStartY + 10,
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
      
      {/* HEADER TITLE */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 900, color: textCol, margin: 0 }}>Executive Valuation Terminal</h1>
          <p style={{ fontSize: '13.5px', color: subTextCol, margin: 0 }}>CEO Portfolio Overview, Asset Composition &amp; Performance Control Panel</p>
        </div>
        <button onClick={exportPDF} style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: cardBg, color: textCol, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📥 Export PDF
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ height: '70px', borderRadius: '12px', backgroundColor: '#F1F5F9', opacity: 0.6, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
              <div style={{ width: '150px', height: '16px', borderRadius: '4px', backgroundColor: '#E2E8F0' }} />
              <div style={{ width: '100px', height: '16px', borderRadius: '4px', backgroundColor: '#E2E8F0' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* ========================================== */}
          {/* 1. HERO SECTION (PRIMARY CRITICAL KPIs) */}
          {/* ========================================== */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            
            {/* LARGE HERO: Portfolio Value */}
            <div style={{ flex: 1.5, backgroundColor: '#F8FAFC', border: `2px solid ${borderCol}`, padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Portfolio Value</span>
                <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: textCol, margin: '8px 0 0 0' }}>
                  ₹{summary?.totalPortfolioValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: (summary?.currentPortfolioProfitLoss || 0) >= 0 ? '#10B981' : '#EF4444', fontWeight: 800, backgroundColor: (summary?.currentPortfolioProfitLoss || 0) >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                  {(summary?.currentPortfolioProfitLoss || 0) >= 0 ? '▲' : '▼'} {((summary?.currentPortfolioProfitLoss || 0) / (summary?.totalInvestment || 1) * 100).toFixed(2)}% ROI
                </span>
                <span style={{ fontSize: '12.5px', color: subTextCol }}>CMP Valued Live</span>
              </div>
            </div>

            {/* SECONDARY PRIMARY KPIS */}
            <div style={{ flex: 2, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
              
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Investment</span>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '10px' }}>
                    ₹{summary?.totalInvestment?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Principal Capital Deployed</div>
                </div>
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Net Unrealized P&amp;L</span>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: (summary?.unrealizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '10px' }}>
                    {(summary?.unrealizedProfit || 0) >= 0 ? '+' : ''}₹{summary?.unrealizedProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Active holdings CMP dev.</div>
                </div>
              </div>

              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Available Cash</span>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#10B981', marginTop: '10px' }}>
                    ₹{summary?.availableCashBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Unallocated liquid funds</div>
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================= */}
          {/* 2. TRADING PERFORMANCE & 3. PORTFOLIO INSIGHTS */}
          {/* ======================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.8fr', gap: '20px' }}>
            
            {/* TRADING PERFORMANCE METRICS */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: textCol, margin: '0 0 20px 0', borderBottom: `1px solid ${borderCol}`, paddingBottom: '12px' }}>📊 Trading Performance Metrics</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Open Positions</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>{summary?.totalOpenPositions || 0}</div>
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Closed Positions</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: textCol, marginTop: '4px' }}>{summary?.totalClosedPositions || 0}</div>
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Win Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>{summary?.winRate?.toFixed(1) || '0.0'}%</div>
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Average Return</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: (summary?.avgReturn || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                    {(summary?.avgReturn || 0) >= 0 ? '+' : ''}{summary?.avgReturn?.toFixed(2) || '0.00'}%
                  </div>
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Realized Profit</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: (summary?.realizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                    ₹{summary?.realizedProfit?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Unrealized Profit</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: (summary?.unrealizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                    ₹{summary?.unrealizedProfit?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>

              </div>
            </div>

            {/* PORTFOLIO INSIGHTS WIDGET */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: textCol, margin: '0 0 20px 0', borderBottom: `1px solid ${borderCol}`, paddingBottom: '12px' }}>💡 Consolidated Portfolio Insights</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                  <div>
                    <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700 }}>💼 LARGEST HOLDING</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: textCol, marginTop: '2px' }}>{largestPosition ? `${largestPosition.company} (${largestPosition.symbol})` : '—'}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#2563EB', textAlign: 'right' }}>
                    {largestPosition ? `₹${largestPosition.currentValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>🏆 HIGHEST PROFIT POSITION</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: textCol, marginTop: '2px' }}>{highestProfitPos ? `${highestProfitPos.company} (${highestProfitPos.symbol})` : '—'}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#10B981', textAlign: 'right' }}>
                    {highestProfitPos ? `+₹${highestProfitPos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>⚠️ HIGHEST LOSS POSITION</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: textCol, marginTop: '2px' }}>{highestLossPos ? `${highestLossPos.company} (${highestLossPos.symbol})` : '—'}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#EF4444', textAlign: 'right' }}>
                    {highestLossPos ? `₹${highestLossPos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                    <span style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 700 }}>🚀 BEST HISTORICAL EXIT</span>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: textCol, marginTop: '3px' }}>
                      {summary?.bestPerformingTrade ? `${summary.bestPerformingTrade.symbol} (+${summary.bestPerformingTrade.profitLossPct.toFixed(1)}%)` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                    <span style={{ fontSize: '10.5px', color: '#EF4444', fontWeight: 700 }}>📉 WORST HISTORICAL EXIT</span>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: textCol, marginTop: '3px' }}>
                      {summary?.worstPerformingTrade ? `${summary.worstPerformingTrade.symbol} (${summary.worstPerformingTrade.profitLossPct.toFixed(1)}%)` : '—'}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ======================================================= */}
          {/* 4. VISUAL ANALYTICS (RECHARTS DECK) */}
          {/* ======================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, color: textCol, margin: 0 }}>📊 Performance Visual Analytics</h3>
            
            {/* Portfolio Growth Line Chart (Full Width) */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', height: '360px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>📈 PORTFOLIO GROWTH: Cumulative Realized Timeline</h4>
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="88%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={'#E2E8F0'} />
                    <XAxis dataKey="date" stroke={subTextCol} fontSize={10} />
                    <YAxis stroke={subTextCol} fontSize={10} />
                    <Tooltip formatter={(v: any) => v !== undefined && v !== null ? `₹${v.toLocaleString('en-IN')}` : ''} contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                    <Area type="monotone" dataKey="Gain" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#growthGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol, fontStyle: 'italic' }}>No completed trades to map timeline.</div>
              )}
            </div>

            {/* Secondary charts grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
              
              {/* Monthly P&L Bar Chart */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', height: '320px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>📅 MONTHLY REALIZED P&amp;L BREAKDOWN</h4>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={'#E2E8F0'} />
                      <XAxis dataKey="month" stroke={subTextCol} fontSize={10} />
                      <YAxis stroke={subTextCol} fontSize={10} />
                      <Tooltip formatter={(v: any) => v !== undefined && v !== null ? `₹${v.toLocaleString('en-IN')}` : ''} contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                      <Bar dataKey="PnL">
                        {monthlyData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.PnL >= 0 ? '#10B981' : '#EF4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol, fontStyle: 'italic' }}>No closed trades records found.</div>
                )}
              </div>

              {/* Capital Allocation Stacked Bar */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', height: '320px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>📊 CAPITAL ALLOCATION: Invested Amount vs Current Value</h4>
                {stackedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={stackedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={'#E2E8F0'} />
                      <XAxis dataKey="symbol" stroke={subTextCol} fontSize={10} />
                      <YAxis stroke={subTextCol} fontSize={10} />
                      <Tooltip formatter={(v: any) => v !== undefined && v !== null ? `₹${v.toLocaleString('en-IN')}` : ''} contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Invested" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Value" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol, fontStyle: 'italic' }}>No active allocations.</div>
                )}
              </div>

              {/* Sector Allocation Donut Chart */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', height: '320px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>🍕 SECTOR/ASSET CLASS ALLOCATION DONUT</h4>
                {sectorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={sectorData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sectorData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => v !== undefined && v !== null ? `₹${v.toLocaleString('en-IN')}` : ''} contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol, fontStyle: 'italic' }}>No active allocations to segment.</div>
                )}
              </div>

              {/* Win vs Loss Ratio Donut Chart */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', height: '320px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>🏆 CLOSED TRADES SUCCESS RATIO: Win vs Loss</h4>
                {closedPositions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {winLossData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => v !== undefined && v !== null ? `${v} Trades` : ''} contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: subTextCol, fontStyle: 'italic' }}>No closed histories to calculate ratio.</div>
                )}
              </div>

            </div>
          </div>

          {/* ======================================================= */}
          {/* 5. INVESTOR OVERVIEW PANEL */}
          {/* ======================================================= */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
            <div style={{ borderBottom: `1px solid ${borderCol}`, paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: textCol, margin: 0 }}>👥 Investor Allocations &amp; Capital Shares</h3>
                <p style={{ fontSize: '12px', color: subTextCol, margin: '2px 0 0 0' }}>Comprehensive recap of external client contributions and individual ROIs.</p>
              </div>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: subTextCol }}>TOTAL INVESTORS</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: textCol }}>{totalInvestors}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: subTextCol }}>TOTAL DEPLOYED</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>₹{totalCapitalAllocated?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </div>

            {/* Top Contributors segment */}
            {totalInvestors > 0 && (
              <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11.5px', color: subTextCol, fontWeight: 700 }}>🏆 TOP CONSTITUENTS CONTRIBUTIONS</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {topContributors.map((inv, idx) => (
                    <div key={inv.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', backgroundColor: '#F8FAFC', border: `1px solid ${borderCol}`, fontSize: '12px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                      <strong style={{ color: textCol }}>{inv.name}</strong>
                      <span style={{ color: subTextCol }}>(₹{inv.totalInvestment?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} | {((inv.totalInvestment / (totalCapitalAllocated || 1)) * 100).toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table layout */}
            {investors.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: subTextCol, fontStyle: 'italic' }}>No investors found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderCol}`, color: subTextCol, textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Investor Name</th>
                      <th style={{ padding: '10px' }}>Total Deployed</th>
                      <th style={{ padding: '10px' }}>Current Valuation</th>
                      <th style={{ padding: '10px' }}>Realized Gain</th>
                      <th style={{ padding: '10px' }}>Unrealized Gain</th>
                      <th style={{ padding: '10px' }}>Win Ratio</th>
                      <th style={{ padding: '10px' }}>Est. ROI %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((inv) => {
                      const netProfit = inv.realizedProfit + inv.unrealizedProfit;
                      const isProfit = netProfit >= 0;
                      return (
                        <tr key={inv.name} style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }}>{inv.name}</td>
                          <td style={{ padding: '12px 10px' }}>₹{inv.totalInvestment?.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 700 }}>₹{inv.currentValue?.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 10px', color: inv.realizedProfit >= 0 ? '#10B981' : '#EF4444' }}>
                            {inv.realizedProfit >= 0 ? '+' : ''}₹{inv.realizedProfit?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td style={{ padding: '12px 10px', color: inv.unrealizedProfit >= 0 ? '#10B981' : '#EF4444' }}>
                            {inv.unrealizedProfit >= 0 ? '+' : ''}₹{inv.unrealizedProfit?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 700 }}>{inv.winRate?.toFixed(1)}%</td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: isProfit ? '#10B981' : '#EF4444' }}>
                            {isProfit ? '+' : ''}{inv.roi?.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* 6. ACTIVE PORTFOLIO HOLDINGS BREAKDOWN */}
          {/* ======================================================= */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 900, color: textCol }}>⚡ Live Active Asset Holdings</h3>
            {openPositions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: subTextCol, fontStyle: 'italic' }}>No active positions currently held.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderCol}`, textAlign: 'left', color: subTextCol }}>
                      <th style={{ padding: '10px' }}>Symbol</th>
                      <th style={{ padding: '10px' }}>Asset Type</th>
                      <th style={{ padding: '10px' }}>Qty</th>
                      <th style={{ padding: '10px' }}>Buy Price</th>
                      <th style={{ padding: '10px' }}>CMP</th>
                      <th style={{ padding: '10px' }}>Invested Capital</th>
                      <th style={{ padding: '10px' }}>Current value</th>
                      <th style={{ padding: '10px' }}>Live P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((pos) => {
                      const isProfit = pos.profitLoss >= 0;
                      return (
                        <tr key={pos.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }} title={pos.company}>{pos.symbol}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#F1F5F9', color: textCol, padding: '2px 6px', borderRadius: '4px' }}>
                              {pos.assetType || 'STOCK'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>{pos.quantity}</td>
                          <td style={{ padding: '12px 10px' }}>₹{formatDecimal(pos.buyPrice)}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }}>₹{formatDecimal(pos.currentPrice)}</td>
                          <td style={{ padding: '12px 10px' }}>₹{formatDecimal(pos.investedAmount)}</td>
                          <td style={{ padding: '12px 10px' }}>₹{formatDecimal(pos.currentValue)}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 900, color: isProfit ? '#10B981' : '#EF4444' }}>
                            {isProfit ? '+' : ''}₹{formatDecimal(pos.profitLoss)} ({isProfit ? '+' : ''}{formatDecimal(pos.profitLossPct)}%)
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
