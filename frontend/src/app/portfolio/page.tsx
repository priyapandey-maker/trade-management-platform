'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import {
  ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart, Pie,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
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
  Activity, 
  LineChart as LineChartIcon
} from 'lucide-react';
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

  // Performance Leaders rotation state
  const [performerIndex, setPerformerIndex] = useState(0);

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
  const COLORS = ['#2563EB', '#10B981', '#7C3AED', '#EA580C', '#64748B', '#0D9488'];

  // --- SIGN & CURRENCY FORMATTERS ---
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
    const absVal = Math.abs(val);
    return `${isNegative ? '-' : '+'}${absVal.toFixed(decimals)}%`;
  };

  // --- PERFORMANCE LEADERS CYCLING HOOK ---
  const sortedByPerf = openPositions.length > 0 ? [...openPositions].sort((a, b) => b.profitLossPct - a.profitLossPct) : [];
  const bestPerformers = sortedByPerf.slice(0, 3).filter(p => p.profitLossPct > 0).map((p, i) => ({ ...p, type: 'BEST PERFORMER', rank: i + 1 }));
  const worstPerformers = sortedByPerf.slice(-3).reverse().filter(p => p.profitLossPct < 0).map((p, i) => ({ ...p, type: 'WORST PERFORMER', rank: i + 1 }));
  const performanceLeaders = [...bestPerformers, ...worstPerformers];

  useEffect(() => {
    if (performanceLeaders.length <= 1) return;
    const interval = setInterval(() => {
      setPerformerIndex(prev => prev + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, [performanceLeaders.length]);

  const currentLeader = performanceLeaders.length > 0 ? performanceLeaders[performerIndex % performanceLeaders.length] : null;

  // --- INSIGHTS CONSOLIDATION ---
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
      existing.labels.push('Highest Profit Position');
      existing.detail += ` | Gain: ${formatFinancialValue(highestProfitPos.profitLoss, 0)}`;
    } else {
      uniqueActiveInsights.push({
        symbol: highestProfitPos.symbol,
        company: highestProfitPos.company,
        detail: `Gain: ${formatFinancialValue(highestProfitPos.profitLoss, 0)}`,
        labels: ['Highest Profit Position'],
        color: '#10B981'
      });
    }
  }
  if (highestLossPos) {
    const existing = uniqueActiveInsights.find(x => x.symbol === highestLossPos.symbol);
    if (existing) {
      existing.labels.push('Highest Loss Position');
      existing.detail += ` | Loss: ${formatFinancialValue(highestLossPos.profitLoss, 0)}`;
    } else {
      uniqueActiveInsights.push({
        symbol: highestLossPos.symbol,
        company: highestLossPos.company,
        detail: `Loss: ${formatFinancialValue(highestLossPos.profitLoss, 0)}`,
        labels: ['Highest Loss Position'],
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
      labels: ['Best Historical Exit'],
      color: '#10B981'
    });
  }
  if (summary?.worstPerformingTrade) {
    const existing = uniqueHistoricalInsights.find(x => x.symbol === summary.worstPerformingTrade.symbol);
    if (existing) {
      existing.labels.push('Worst Historical Exit');
      existing.detail += ` | Return: ${formatPercent(summary.worstPerformingTrade.profitLossPct, 1)}`;
    } else {
      uniqueHistoricalInsights.push({
        symbol: summary.worstPerformingTrade.symbol,
        company: summary.worstPerformingTrade.company || summary.worstPerformingTrade.symbol,
        detail: `Closed Return: ${formatPercent(summary.worstPerformingTrade.profitLossPct, 1)}`,
        labels: ['Worst Historical Exit'],
        color: '#EF4444'
      });
    }
  }

  // --- CHART DATA GENERATION ---

  // 1. Portfolio Growth
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

  // 2. Monthly P&L
  const monthlyMap: Record<string, number> = {};
  closedPositions.forEach((p) => {
    if (!p.closedAt) return;
    const m = new Date(p.closedAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthlyMap[m] = (monthlyMap[m] || 0) + p.profitLoss;
  });
  const monthlyData = Object.entries(monthlyMap).map(([month, PnL]) => ({ month, PnL }));

  // 3. Sector Allocation
  const sectorMap: Record<string, number> = {};
  openPositions.forEach((p) => {
    const type = p.assetType || 'STOCK';
    sectorMap[type] = (sectorMap[type] || 0) + p.investedAmount;
  });
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

  // 4. Capital Allocation
  const stackedData = openPositions.map((p) => ({
    symbol: p.symbol,
    Invested: p.investedAmount,
    Value: p.currentValue,
  }));

  // 5. Win vs Loss
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

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const drawHeader = () => {
      doc.setFillColor(15, 23, 42); // Deep navy header background
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

      doc.setFillColor(37, 99, 235); // Accent blue divider line
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
    doc.text(`Available Cash Balance: ${formatAbsoluteCurrency(summary?.availableCashBalance, 2)}`, 32, 146);

    const overallPnL = (summary?.totalPortfolioValue || 0) - (summary?.totalInvestment || 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Unrealized P&L: ${formatFinancialValue(summary?.unrealizedProfit, 2)}`, pageWidth / 2 + 10, 110);
    doc.text(`Realized Profit/Loss: ${formatFinancialValue(summary?.realizedProfit, 2)}`, pageWidth / 2 + 10, 128);
    const estROI = summary?.totalInvestment > 0 ? (overallPnL / summary.totalInvestment) * 100 : 0;
    doc.text(`Estimated Net ROI %: ${formatPercent(estROI, 2)}`, pageWidth / 2 + 10, 146);

    doc.setFillColor(248, 250, 252);
    doc.rect(20, 175, pageWidth - 40, 80, 'F');
    doc.rect(20, 175, pageWidth - 40, 80, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PERFORMANCE INSIGHTS & STATS', 32, 195);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Best Performing Exit: ${summary?.bestPerformingTrade ? `${summary.bestPerformingTrade.symbol} (${formatPercent(summary.bestPerformingTrade.profitLossPct, 1)})` : '—'}`, 32, 220);
    doc.text(`Worst Performing Exit: ${summary?.worstPerformingTrade ? `${summary.worstPerformingTrade.symbol} (${formatPercent(summary.worstPerformingTrade.profitLossPct, 1)})` : '—'}`, 32, 238);

    doc.text(`Open Position Win Rate: ${formatDecimal(summary?.winRate)}%`, pageWidth / 2 + 10, 220);
    doc.text(`Average Return Rate: ${formatPercent(summary?.avgReturn, 2)}`, pageWidth / 2 + 10, 238);

    const assetHeaders = ['Asset Class / Sector', 'Invested Capital', 'Percentage Share'];
    const assetRows = sectorData.map((s: any) => [
      s.name,
      formatAbsoluteCurrency(s.value, 0),
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
      formatAbsoluteCurrency(inv.totalInvestment, 0),
      formatAbsoluteCurrency(inv.currentValue, 0),
      formatPercent(inv.roi, 2),
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

  // Build analytical charts config
  const secondaryCharts: any[] = [];

  if (monthlyData.length > 1) {
    secondaryCharts.push({
      title: 'MONTHLY REALIZED P&L BREAKDOWN',
      component: (
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
      )
    });
  }

  if (stackedData.length > 0) {
    secondaryCharts.push({
      title: 'CAPITAL ALLOCATION: Invested Amount vs Current Value',
      component: (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={stackedData}>
            <CartesianGrid strokeDasharray="3 3" stroke={'#E2E8F0'} />
            <XAxis dataKey="symbol" stroke={subTextCol} fontSize={10} />
            <YAxis stroke={subTextCol} fontSize={10} />
            <Tooltip formatter={(v: any) => v !== undefined && v !== null ? `₹${v.toLocaleString('en-IN')}` : ''} contentStyle={{ backgroundColor: cardBg, borderColor: borderCol, color: textCol }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="Invested" name="Invested Capital" fill="#2563EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Value" name="Current Value" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    });
  }

  if (sectorData.length > 1) {
    secondaryCharts.push({
      title: 'SECTOR/ASSET CLASS ALLOCATION DONUT',
      component: (
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
      )
    });
  }

  if (closedPositions.length > 0) {
    secondaryCharts.push({
      title: 'CLOSED TRADES SUCCESS RATIO: Win vs Loss',
      component: (
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
      )
    });
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER TITLE */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '24px', fontWeight: 900, color: textCol, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={24} className="text-blue-600" style={{ color: '#2563EB' }} />
            Executive Valuation Terminal
          </h1>
          <p style={{ fontSize: '13.5px', color: subTextCol, margin: '4px 0 0 0' }}>
            Real-time portfolio valuations, asset metrics, and performance analytics.
          </p>
        </div>
        <button onClick={exportPDF} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={16} /> Export PDF
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={16} /> {error}
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
          
          {/* ======================================================= */}
          {/* 1. PORTFOLIO OVERVIEW / CORE KPIs */}
          {/* ======================================================= */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            
            {/* Primary KPI Card: Total Portfolio Value */}
            <div className="premium-card" style={{ flex: 1.5, backgroundColor: '#FFFFFF', border: `1px solid ${borderCol}`, padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={12} style={{ color: '#2563EB' }} />
                  Total Portfolio Value
                </span>
                <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: textCol, margin: '8px 0 0 0' }}>
                  {formatAbsoluteCurrency(summary?.totalPortfolioValue, 2)}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
                {summary?.totalInvestment > 0 && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: (summary?.currentPortfolioProfitLoss || 0) >= 0 ? '#10B981' : '#EF4444', 
                    fontWeight: 800, 
                    backgroundColor: (summary?.currentPortfolioProfitLoss || 0) >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', 
                    padding: '4px 10px', 
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {(summary?.currentPortfolioProfitLoss || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {(((summary?.currentPortfolioProfitLoss || 0) / summary.totalInvestment) * 100).toFixed(2)}% ROI
                  </span>
                )}
                <span style={{ fontSize: '12.5px', color: subTextCol }}>CMP Valued Live</span>
              </div>
            </div>

            {/* Secondary KPI Cards */}
            <div style={{ flex: 2, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
              
              <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={12} style={{ color: '#2563EB' }} />
                  Total Investment
                </span>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '10px' }}>
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
                  <div style={{ fontSize: '20px', fontWeight: 900, color: (summary?.unrealizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '10px' }}>
                    {formatFinancialValue(summary?.unrealizedProfit, 2)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Active holdings value delta</div>
                </div>
              </div>

              <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={12} style={{ color: '#10B981' }} />
                  Available Cash
                </span>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#10B981', marginTop: '10px' }}>
                    {formatAbsoluteCurrency(summary?.availableCashBalance, 2)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '4px' }}>Unallocated liquid funds</div>
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================= */}
          {/* 2. REALIZED VS UNREALIZED PERFORMANCE */}
          {/* ======================================================= */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, color: textCol, margin: '0 0 20px 0', borderBottom: `1px solid ${borderCol}`, paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} style={{ color: '#2563EB' }} />
              Trading Performance Metrics
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
              
              <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Win Rate</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>{summary?.winRate?.toFixed(1) || '0.0'}%</div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Average Return</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: (summary?.avgReturn || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                  {formatPercent(summary?.avgReturn, 2)}
                </div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Realized Gain</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: (summary?.realizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                  {formatFinancialValue(summary?.realizedProfit, 0)}
                </div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                <div style={{ fontSize: '10.5px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Net Unrealized Gain</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: (summary?.unrealizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                  {formatFinancialValue(summary?.unrealizedProfit, 0)}
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================= */}
          {/* 3. IMPORTANT PORTFOLIO INSIGHTS */}
          {/* ======================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.2fr', gap: '20px' }}>
            
            {/* Consolidated Insights */}
            <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: textCol, margin: '0 0 20px 0', borderBottom: `1px solid ${borderCol}`, paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} style={{ color: '#2563EB' }} />
                Consolidated Portfolio Insights
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {uniqueActiveInsights.length === 0 && uniqueHistoricalInsights.length === 0 && (
                  <div style={{ padding: '16px', color: subTextCol, fontStyle: 'italic', textAlign: 'center' }}>No core position insights available.</div>
                )}
                
                {uniqueActiveInsights.map((insight, idx) => (
                  <div key={`active-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {insight.labels.map((lbl: string) => (
                          <span key={lbl} style={{ 
                            fontSize: '9.5px', 
                            color: insight.color, 
                            fontWeight: 800, 
                            textTransform: 'uppercase',
                            backgroundColor: insight.color === '#2563EB' ? 'rgba(37,99,235,0.08)' : insight.color === '#10B981' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {lbl}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: textCol, marginTop: '6px' }}>{insight.company} ({insight.symbol})</div>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: insight.color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {insight.detail}
                    </div>
                  </div>
                ))}

                {uniqueHistoricalInsights.map((insight, idx) => (
                  <div key={`hist-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {insight.labels.map((lbl: string) => (
                          <span key={lbl} style={{ 
                            fontSize: '9.5px', 
                            color: insight.color, 
                            fontWeight: 800, 
                            textTransform: 'uppercase',
                            backgroundColor: insight.color === '#10B981' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {lbl}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: textCol, marginTop: '6px' }}>{insight.company} ({insight.symbol})</div>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: insight.color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {insight.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rotating Performance Leaders Card */}
            <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '180px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentLeader?.type === 'BEST PERFORMER' ? <TrendingUp size={14} color="#10B981" /> : <TrendingDown size={14} color={currentLeader ? "#EF4444" : subTextCol} />}
                  Performance Leaders
                </span>
                {currentLeader && (
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    color: currentLeader.type === 'BEST PERFORMER' ? '#10B981' : '#EF4444', 
                    backgroundColor: currentLeader.type === 'BEST PERFORMER' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', 
                    padding: '2px 8px', 
                    borderRadius: '4px' 
                  }}>
                    #{currentLeader.rank} {currentLeader.type}
                  </span>
                )}
              </div>
              
              {currentLeader ? (
                <div key={`${currentLeader.symbol}-${currentLeader.type}-${currentLeader.rank}`} style={{ animation: 'fadeSlideIn 0.5s ease-out forwards' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: textCol, lineHeight: 1.2 }}>{currentLeader.symbol}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: subTextCol, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                        CMP: {formatAbsoluteCurrency(currentLeader.currentPrice, 2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: currentLeader.type === 'BEST PERFORMER' ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                        {formatPercent(currentLeader.profitLossPct, 2)}
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: subTextCol, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                        {formatFinancialValue(currentLeader.profitLoss, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: subTextCol, fontStyle: 'italic', textAlign: 'center' }}>No active performance leader data.</div>
              )}
            </div>

          </div>

          {/* ======================================================= */}
          {/* 4. USEFUL ANALYTICAL CHARTS */}
          {/* ======================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, color: textCol, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LineChartIcon size={18} style={{ color: '#2563EB' }} />
              Performance Visual Analytics
            </h3>
            
            {/* Portfolio Growth Line Chart (Full Width) */}
            <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', height: '360px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>PORTFOLIO GROWTH: Cumulative Realized Timeline</h4>
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="88%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
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
            {secondaryCharts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
                {secondaryCharts.map((chart, idx) => (
                  <div key={idx} className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', height: '320px', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 800, color: textCol }}>{chart.title}</h4>
                    {chart.component}
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px', color: subTextCol, fontStyle: 'italic', textAlign: 'center' }}>
                No active or closed trades to generate segmentation charts.
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* 5. INVESTOR ALLOCATION */}
          {/* ======================================================= */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
            <div style={{ borderBottom: `1px solid ${borderCol}`, paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: textCol, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} style={{ color: '#2563EB' }} />
                  Investor Allocations &amp; Capital Shares
                </h3>
                <p style={{ fontSize: '12.5px', color: subTextCol, margin: '4px 0 0 0' }}>Comprehensive recap of external client contributions and individual ROIs.</p>
              </div>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>TOTAL INVESTORS</span>
                  <div style={{ fontSize: '16px', fontWeight: 850, color: textCol, marginTop: '2px' }}>{totalInvestors}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>TOTAL DEPLOYED</span>
                  <div style={{ fontSize: '16px', fontWeight: 850, color: '#2563EB', marginTop: '2px' }}>{formatAbsoluteCurrency(totalCapitalAllocated, 0)}</div>
                </div>
              </div>
            </div>

            {/* Top Contributors segment */}
            {totalInvestors > 0 && (
              <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>TOP CONSTITUENTS CONTRIBUTIONS</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {topContributors.map((inv, idx) => (
                    <div key={inv.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', backgroundColor: '#F8FAFC', border: `1px solid ${borderCol}`, fontSize: '12px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                      <strong style={{ color: textCol }}>{inv.name}</strong>
                      <span style={{ color: subTextCol }}>({formatAbsoluteCurrency(inv.totalInvestment, 0)} | {((inv.totalInvestment / (totalCapitalAllocated || 1)) * 100).toFixed(1)}%)</span>
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
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>Investor Name</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Total Deployed</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Current Valuation</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Realized Gain</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Unrealized Gain</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Win Ratio</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Est. ROI %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((inv) => {
                      const netProfit = inv.realizedProfit + inv.unrealizedProfit;
                      const isProfit = netProfit >= 0;
                      return (
                        <tr key={inv.name} className="hover-row" style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }}>{inv.name}</td>
                          <td style={{ padding: '12px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(inv.totalInvestment, 0)}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 705, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(inv.currentValue, 0)}</td>
                          <td style={{ padding: '12px 10px', color: inv.realizedProfit >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums', fontWeight: 650, textAlign: 'right' }}>
                            {formatFinancialValue(inv.realizedProfit, 0)}
                          </td>
                          <td style={{ padding: '12px 10px', color: inv.unrealizedProfit >= 0 ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums', fontWeight: 650, textAlign: 'right' }}>
                            {formatFinancialValue(inv.unrealizedProfit, 0)}
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{inv.winRate?.toFixed(1)}%</td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: isProfit ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
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

          {/* ======================================================= */}
          {/* 6. LIVE HOLDINGS */}
          {/* ======================================================= */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 900, color: textCol, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={16} style={{ color: '#2563EB' }} />
              Live Active Asset Holdings
            </h3>
            {openPositions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: subTextCol, fontStyle: 'italic' }}>No active positions currently held.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderCol}`, textAlign: 'left', color: subTextCol }}>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>Symbol</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700 }}>Asset Type</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Buy Price</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>CMP</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Invested Capital</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Current Value</th>
                      <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Live P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((pos) => {
                      const isProfit = pos.profitLoss >= 0;
                      return (
                        <tr key={pos.id} className="hover-row" style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }} title={pos.company}>{pos.symbol}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: '4px' }}>
                              {pos.assetType || 'STOCK'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{pos.quantity}</td>
                          <td style={{ padding: '12px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(pos.buyPrice, 2)}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(pos.currentPrice, 2)}</td>
                          <td style={{ padding: '12px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(pos.investedAmount, 2)}</td>
                          <td style={{ padding: '12px 10px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{formatAbsoluteCurrency(pos.currentValue, 2)}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 900, color: isProfit ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                            {formatFinancialValue(pos.profitLoss, 2)} ({formatPercent(pos.profitLossPct, 2)})
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
