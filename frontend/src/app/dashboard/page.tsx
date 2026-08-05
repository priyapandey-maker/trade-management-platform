'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';
import { TrendingUp, TrendingDown, RefreshCw, FileText } from 'lucide-react';
import { formatDecimal } from '@/lib/financial-calculations';

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // React Query cached fetch
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const res = await api.get('/portfolio/dashboard');
      return res.data;
    },
    refetchInterval: 30000, // 30s auto-refresh
  });

  // Performer Widget Rotation State
  const [performerIndex, setPerformerIndex] = useState(0);

  const summary = dashboardData?.summary || {};
  const performers = dashboardData?.performers || [];
  const recentPositions = dashboardData?.recentPositions || [];
  const openPositions = dashboardData?.positions?.open || [];

  useEffect(() => {
    if (performers.length === 0) return;
    const interval = setInterval(() => {
      setPerformerIndex((prev) => (prev + 1) % performers.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [performers.length]);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

  const chartThemeColor = '#10B981';
  const chartAltColor = '#2563EB';
  const COLORS = ['#2563EB', '#10B981', '#7C3AED', '#EA580C', '#64748B', '#0D9488'];

  // --- CHART DATA PROCESSING ---
  // 1. Portfolio Allocation (Pie)
  const pieData = openPositions.map((p: any) => ({
    name: p.symbol,
    value: p.investedAmount || 0,
  }));

  // 2. Investor Split (Radial / Bar)
  const radialData = (dashboardData?.investors || []).map((inv: any) => ({
    name: inv.name,
    Capital: inv.totalInvestment || 0,
  }));

  // 3. Sector Allocation (Donut)
  const sectorMap: Record<string, number> = {};
  openPositions.forEach((p: any) => {
    const sector = p.assetType || 'STOCK';
    sectorMap[sector] = (sectorMap[sector] || 0) + (p.investedAmount || 0);
  });
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

  // 4. Portfolio Growth over time (Area / Line)
  const growthData = (dashboardData?.charts?.area || []);

  // Top performers splits (Gainer / Loser)
  const openHoldingsSorted = [...openPositions].sort((a, b) => b.profitLossPct - a.profitLossPct);
  const topGainers = openHoldingsSorted.slice(0, 3);
  const topLosers = [...openPositions].sort((a, b) => a.profitLossPct - b.profitLossPct).slice(0, 3);

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
    doc.text(`Average Trade Return: ${(summary.avgReturn || 0).toFixed(2)}%`, 350, 135);
    doc.text(`System Win Rate: ${(summary.winRate || 0).toFixed(1)}%`, 350, 155);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Current Active Holdings', 20, 190);

    const headers = ['Symbol', 'Investor', 'Trade Type', 'Buy Price', 'Current Price', 'Quantity', 'Invested Capital', 'Current Value', 'P&L (Unrealized)'];
    const rows = openPositions.map((p: any) => [
      p.symbol,
      p.investorName,
      p.tradeType,
      `₹${p.buyPrice.toFixed(2)}`,
      `₹${p.currentPrice.toFixed(2)}`,
      p.quantity.toString(),
      `₹${p.investedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `₹${p.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `₹${p.profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${p.profitLossPct.toFixed(2)}%)`
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

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Title Controls Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: textCol, margin: 0 }}>Executive terminal</h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>Institutional dealing board and platform control center</p>
        </div>
        <button onClick={exportPDF} style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: cardBg, color: textCol, fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={16} /> Export PDF Report
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ========================================================== */}
        {/* ROW 1: PORTFOLIO VALUE CARD (~45%) & TODAY'S P&L (55%) */}
        {/* ========================================================== */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
          
          {/* Portfolio Value large card */}
          <div style={{ flex: isMobile ? 'none' : '0 0 45%', backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio Valuation</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: textCol, marginTop: '8px' }}>
                ₹{formatDecimal(summary.totalPortfolioValue)}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: (summary.currentPortfolioProfitLoss || 0) >= 0 ? '#10B981' : '#EF4444', display: 'inline-flex', alignItems: 'center' }}>
                  {(summary.currentPortfolioProfitLoss || 0) >= 0 ? <TrendingUp size={16} style={{ marginRight: '4px' }} /> : <TrendingDown size={16} style={{ marginRight: '4px' }} />}
                  {formatDecimal(Math.abs((summary.currentPortfolioProfitLoss || 0) / (summary.totalInvestment || 1) * 100))}%
                </span>
                <span style={{ fontSize: '12px', color: subTextCol, marginLeft: '8px' }}>Today's Change</span>
              </div>
              <div style={{ width: '120px', height: '40px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData.slice(-6)}>
                    <Area type="monotone" dataKey="Gain" stroke={chartThemeColor} fill={`${chartThemeColor}20`} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Today's P&L splits */}
          <div style={{ flex: 1, backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Profit &amp; Loss breakdown</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: subTextCol, fontWeight: 700 }}>Realized Gains</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: (summary.realizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
                  ₹{formatDecimal(summary.realizedProfit)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: subTextCol, fontWeight: 700 }}>Unrealized Balance</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: (summary.unrealizedProfit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
                  ₹{formatDecimal(summary.unrealizedProfit)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: subTextCol, fontWeight: 700 }}>Available Liquid Cash</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: textCol, marginTop: '6px' }}>
                  ₹{formatDecimal(summary.availableCashBalance)}
                </div>
              </div>
            </div>
            
            <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: subTextCol }}>
              <span>Capital Deployed: <strong>₹{formatDecimal(summary.totalCapitalDeployed)}</strong></span>
              <span>Overall Win Rate: <strong>{formatDecimal(summary.winRate)}%</strong></span>
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* ROW 2: ALLOCATION CHARTS (3 Equal Columns) */}
        {/* ========================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
          
          {/* Portfolio Allocation Pie */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '280px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: textCol, margin: '0 0 10px 0', textTransform: 'uppercase' }}>Composition by Holdings</h3>
            <div style={{ flex: 1, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} fill="#8884d8">
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Investor Split Bar */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '280px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: textCol, margin: '0 0 10px 0', textTransform: 'uppercase' }}>Investor Allocations</h3>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={radialData}>
                  <XAxis dataKey="name" stroke={subTextCol} fontSize={10} tickLine={false} />
                  <YAxis stroke={subTextCol} fontSize={10} width={45} tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`} />
                  <Bar dataKey="Capital" fill={chartAltColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Allocation Donut */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', height: '280px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: textCol, margin: '0 0 10px 0', textTransform: 'uppercase' }}>Composition by Sectors</h3>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} fill="#8884d8">
                    {sectorData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* ROW 3: PORTFOLIO GROWTH (Line chart) */}
        {/* ========================================================== */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '24px', borderRadius: '12px', height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: textCol, margin: '0 0 16px 0', textTransform: 'uppercase' }}>Portfolio Returns Growth Trend</h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartThemeColor} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={chartThemeColor} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#E2E8F0'} />
                <XAxis dataKey="date" stroke={subTextCol} fontSize={10} tickLine={false} />
                <YAxis stroke={subTextCol} fontSize={10} tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} />
                <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`} />
                <Area type="monotone" dataKey="Gain" stroke={chartThemeColor} strokeWidth={2} fillOpacity={1} fill="url(#colorGrowth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ========================================================== */}
        {/* ROW 4: ROTATION CARD & RECENT ACTIVITY */}
        {/* ========================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
          
          {/* Performer Rotation Widget */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {performers.length > 0 && performers[performerIndex] ? (
              <div key={performerIndex} style={{ animation: 'fadeIn 0.4s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: performers[performerIndex].color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {performers[performerIndex].label}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: textCol }} title={performers[performerIndex].data.company}>
                    {performers[performerIndex].data.symbol}
                  </span>
                </div>
                
                <div style={{ borderTop: `1px solid ${borderCol}`, margin: '8px 0' }} />
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>CMP</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: textCol, marginTop: '2px' }}>
                      CMP: ₹{formatDecimal(performers[performerIndex].data.currentPrice)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Today's Return</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: (performers[performerIndex].data.changePercent || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '2px' }}>
                      {(performers[performerIndex].data.changePercent || 0) >= 0 ? '+' : ''}{formatDecimal(performers[performerIndex].data.changePercent)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Overall Return</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: performers[performerIndex].data.profitLossPct >= 0 ? '#10B981' : '#EF4444', marginTop: '2px' }}>
                      {performers[performerIndex].data.profitLossPct >= 0 ? '+' : ''}{formatDecimal(performers[performerIndex].data.profitLossPct)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Profit / Loss</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: performers[performerIndex].data.profitLoss >= 0 ? '#10B981' : '#EF4444', marginTop: '2px' }}>
                      {performers[performerIndex].data.profitLoss >= 0 ? '+' : ''}₹{formatDecimal(performers[performerIndex].data.profitLoss)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: subTextCol }}>No performer stats available.</span>
            )}
          </div>

          {/* Recent Activity */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '12.5px', fontWeight: 800, color: textCol, margin: '0 0 14px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📋 Recent Activity
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentPositions.slice(0, 3).map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 700, color: textCol }} title={p.company}>{p.symbol}</span>
                    <span style={{ color: p.profitLoss >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                      {p.profitLoss >= 0 ? '+' : ''}₹{formatDecimal(p.profitLoss)}
                    </span>
                  </div>
                ))}
                {recentPositions.length === 0 && <span style={{ fontSize: '12px', color: subTextCol }}>No recent trades</span>}
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* ROW 5: OPEN HOLDINGS TABLE */}
        {/* ========================================================== */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: textCol, margin: '0 0 16px 0', textTransform: 'uppercase' }}>Active Portfolio Open Holdings</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${borderCol}`, color: subTextCol }}>
                <th style={{ padding: '10px 14px' }}>Symbol</th>
                <th style={{ padding: '10px 14px' }}>Investor</th>
                <th style={{ padding: '10px 14px' }}>Trade Type</th>
                <th style={{ padding: '10px 14px' }}>Entry Buy Price</th>
                <th style={{ padding: '10px 14px' }}>Current Price</th>
                <th style={{ padding: '10px 14px' }}>Quantity</th>
                <th style={{ padding: '10px 14px' }}>Invested Capital</th>
                <th style={{ padding: '10px 14px' }}>Current Value</th>
                <th style={{ padding: '10px 14px' }}>P&amp;L (Unrealized)</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.slice(0, 10).map((p: any) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: textCol }} title={p.company}>{p.symbol}</td>
                  <td style={{ padding: '12px 14px', color: textCol }}>{p.investorName}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: p.tradeType === 'SELL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: p.tradeType === 'SELL' ? '#EF4444' : '#10B981' }}>
                      {p.tradeType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: textCol }}>₹{p.buyPrice.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', color: textCol }}>₹{p.currentPrice.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', color: textCol }}>{p.quantity}</td>
                  <td style={{ padding: '12px 14px', color: textCol }}>₹{p.investedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 14px', color: textCol }}>₹{p.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: p.profitLoss >= 0 ? '#10B981' : '#EF4444' }}>
                    ₹{p.profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({p.profitLossPct.toFixed(2)}%)
                  </td>
                </tr>
              ))}
              {openPositions.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: subTextCol }}>
                    No open trades recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {openPositions.length > 10 && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <Link href="/open" style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
                View all open positions ({openPositions.length}) →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
