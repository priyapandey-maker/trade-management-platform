'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

import api from '@/lib/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pencil, Trash2, Clock, TrendingUp, TrendingDown, History } from 'lucide-react';
import { formatDecimal, calculateInvestment, calculateCurrentValue, calculateLivePnL, calculateReturnPct, calculateRealizedPnL, calculateRealizedReturnPct } from '@/lib/financial-calculations';

export default function ClosedPositionsPage() {
  const { user } = useAuth();
  
  

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

  // Search & Filter
  const [search, setSearch] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [investorFilter, setInvestorFilter] = useState('ALL');

  // Missed Profit modal states
  const [showMissedProfitModal, setShowMissedProfitModal] = useState(false);
  const [missedSortBy, setMissedSortBy] = useState('missedProfit');
  const [missedSortOrder, setMissedSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sparklines cache
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  // Lazy Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(displaySearch);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [displaySearch]);

  // Delete Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Rotating Performer Widget
  const [performerIndex, setPerformerIndex] = useState(0);

  // Edit Drawer State (REQ 3)
  const [editingPosition, setEditingPosition] = useState<any | null>(null);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editForm, setEditForm] = useState({
    company: '',
    symbol: '',
    tradeType: 'SELL',
    buyPrice: '',
    quantity: '',
    targetPrice: '',
    stopLoss: '',
    entryDate: '',
    notes: '',
    nearBuyProximityPct: '1.0',
    muteAlertsUntil: '',
    sellingPrice: '',
    closedAt: '',
    exitReason: 'MANUAL_EXIT',
    investorName: 'Shree',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isEditingNewInvestor, setIsEditingNewInvestor] = useState(false);
  const [customEditInvestor, setCustomEditInvestor] = useState('');

  // Open Edit Drawer
  const handleOpenEditDrawer = (pos: any) => {
    setEditingPosition(pos);
    setEditForm({
      company: pos.company || '',
      symbol: pos.symbol || '',
      tradeType: pos.tradeType || 'SELL',
      buyPrice: pos.buyPrice ? pos.buyPrice.toString() : '',
      quantity: pos.quantity ? pos.quantity.toString() : '',
      targetPrice: pos.targetPrice ? pos.targetPrice.toString() : '',
      stopLoss: pos.stopLoss ? pos.stopLoss.toString() : '',
      entryDate: pos.entryDate ? new Date(pos.entryDate).toISOString().substring(0, 10) : '',
      notes: pos.notes || '',
      nearBuyProximityPct: pos.nearBuyProximityPct ? pos.nearBuyProximityPct.toString() : '1.0',
      muteAlertsUntil: pos.muteAlertsUntil ? new Date(pos.muteAlertsUntil).toISOString().substring(0, 10) : '',
      sellingPrice: pos.sellingPrice ? pos.sellingPrice.toString() : (pos.currentPrice ? pos.currentPrice.toString() : ''),
      closedAt: pos.closedAt ? new Date(pos.closedAt).toISOString().substring(0, 10) : '',
      exitReason: pos.exitReason || 'MANUAL_EXIT',
      investorName: pos.investorName || 'Shree',
    });
    setIsEditingNewInvestor(false);
    setCustomEditInvestor('');
    setValidationErrors({});
    setApiError(null);
    setShowEditDrawer(true);
  };

  // Submit Drawer changes
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'OWNER' || !editingPosition) return;

    setValidationErrors({});
    setApiError(null);

    const errors: Record<string, string> = {};
    const symbol = editForm.symbol.trim().toUpperCase();
    const company = editForm.company.trim();
    const qty = parseFloat(editForm.quantity);
    const bp = parseFloat(editForm.buyPrice);
    const tp = editForm.targetPrice ? parseFloat(editForm.targetPrice) : null;
    const sl = editForm.stopLoss ? parseFloat(editForm.stopLoss) : null;
    const prox = parseFloat(editForm.nearBuyProximityPct);

    if (!symbol) errors.symbol = 'Stock symbol is required.';
    if (isNaN(qty) || qty <= 0) errors.quantity = 'Quantity must be greater than 0.';
    if (isNaN(bp) || bp <= 0) errors.buyPrice = 'Buy Price must be greater than 0.';

    const isSellWorkflow = editForm.tradeType === 'SELL';

    let sp = 0;
    if (isSellWorkflow) {
      sp = parseFloat(editForm.sellingPrice);
      if (isNaN(sp) || sp <= 0) {
        errors.sellingPrice = 'Sell Price is required and must be greater than 0 for completed trades.';
      }
    } else {
      if (tp !== null && tp === bp) errors.targetPrice = 'Target Price cannot equal Buy Price.';
      if (isNaN(prox) || prox <= 0 || prox > 50) {
        errors.nearBuyProximityPct = 'Proximity percentage must be between 0.1% and 50%.';
      }

      if (sl !== null && sl >= bp) {
        errors.stopLoss = 'For BUY trade, Stop Loss must be less than Buy Price.';
      }
      if (tp !== null && tp <= bp) {
        errors.targetPrice = 'For BUY trade, Target Price must be greater than Buy Price.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Backup for rollback
    const originalPositions = [...positions];

    // Recalculate local row values optimistically
    const entryDate = editForm.entryDate ? new Date(editForm.entryDate).toISOString() : editingPosition.entryDate;
    const investedAmount = calculateInvestment(bp, qty);

    const finalClosedAt = editForm.closedAt ? new Date(editForm.closedAt).toISOString() : (editingPosition.closedAt || new Date().toISOString());
    const holdingPeriod = Math.max(0, Math.floor((new Date(finalClosedAt).getTime() - new Date(entryDate).getTime()) / (1000 * 60 * 60 * 24)));
    const currentValue = calculateCurrentValue(sp, qty, editForm.tradeType, bp);
    const profitLoss = calculateRealizedPnL(bp, sp, qty, editForm.tradeType);
    const profitLossPct = calculateRealizedReturnPct(bp, sp, editForm.tradeType);

    const updatedPos = {
      ...editingPosition,
      symbol,
      company,
      tradeType: editForm.tradeType,
      buyPrice: bp,
      quantity: qty,
      targetPrice: tp,
      stopLoss: sl,
      entryDate,
      notes: editForm.notes,
      nearBuyProximityPct: prox,
      muteAlertsUntil: editForm.muteAlertsUntil || null,
      investedAmount,
      currentValue,
      profitLoss,
      profitLossPct,
      sellingPrice: isSellWorkflow ? sp : undefined,
      closedAt: isSellWorkflow ? finalClosedAt : undefined,
      holdingPeriod,
      exitReason: isSellWorkflow ? editForm.exitReason : undefined,
      status: isSellWorkflow ? 'CLOSED' : editingPosition.status,
    };

    // Apply optimistic update & close drawer
    setPositions((prev) => prev.map((item) => (item.id === editingPosition.id ? updatedPos : item)));
    setShowEditDrawer(false);

    try {
      await api.patch(`/portfolio/position/${editingPosition.id}`, {
        symbol,
        company,
        tradeType: editForm.tradeType,
        buyPrice: bp,
        quantity: qty,
        targetPrice: tp,
        stopLoss: sl,
        entryDate: editForm.entryDate,
        notes: editForm.notes,
        nearBuyProximityPct: prox,
        muteAlertsUntil: editForm.muteAlertsUntil || null,
        sellingPrice: isSellWorkflow ? sp : undefined,
        closedAt: isSellWorkflow ? editForm.closedAt : undefined,
        exitReason: isSellWorkflow ? editForm.exitReason : undefined,
        status: isSellWorkflow ? 'CLOSED' : undefined,
        investorName: isEditingNewInvestor ? customEditInvestor.trim() || 'Shree' : editForm.investorName,
      });
      fetchClosedPositions();
    } catch (err: any) {
      // Rollback on failure
      setPositions(originalPositions);
      setShowEditDrawer(true);
      setApiError(err.response?.data?.message || 'Failed to save changes. Please try again.');
    }
  };

  const fetchClosedPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio');
      setPositions(res.data.positions?.closed || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load completed trades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClosedPositions();

    const handleRefresh = () => fetchClosedPositions();
    window.addEventListener('shree_manual_refresh', handleRefresh);
    return () => window.removeEventListener('shree_manual_refresh', handleRefresh);
  }, [fetchClosedPositions]);

  // Sparkline Batch Fetcher Effect
  useEffect(() => {
    if (positions.length === 0) return;
    const symbols = Array.from(new Set(positions.map((p) => p.symbol)));
    const loadSparklines = async () => {
      try {
        const res = await api.get(`/market/sparkline?symbols=${symbols.join(',')}`);
        if (res.data?.data) {
          setSparklines((prev) => ({ ...prev, ...res.data.data }));
        }
      } catch (err) {
        console.error('Failed to load sparklines:', err);
      }
    };
    loadSparklines();
  }, [positions]);

  // Sparkline Component
  const Sparkline = ({ symbol }: { symbol: string }) => {
    const prices = sparklines[symbol] || [];
    if (prices.length === 0) {
      return <div style={{ fontSize: '9px', color: subTextCol }}>Loading sparkline...</div>;
    }
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min === 0 ? 1 : max - min;
    const width = 100;
    const height = 14;
    const points = prices.map((price, idx) => {
      const x = (idx / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    const isUp = prices[prices.length - 1] >= prices[0];
    const strokeColor = isUp ? '#10B981' : '#EF4444';
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <title>{`Trend: ${isUp ? 'UP' : 'DOWN'}`}</title>
        <polyline fill="none" stroke={strokeColor} strokeWidth="1.5" points={points} />
      </svg>
    );
  };

  const confirmDelete = async () => {
    if (!deletingId || user?.role !== 'OWNER') return;
    try {
      await api.delete(`/portfolio/position/${deletingId}`);
      setDeletingId(null);
      fetchClosedPositions();
    } catch (e) {}
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

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
      const filtersText = `Filters: Investor=${investorFilter}, Exit=${statusFilter}`;
      const headerRight = `${filtersText}   |   Date: ${dateStr}   |   ${userText}`;
      doc.text(headerRight, pageWidth - 20 - doc.getTextWidth(headerRight), 24);

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 40, pageWidth, 3, 'F');
    };

    drawHeader();

    const headers = [
      'Symbol',
      'Company Name',
      'Investor',
      'Buy Price',
      'Exit Price',
      'Qty',
      'Entry Date',
      'Exit Date',
      'Duration',
      'Realized P&L',
      'Return %',
      'Potential Profit',
      'Deviation',
      'Exit Reason'
    ];

    const tableRows = filteredPositions.map((p) => {
      const isProfit = p.profitLoss >= 0;
      const deviationText = (p.missedProfit || 0) > 0 
        ? `Missed: -₹${p.missedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` 
        : ((p.extraProfit || 0) > 0 
          ? `Extra: +₹${p.extraProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` 
          : '—');
      return [
        p.symbol,
        p.company || p.symbol,
        p.investorName || 'Shree',
        `₹${p.buyPrice.toFixed(2)}`,
        `₹${(p.sellingPrice || p.currentPrice).toFixed(2)}`,
        p.quantity.toString(),
        formatDate(p.entryDate),
        formatDate(p.closedAt),
        `${p.holdingPeriod || 0} days`,
        `${isProfit ? '+' : ''}₹${p.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        `${isProfit ? '+' : ''}${formatDecimal(p.profitLossPct)}%`,
        p.targetPrice ? `₹${(p.potentialProfit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—',
        deviationText,
        p.exitReason
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 65,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 7.5, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 9 || data.column.index === 10) {
            const val = data.cell.raw as string;
            if (val.startsWith('+')) {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            } else if (val.startsWith('₹-') || val.startsWith('-')) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 70;

    if (finalY + 90 > pageHeight) {
      doc.addPage();
      drawHeader();
    }

    const startTotalY = finalY + 15;
    doc.setFillColor(248, 250, 252);
    doc.rect(20, startTotalY, pageWidth - 40, 60, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, startTotalY, pageWidth - 40, 60, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    const totalClosed = filteredPositions.length;
    const winsVal = filteredPositions.filter((p) => p.profitLoss > 0).length;
    const lossesVal = filteredPositions.filter((p) => p.profitLoss <= 0).length;
    const winRateVal = totalClosed > 0 ? (winsVal / totalClosed) * 100 : 0;
    const avgHolding = totalClosed > 0 ? filteredPositions.reduce((sum, p) => sum + (p.holdingPeriod || 0), 0) / totalClosed : 0;
    const totalRealized = filteredPositions.reduce((sum, p) => sum + p.profitLoss, 0);

    doc.text(`Total Closed Trades: ${totalClosed}`, 30, startTotalY + 20);
    doc.text(`Winning Trades: ${winsVal}   |   Losing Trades: ${lossesVal}`, 30, startTotalY + 36);
    doc.text(`Win Rate: ${winRateVal.toFixed(1)}%`, 30, startTotalY + 52);

    doc.text(`Average Holding Period: ${avgHolding.toFixed(1)} Days`, pageWidth / 2 + 10, startTotalY + 20);
    doc.setTextColor(totalRealized >= 0 ? 22 : 220, totalRealized >= 0 ? 163 : 38, totalRealized >= 0 ? 74 : 38);
    doc.text(`Total Realized Profit/Loss: ${totalRealized >= 0 ? '+' : ''}₹${totalRealized.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, pageWidth / 2 + 10, startTotalY + 36);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('SHREE ASSOCIATES  •  Confidential Valuation Report  •  Internal Use Only', 20, pageHeight - 15);
      
      const pageText = `Page ${i} of ${totalPages}`;
      doc.text(pageText, pageWidth - 20 - doc.getTextWidth(pageText), pageHeight - 15);
    }

    doc.save(`Shree_Associates_Closed_Positions_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Top 4 Summary Cards metrics
  const totalClosedTrades = positions.length;
  const realizedPnL = positions.reduce((sum, p) => sum + p.profitLoss, 0);
  const wins = positions.filter((p) => p.profitLoss > 0).length;
  const winRate = totalClosedTrades > 0 ? (wins / totalClosedTrades) * 100 : 0;
  const avgHoldingPeriod = totalClosedTrades > 0 ? positions.reduce((sum, p) => sum + (p.holdingPeriod || 0), 0) / totalClosedTrades : 0;
  const totalMissedProfit = positions.reduce((sum, p) => sum + (p.missedProfit || 0), 0);

  const sortedByProfit = [...positions].sort((a, b) => b.profitLossPct - a.profitLossPct);
  const best1 = sortedByProfit[0] || null;
  const best2 = sortedByProfit[1] || null;
  const best3 = sortedByProfit[2] || null;

  const worst1 = sortedByProfit[sortedByProfit.length - 1] || null;
  const worst2 = sortedByProfit.length > 1 ? sortedByProfit[sortedByProfit.length - 2] : null;
  const worst3 = sortedByProfit.length > 2 ? sortedByProfit[sortedByProfit.length - 3] : null;

  const performers = [
    { label: '#1 BEST', data: best1, type: 'BEST' },
    { label: '#2 BEST', data: best2, type: 'BEST' },
    { label: '#3 BEST', data: best3, type: 'BEST' },
    { label: '#1 WORST', data: worst1, type: 'WORST' },
    { label: '#2 WORST', data: worst2, type: 'WORST' },
    { label: '#3 WORST', data: worst3, type: 'WORST' },
  ].filter((p) => p.data !== null);

  useEffect(() => {
    if (performers.length === 0) return;
    const interval = setInterval(() => {
      setPerformerIndex((prev) => (prev + 1) % performers.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [performers.length]);

  const filteredPositions = positions.filter((pos) => {
    const term = search.toLowerCase();
    const matchesSearch =
      pos.symbol.toLowerCase().includes(term) ||
      pos.company.toLowerCase().includes(term) ||
      (pos.notes && pos.notes.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'ALL' || pos.exitReason === statusFilter;
    const matchesInvestor = investorFilter === 'ALL' || pos.investorName === investorFilter;
    return matchesSearch && matchesStatus && matchesInvestor;
  });

  const totalPages = Math.ceil(filteredPositions.length / itemsPerPage);
  const paginatedPositions = filteredPositions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const cardBg = 'var(--color-surface-1)';
  const borderCol = 'var(--color-border)';
  const textCol = 'var(--color-text-primary)';
  const subTextCol = 'var(--color-text-secondary)';

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 900, color: textCol, margin: 0 }}>Closed Positions History</h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
            Historical trade performance
          </p>
        </div>

        <button onClick={exportPDF} className="btnSecondary" style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '6px' }}>
          📥 Export PDF
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* TOP 5 SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Closed Trades</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{totalClosedTrades}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Completed History</div>
        </div>

        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Realized P&amp;L</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: realizedPnL >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
            {realizedPnL >= 0 ? '+' : ''}₹{realizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Locked Net Return</div>
        </div>

        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', marginBottom: '8px' }}>Trade Efficiency</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, borderRight: `1px solid ${borderCol}`, paddingRight: '12px' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#16A34A' }}>{winRate.toFixed(1)}%</div>
              <div style={{ fontSize: '11px', color: subTextCol, marginTop: '2px' }}>Win Rate</div>
            </div>
            <div style={{ flex: 1, paddingLeft: '12px' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: textCol }}>{avgHoldingPeriod.toFixed(1)}d</div>
              <div style={{ fontSize: '11px', color: subTextCol, marginTop: '2px' }}>Avg Holding</div>
            </div>
          </div>
        </div>

        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Missed Target Profit</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#EA580C', marginTop: '6px' }}>
              ₹{totalMissedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <button
            onClick={() => setShowMissedProfitModal(true)}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${borderCol}`,
              backgroundColor: '#F1F5F9',
              color: textCol,
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              alignSelf: 'flex-start'
            }}
          >
            🔍 Analyze Missed
          </button>
        </div>

        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {performers.length > 0 && performers[performerIndex] ? (
            <div key={performerIndex} className="animate-fade-slide">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {performers[performerIndex].type === 'BEST' ? <TrendingUp size={14} color="#16A34A" /> : <TrendingDown size={14} color="#DC2626" />}
                  {performers[performerIndex].label}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: textCol }}>
                  {performers[performerIndex].data.symbol}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: performers[performerIndex].type === 'BEST' ? '#16A34A' : '#DC2626' }}>
                {performers[performerIndex].data.profitLoss >= 0 ? '+' : ''}₹{performers[performerIndex].data.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: performers[performerIndex].type === 'BEST' ? '#16A34A' : '#DC2626', marginTop: '4px' }}>
                {performers[performerIndex].data.profitLossPct >= 0 ? '+' : ''}{formatDecimal(performers[performerIndex].data.profitLossPct)}%
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: subTextCol, fontStyle: 'italic', display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'center' }}>No enough trades</div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: 'stretch' }}>
        <input
          type="text"
          placeholder="🔍 Search closed symbol..."
          value={displaySearch}
          onChange={(e) => setDisplaySearch(e.target.value)}
          style={{ width: isMobile ? '100%' : '260px', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: '#F8FAFC', color: textCol, fontSize: '13px' }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: '#F8FAFC', color: textCol, fontSize: '13px' }}>
          <option value="ALL">All Exit Reasons</option>
          <option value="TARGET_HIT">🎯 Target Hit</option>
          <option value="STOP_LOSS_HIT">🛑 Stop Loss Hit</option>
          <option value="MANUAL_EXIT">Manual Exit</option>
        </select>
        <select value={investorFilter} onChange={(e) => setInvestorFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: '#F8FAFC', color: textCol, fontSize: '13px' }}>
          <option value="ALL">All Investors</option>
          {Array.from(new Set(positions.map((p) => p.investorName).filter(Boolean))).map((inv: any) => (
            <option key={inv} value={inv}>{inv}</option>
          ))}
        </select>
      </div>

      {/* Closed Positions Table */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} style={{ height: '48px', borderRadius: '8px', backgroundColor: '#F1F5F9', opacity: 0.6, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
                <div style={{ width: '120px', height: '14px', borderRadius: '4px', backgroundColor: '#E2E8F0' }} />
                <div style={{ width: '80px', height: '14px', borderRadius: '4px', backgroundColor: '#E2E8F0' }} />
                <div style={{ width: '100px', height: '14px', borderRadius: '4px', backgroundColor: '#E2E8F0' }} />
              </div>
            ))}
          </div>
        ) : filteredPositions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                <History size={32} />
              </div>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: textCol, margin: 0 }}>No Closed Positions Recorded</h3>
            <p style={{ fontSize: '13px', color: subTextCol, marginTop: '4px' }}>
              Closed positions will automatically record trade duration badges and net realized profit/loss.
            </p>
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
            {paginatedPositions.map((pos) => {
              const isProfit = pos.profitLoss >= 0;

              return (
                <div
                  key={pos.id}
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: textCol }} title={pos.company}>{pos.symbol}</div>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: pos.exitReason === 'TARGET_HIT' ? '#DCFCE7' : pos.exitReason === 'STOP_LOSS_HIT' ? '#FEE2E2' : '#F1F5F9',
                          color: pos.exitReason === 'TARGET_HIT' ? '#15803D' : pos.exitReason === 'STOP_LOSS_HIT' ? '#991B1B' : '#64748B',
                        }}
                      >
                        {pos.exitReason === 'TARGET_HIT' ? 'Target Hit' : pos.exitReason === 'STOP_LOSS_HIT' ? 'SL Hit' : 'Manual Exit'}
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${borderCol}`, margin: '4px 0' }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: subTextCol }}>Buy Price: </span>
                      <strong style={{ color: textCol }}>₹{pos.buyPrice?.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ color: subTextCol }}>Exit Price: </span>
                      <strong style={{ color: textCol }}>₹{(pos.sellingPrice || pos.currentPrice)?.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ color: subTextCol }}>Quantity: </span>
                      <strong style={{ color: textCol }}>{pos.quantity}</strong>
                    </div>
                    <div>
                      <span style={{ color: subTextCol }}>Duration: </span>
                      <strong style={{ color: textCol }}>{pos.holdingPeriod || 0} Days</strong>
                    </div>
                    <div>
                      <span style={{ color: subTextCol }}>Entry Date: </span>
                      <strong style={{ color: textCol }}>{formatDate(pos.entryDate)}</strong>
                    </div>
                    <div>
                      <span style={{ color: subTextCol }}>Exit Date: </span>
                      <strong style={{ color: textCol }}>{formatDate(pos.closedAt)}</strong>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${borderCol}`, margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: subTextCol }}>Realized P&amp;L:</span>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626' }}>
                        {isProfit ? '+' : ''}₹{pos.profitLoss?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: subTextCol }}>Return %:</span>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626' }}>
                        {isProfit ? '+' : ''}{formatDecimal(pos.profitLossPct)}%
                      </div>
                    </div>
                  </div>

                  {pos.targetPrice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '8px', fontSize: '12px', marginTop: '4px' }}>
                      <div>
                        <span style={{ color: subTextCol }}>Potential: </span>
                        <strong style={{ color: textCol }}>₹{(pos.potentialProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {(pos.missedProfit || 0) > 0 && (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>
                            Missed: -₹{pos.missedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        {(pos.extraProfit || 0) > 0 && (
                          <span style={{ color: '#16A34A', fontWeight: 700 }}>
                            Extra: +₹{pos.extraProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        {!(pos.missedProfit || 0) && !(pos.extraProfit || 0) && <span style={{ color: subTextCol }}>No deviation</span>}
                      </div>
                    </div>
                  )}

                  {user?.role === 'OWNER' && (
                    <>
                      <div style={{ borderTop: `1px solid ${borderCol}`, margin: '8px 0' }} />
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          onClick={() => handleOpenEditDrawer(pos)}
                          style={{
                            flex: 1,
                            height: '44px',
                            borderRadius: '8px',
                            border: `1px solid ${borderCol}`,
                            backgroundColor: '#FFFFFF',
                            color: textCol,
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <Pencil size={14} /> Edit Record
                        </button>
                        <button
                          onClick={() => setDeletingId(pos.id)}
                          style={{
                            flex: 1,
                            height: '44px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `2px solid ${borderCol}`, color: subTextCol, textAlign: 'left' }}>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Symbol &amp; Trend</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Buy Price</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Exit Price</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Qty</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Entry Date</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Exit Date</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Trade Duration</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Realized P&amp;L</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Return %</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Potential Profit</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Missed / Extra Profit</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Exit Reason</th>
                  {user?.role === 'OWNER' && <th style={{ padding: '12px', textAlign: 'center', width: '90px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedPositions.map((pos) => {
                  const isProfit = pos.profitLoss >= 0;
                  return (
                    <tr key={pos.id} className="hover-row" style={{ borderBottom: `1px solid ${borderCol}` }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 800, color: textCol, fontSize: '13.5px' }}>{pos.symbol}</span>
                          </div>
                          
                          {/* Sparkline directly below symbol */}
                          <div style={{ width: '100px', height: '14px', display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                            <Sparkline symbol={pos.symbol} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', fontVariantNumeric: 'tabular-nums' }}>₹{formatDecimal(pos.buyPrice)}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₹{formatDecimal(pos.sellingPrice || pos.currentPrice)}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{pos.quantity}</td>
                      <td style={{ padding: '12px 10px', fontVariantNumeric: 'tabular-nums' }}>{formatDate(pos.entryDate)}</td>
                      <td style={{ padding: '12px 10px', fontVariantNumeric: 'tabular-nums' }}>{formatDate(pos.closedAt)}</td>
                      
                      {/* TRADE DURATION BADGE */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#F1F5F9', color: textCol, fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {pos.holdingPeriod || 0} Days
                        </span>
                      </td>

                      <td style={{ padding: '12px 10px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                        {isProfit ? '+' : ''}₹{formatDecimal(pos.profitLoss)}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                        {isProfit ? '+' : ''}{formatDecimal(pos.profitLossPct)}%
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: textCol, fontVariantNumeric: 'tabular-nums' }}>
                        {pos.targetPrice ? `₹${formatDecimal(pos.potentialProfit)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 10px', fontVariantNumeric: 'tabular-nums' }}>
                        {(pos.missedProfit || 0) > 0 && (
                          <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 700 }}>
                            Missed: -₹{formatDecimal(pos.missedProfit)}
                          </span>
                        )}
                        {(pos.extraProfit || 0) > 0 && (
                          <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700 }}>
                            Extra: +₹{formatDecimal(pos.extraProfit)}
                          </span>
                        )}
                        {!(pos.missedProfit || 0) && !(pos.extraProfit || 0) && '—'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: pos.exitReason === 'TARGET_HIT' ? '#DCFCE7' : pos.exitReason === 'STOP_LOSS_HIT' ? '#FEE2E2' : '#F1F5F9',
                            color: pos.exitReason === 'TARGET_HIT' ? '#15803D' : pos.exitReason === 'STOP_LOSS_HIT' ? '#991B1B' : '#64748B',
                          }}
                        >
                          {pos.exitReason === 'TARGET_HIT' ? 'Target Hit' : pos.exitReason === 'STOP_LOSS_HIT' ? 'SL Hit' : 'Manual Exit'}
                        </span>
                      </td>

                      {user?.role === 'OWNER' && (
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditDrawer(pos)}
                              title="Edit"
                              style={{ padding: '6px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: '#FFFFFF', color: textCol, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingId(pos.id)}
                              title="Delete"
                              style={{ padding: '6px', borderRadius: '6px', border: 'none', backgroundColor: '#FEE2E2', color: '#991B1B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 18px', borderTop: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12.5px', color: subTextCol }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPositions.length)} of {filteredPositions.length} positions
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, background: 'none', color: textCol, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                Previous
              </button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, background: 'none', color: textCol, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '380px', backgroundColor: cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${borderCol}`, color: textCol }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 900, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 size={18} /> Delete Closed Position</h3>
            <p style={{ fontSize: '13px', color: subTextCol, margin: '0 0 16px 0' }}>
              Are you sure you want to delete this closed position permanently from history?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDeletingId(null)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Drawer (REQ 2, 3) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          opacity: showEditDrawer ? 1 : 0,
          pointerEvents: showEditDrawer ? 'auto' : 'none',
          transition: 'opacity 0.25s ease-in-out',
        }}
        onClick={() => {
          setShowEditDrawer(false);
          setEditingPosition(null);
          setValidationErrors({});
          setApiError(null);
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: isMobile ? '100%' : '520px',
            height: '100%',
            backgroundColor: cardBg,
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.15)',
            transform: showEditDrawer ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div style={{ padding: '24px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: textCol }}>
                {editForm.tradeType === 'SELL' ? '📝 Record/Edit Historical Trade' : '✏️ Edit Position Parameters'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: subTextCol }}>Modify position parameters & trade configurations.</p>
            </div>
            <button
              onClick={() => {
                setShowEditDrawer(false);
                setEditingPosition(null);
                setValidationErrors({});
                setApiError(null);
              }}
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: subTextCol }}
            >
              ❌
            </button>
          </div>

          {/* Drawer Form Scrollable */}
          <form onSubmit={handleEditSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {apiError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px' }}>
                ⚠️ {apiError}
              </div>
            )}

            {/* Read-Only Stats Preview (Req 3) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: `1px solid ${borderCol}` }}>
              <div>
                <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>
                  {editForm.tradeType === 'SELL' ? 'Exit Price (Sell Price)' : 'Current Price (CMP)'}
                </span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#16A34A', marginTop: '3px' }}>
                  ₹{editForm.tradeType === 'SELL' ? (parseFloat(editForm.sellingPrice) || 0) : (editingPosition?.currentPrice || 0)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>
                  {editForm.tradeType === 'SELL' ? 'Holding Period' : 'Days Held'}
                </span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: textCol, marginTop: '3px' }}>
                  {(() => {
                    const buyDate = new Date(editForm.entryDate || new Date());
                    const sellDate = editForm.tradeType === 'SELL' ? new Date(editForm.closedAt || new Date()) : new Date();
                    return Math.max(0, Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)));
                  })()} Days
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '8px', gridColumn: 'span 2' }} />
              <div>
                <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Investment Value</span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: textCol, marginTop: '2px' }}>
                  ₹{((parseFloat(editForm.buyPrice) || 0) * (parseFloat(editForm.quantity) || 0)).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>
                  {editForm.tradeType === 'SELL' ? 'Exit Value' : 'Current Value'}
                </span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: textCol, marginTop: '2px' }}>
                  ₹{((editForm.tradeType === 'SELL' ? (parseFloat(editForm.sellingPrice) || 0) : (editingPosition?.currentPrice || 0)) * (parseFloat(editForm.quantity) || 0)).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '8px', gridColumn: 'span 2' }} />
              <div>
                <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>
                  {editForm.tradeType === 'SELL' ? 'Realized P&L' : 'Live P&L'}
                </span>
                <div style={{ fontSize: '14px', fontWeight: 900, color: (() => {
                  const profit = editForm.tradeType === 'SELL'
                    ? ((parseFloat(editForm.sellingPrice) || 0) - (parseFloat(editForm.buyPrice) || 0)) * (parseFloat(editForm.quantity) || 0)
                    : ((editingPosition?.currentPrice || 0) - (parseFloat(editForm.buyPrice) || 0)) * (parseFloat(editForm.quantity) || 0) - (editingPosition?.brokerCharges || 0);
                  return profit >= 0 ? '#16A34A' : '#DC2626';
                })(), marginTop: '2px' }}>
                  ₹{(() => {
                    const profit = editForm.tradeType === 'SELL'
                      ? ((parseFloat(editForm.sellingPrice) || 0) - (parseFloat(editForm.buyPrice) || 0)) * (parseFloat(editForm.quantity) || 0)
                      : ((editingPosition?.currentPrice || 0) - (parseFloat(editForm.buyPrice) || 0)) * (parseFloat(editForm.quantity) || 0) - (editingPosition?.brokerCharges || 0);
                    return profit.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                  })()}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Risk/Reward Ratio</span>
                <div style={{ fontSize: '14px', fontWeight: 900, color: textCol, marginTop: '2px' }}>
                  {(() => {
                    if (editForm.tradeType === 'SELL') return 'N/A';
                    const bp = parseFloat(editForm.buyPrice) || 0;
                    const tp = parseFloat(editForm.targetPrice) || 0;
                    const sl = parseFloat(editForm.stopLoss) || 0;
                    const risk = bp - sl;
                    const reward = tp - bp;
                    return risk > 0 && reward > 0 ? (reward / risk).toFixed(2) : 'N/A';
                  })()}
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '8px', gridColumn: 'span 2' }} />
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', color: subTextCol, fontWeight: 700, textTransform: 'uppercase' }}>Last Updated</span>
                <div style={{ fontSize: '12px', fontWeight: 700, color: textCol, marginTop: '2px' }}>
                  {editingPosition?.updatedAt ? new Date(editingPosition.updatedAt).toLocaleString('en-IN') : 'N/A'}
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Company Name</label>
              <input
                type="text"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Stock Symbol</label>
              <input
                type="text"
                value={editForm.symbol}
                onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value.toUpperCase() })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
              />
              {validationErrors.symbol && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.symbol}</span>}
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Trade Type</label>
              <select
                value={editForm.tradeType}
                onChange={(e) => setEditForm({ ...editForm, tradeType: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Investor Name *</label>
              {isEditingNewInvestor ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="text"
                    placeholder="New Investor Name..."
                    value={customEditInvestor}
                    onChange={(e) => setCustomEditInvestor(e.target.value)}
                    required
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingNewInvestor(false)}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: '#FFFFFF', color: textCol, cursor: 'pointer', fontSize: '12px' }}
                  >
                    Choose Existing
                  </button>
                </div>
              ) : (
                <select
                  value={editForm.investorName || 'Shree'}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsEditingNewInvestor(true);
                    } else {
                      setEditForm({ ...editForm, investorName: e.target.value });
                    }
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                >
                  {Array.from(new Set(['Shree', 'Priya', 'Rahul', 'Amit', ...positions.map(p => p.investorName).filter(Boolean)])).map(inv => (
                    <option key={inv} value={inv}>{inv}</option>
                  ))}
                  <option value="__NEW__">+ Create New Investor...</option>
                </select>
              )}
            </div>

            {editForm.tradeType === 'SELL' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Buy Price</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.buyPrice}
                      onChange={(e) => setEditForm({ ...editForm, buyPrice: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.buyPrice && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.buyPrice}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Sell Price *</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.sellingPrice}
                      onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.sellingPrice && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.sellingPrice}</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Quantity</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.quantity && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.quantity}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Exit Reason</label>
                    <select
                      value={editForm.exitReason}
                      onChange={(e) => setEditForm({ ...editForm, exitReason: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    >
                      <option value="TARGET_HIT">Target Hit</option>
                      <option value="MANUAL_EXIT">Manual Exit</option>
                      <option value="STOP_LOSS_HIT">Stop Loss Hit</option>
                      <option value="TIME_EXIT">Time Exit</option>
                      <option value="PARTIAL_EXIT">Partial Exit</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Buy Date</label>
                    <input
                      type="date"
                      value={editForm.entryDate}
                      onChange={(e) => setEditForm({ ...editForm, entryDate: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Sell Date</label>
                    <input
                      type="date"
                      value={editForm.closedAt}
                      onChange={(e) => setEditForm({ ...editForm, closedAt: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Target Price (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.targetPrice}
                      onChange={(e) => setEditForm({ ...editForm, targetPrice: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Stop Loss (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.stopLoss}
                      onChange={(e) => setEditForm({ ...editForm, stopLoss: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Buy Price</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.buyPrice}
                      onChange={(e) => setEditForm({ ...editForm, buyPrice: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.buyPrice && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.buyPrice}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Quantity</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.quantity && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.quantity}</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Target Price</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.targetPrice}
                      onChange={(e) => setEditForm({ ...editForm, targetPrice: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.targetPrice && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.targetPrice}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Stop Loss</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.stopLoss}
                      onChange={(e) => setEditForm({ ...editForm, stopLoss: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.stopLoss && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.stopLoss}</span>}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Buy Date</label>
                  <input
                    type="date"
                    value={editForm.entryDate}
                    onChange={(e) => setEditForm({ ...editForm, entryDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Proximity Alert (±%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.nearBuyProximityPct}
                      onChange={(e) => setEditForm({ ...editForm, nearBuyProximityPct: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.nearBuyProximityPct && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.nearBuyProximityPct}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Mute Alerts Until</label>
                    <input
                      type="date"
                      value={editForm.muteAlertsUntil}
                      onChange={(e) => setEditForm({ ...editForm, muteAlertsUntil: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', height: '80px', backgroundColor: '#FFFFFF', color: textCol }}
              />
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: `1px solid ${borderCol}`, paddingTop: '18px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowEditDrawer(false);
                  setEditingPosition(null);
                  setValidationErrors({});
                  setApiError(null);
                }}
                className="btnSecondary"
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btnPrimary"
                style={{ padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, backgroundColor: '#16A34A' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* Missed Profit Analysis Modal */}
      {showMissedProfitModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '800px', maxHeight: '80vh', padding: '24px', backgroundColor: cardBg, color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderCol}`, paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>📉 Missed Profit Opportunities Analysis</h3>
              <button onClick={() => setShowMissedProfitModal(false)} style={{ border: 'none', background: 'none', fontSize: '16px', cursor: 'pointer', color: subTextCol }}>❌</button>
            </div>
            
            {/* Sorting controls */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: subTextCol }}>Sort by:</span>
              <select
                value={missedSortBy}
                onChange={(e) => setMissedSortBy(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: '#FFFFFF', color: textCol, fontSize: '12.5px' }}
              >
                <option value="missedProfit">Gains Missed (₹)</option>
                <option value="symbol">Symbol</option>
                <option value="investor">Investor</option>
                <option value="sector">Sector / Asset</option>
              </select>
              <select
                value={missedSortOrder}
                onChange={(e) => setMissedSortOrder(e.target.value as any)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: '#FFFFFF', color: textCol, fontSize: '12.5px' }}
              >
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${borderCol}`, color: subTextCol }}>
                    <th style={{ padding: '8px' }}>Symbol</th>
                    <th style={{ padding: '8px' }}>Investor</th>
                    <th style={{ padding: '8px' }}>Sector / Asset</th>
                    <th style={{ padding: '8px' }}>Target Price</th>
                    <th style={{ padding: '8px' }}>Exit Price</th>
                    <th style={{ padding: '8px', color: '#EF4444' }}>Missed profit</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const closedWithMissed = positions.filter((p) => (p.missedProfit || 0) > 0);
                    const sortedMissed = [...closedWithMissed].sort((a, b) => {
                      let valA: any = 0;
                      let valB: any = 0;
                      if (missedSortBy === 'missedProfit') {
                        valA = a.missedProfit;
                        valB = b.missedProfit;
                      } else if (missedSortBy === 'symbol') {
                        valA = a.symbol;
                        valB = b.symbol;
                      } else if (missedSortBy === 'investor') {
                        valA = a.investorName || '';
                        valB = b.investorName || '';
                      } else if (missedSortBy === 'sector') {
                        valA = a.assetType || '';
                        valB = b.assetType || '';
                      }
                      
                      if (typeof valA === 'string') {
                        return missedSortOrder === 'asc' 
                          ? valA.localeCompare(valB) 
                          : valB.localeCompare(valA);
                      }
                      
                      return missedSortOrder === 'asc' ? valA - valB : valB - valA;
                    });

                    return sortedMissed.map((p) => (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                        <td style={{ padding: '10px 8px', fontWeight: 800 }}>{p.symbol}</td>
                        <td style={{ padding: '10px 8px' }}>{p.investorName || 'Shree'}</td>
                        <td style={{ padding: '10px 8px' }}>{p.assetType || 'STOCK'}</td>
                        <td style={{ padding: '10px 8px' }}>₹{p.targetPrice?.toFixed(2) || '—'}</td>
                        <td style={{ padding: '10px 8px' }}>₹{p.sellingPrice?.toFixed(2) || '—'}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: '#EF4444' }}>
                          ₹{p.missedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ));
                  })()}
                  {positions.filter((p) => (p.missedProfit || 0) > 0).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: subTextCol }}>
                        No missed profits recorded! Efficiency is at 100%.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowMissedProfitModal(false)} style={{ padding: '8px 16px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Dismiss Analysis
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
