'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';

export default function OpenPositionsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [positions, setPositions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter, Sort, Pagination
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('entryDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [closingPosition, setClosingPosition] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Close Form
  const [closePrice, setClosePrice] = useState('');
  const [closeReason, setCloseReason] = useState('MANUAL_EXIT');
  const [closeNotes, setCloseNotes] = useState('');

  // Add Position Form
  const [newSymbol, setNewSymbol] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newType, setNewType] = useState('BUY');
  const [newBuyPrice, setNewBuyPrice] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newStop, setNewStop] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));
  const [newSellPrice, setNewSellPrice] = useState('');
  const [newSellDate, setNewSellDate] = useState(new Date().toISOString().substring(0, 10));
  const [newExitReason, setNewExitReason] = useState('MANUAL_EXIT');

  // Edit Drawer State
  const [editingPosition, setEditingPosition] = useState<any | null>(null);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editForm, setEditForm] = useState({
    company: '',
    symbol: '',
    tradeType: 'BUY',
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
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio');
      const openList = res.data.positions?.open || [];
      setPositions(openList);
      setSummary(res.data.summary || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch open positions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 60000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // Open Edit Drawer
  const handleOpenEditDrawer = (pos: any) => {
    setEditingPosition(pos);
    setEditForm({
      company: pos.company || '',
      symbol: pos.symbol || '',
      tradeType: pos.tradeType || 'BUY',
      buyPrice: pos.buyPrice ? pos.buyPrice.toString() : '',
      quantity: pos.quantity ? pos.quantity.toString() : '',
      targetPrice: pos.targetPrice ? pos.targetPrice.toString() : '',
      stopLoss: pos.stopLoss ? pos.stopLoss.toString() : '',
      entryDate: pos.entryDate ? new Date(pos.entryDate).toISOString().substring(0, 10) : '',
      notes: pos.notes || '',
      nearBuyProximityPct: pos.nearBuyProximityPct ? pos.nearBuyProximityPct.toString() : '1.0',
      muteAlertsUntil: pos.muteAlertsUntil ? new Date(pos.muteAlertsUntil).toISOString().substring(0, 10) : '',
      sellingPrice: pos.sellingPrice ? pos.sellingPrice.toString() : '',
      closedAt: pos.closedAt ? new Date(pos.closedAt).toISOString().substring(0, 10) : '',
      exitReason: pos.exitReason || 'MANUAL_EXIT',
    });
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
    const investedAmount = bp * qty;

    let currentValue = editingPosition.currentPrice * qty;
    let profitLoss = 0;
    let profitLossPct = 0;
    let finalClosedAt = editingPosition.closedAt;
    let holdingPeriod = editingPosition.holdingPeriod;

    if (isSellWorkflow) {
      currentValue = sp * qty;
      profitLoss = currentValue - investedAmount;
      profitLossPct = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;
      finalClosedAt = editForm.closedAt ? new Date(editForm.closedAt).toISOString() : new Date().toISOString();
      holdingPeriod = Math.max(0, Math.floor((new Date(finalClosedAt).getTime() - new Date(entryDate).getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      currentValue = editingPosition.currentPrice * qty;
      profitLoss = (editingPosition.currentPrice - bp) * qty - editingPosition.brokerCharges;
      profitLossPct = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;
    }

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
      });
      fetchPositions();
    } catch (err: any) {
      // Rollback on failure
      setPositions(originalPositions);
      setShowEditDrawer(true);
      setApiError(err.response?.data?.message || 'Failed to save changes. Please try again.');
    }
  };

  // Add Position
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'OWNER') return;

    const qty = parseFloat(newQty);
    const bp = parseFloat(newBuyPrice);

    if (isNaN(qty) || qty <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }
    if (isNaN(bp) || bp <= 0) {
      alert('Buy Price must be greater than 0.');
      return;
    }

    try {
      if (newType === 'SELL') {
        const sp = parseFloat(newSellPrice);
        if (isNaN(sp) || sp <= 0) {
          alert('Sell Price is required and must be greater than 0 for completed historical trades.');
          return;
        }

        await api.post('/portfolio/position', {
          symbol: newSymbol.toUpperCase(),
          company: newCompany || newSymbol,
          tradeType: newType,
          buyPrice: bp,
          sellingPrice: sp,
          quantity: qty,
          targetPrice: newTarget ? parseFloat(newTarget) : null,
          stopLoss: newStop ? parseFloat(newStop) : null,
          notes: newNotes,
          entryDate: newDate,
          sellDate: newSellDate,
          exitReason: newExitReason,
        });
      } else {
        await api.post('/portfolio/position', {
          symbol: newSymbol.toUpperCase(),
          company: newCompany || newSymbol,
          tradeType: newType,
          buyPrice: bp,
          quantity: qty,
          targetPrice: newTarget ? parseFloat(newTarget) : null,
          stopLoss: newStop ? parseFloat(newStop) : null,
          notes: newNotes,
          entryDate: newDate,
        });
      }

      setShowAddModal(false);
      setNewSymbol('');
      setNewCompany('');
      setNewBuyPrice('');
      setNewQty('');
      setNewTarget('');
      setNewStop('');
      setNewNotes('');
      setNewSellPrice('');
      setNewSellDate(new Date().toISOString().substring(0, 10));
      setNewExitReason('MANUAL_EXIT');
      fetchPositions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add position.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId || user?.role !== 'OWNER') return;
    try {
      await api.delete(`/portfolio/position/${deletingId}`);
      setDeletingId(null);
      fetchPositions();
    } catch (e) {}
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0 || user?.role !== 'OWNER') return;
    try {
      await api.post('/portfolio/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      fetchPositions();
    } catch (e) {}
  };

  // Close Submit
  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingPosition || user?.role !== 'OWNER') return;
    try {
      await api.patch(`/portfolio/position/${closingPosition.id}/close`, {
        sellingPrice: parseFloat(closePrice),
        exitReason: closeReason,
        notes: closeNotes,
      });
      setClosingPosition(null);
      fetchPositions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to close trade.');
    }
  };

  const getTargetRemaining = (pos: any) => {
    if (!pos.targetPrice) return { text: 'N/A', pct: null };
    const diff = pos.tradeType === 'SELL' ? pos.currentPrice - pos.targetPrice : pos.targetPrice - pos.currentPrice;
    const pct = (diff / pos.currentPrice) * 100;
    return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, pct };
  };

  const getStopRemaining = (pos: any) => {
    if (!pos.stopLoss) return { text: 'N/A', pct: null, isWarning: false };
    const diff = pos.tradeType === 'SELL' ? pos.stopLoss - pos.currentPrice : pos.currentPrice - pos.stopLoss;
    const pct = (diff / pos.currentPrice) * 100;
    return { text: `${pct.toFixed(2)}%`, pct, isWarning: pct <= 2.0 };
  };

  const exportCSV = () => {
    const headers = 'Symbol,Company,Trade Type,Quantity,Buy Price,CMP,Invested Amount,Current Value,Profit/Loss,Profit %';
    const rows = positions.map(
      (p) => `${p.symbol},"${p.company}",${p.tradeType},${p.quantity},${p.buyPrice},${p.currentPrice},${p.investedAmount},${p.currentValue},${p.profitLoss},${p.profitLossPct}`
    );
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Open_Positions_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  // KPI summaries
  const totalOpenTrades = positions.length;
  const currentExposure = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const overallPnL = positions.reduce((sum, p) => sum + p.profitLoss, 0);

  // Top Highlights (Req 8)
  const highestPos = summary?.highestPerformingOpen || (positions.length > 0 ? [...positions].sort((a, b) => b.profitLossPct - a.profitLossPct)[0] : null);
  const secondHighestPos = summary?.secondHighestPerformingOpen || (positions.length > 1 ? [...positions].sort((a, b) => b.profitLossPct - a.profitLossPct)[1] : null);

  // Filtering & Sorting
  const filteredPositions = positions
    .filter((pos) => {
      const term = search.toLowerCase();
      const matchesSearch =
        pos.symbol.toLowerCase().includes(term) ||
        pos.company.toLowerCase().includes(term) ||
        (pos.notes && pos.notes.toLowerCase().includes(term));
      const matchesType = typeFilter === 'ALL' || pos.tradeType === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'entryDate') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredPositions.length / itemsPerPage);
  const paginatedPositions = filteredPositions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header Panel */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: textCol, margin: 0 }}>Open Positions</h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
            Live active trades, right-side configuration editor, and real-time target/stop proximity metrics.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportCSV} className="btnSecondary" style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px' }}>
            📥 Export CSV
          </button>
          {user?.role === 'OWNER' && (
            <button onClick={() => setShowAddModal(true)} className="btnPrimary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', backgroundColor: '#16A34A' }}>
              ➕ Create Position
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Highlights & KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Open Trades</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{totalOpenTrades}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Active Allocations</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Current Exposure</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>₹{currentExposure.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Total Market Value</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Unrealized Live P&amp;L</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: overallPnL >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
            {overallPnL >= 0 ? '+' : ''}₹{overallPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Open Profit/Loss</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase' }}>🏆 #1 Top Performer</span>
            {highestPos && <span style={{ fontSize: '10.5px', fontWeight: 800, color: textCol }}>₹{highestPos.currentPrice}</span>}
          </div>
          {highestPos ? (
            <>
              <div style={{ fontSize: '16px', fontWeight: 900, color: textCol, marginTop: '4px' }}>{highestPos.company} ({highestPos.symbol})</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#16A34A' }}>+{highestPos.profitLossPct.toFixed(2)}%</span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: subTextCol }}>(+₹{highestPos.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })})</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12.5px', color: subTextCol, marginTop: '10px' }}>No Active Trades</div>
          )}
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase' }}>🥈 #2 Top Performer</span>
            {secondHighestPos && <span style={{ fontSize: '10.5px', fontWeight: 800, color: textCol }}>₹{secondHighestPos.currentPrice}</span>}
          </div>
          {secondHighestPos ? (
            <>
              <div style={{ fontSize: '16px', fontWeight: 900, color: textCol, marginTop: '4px' }}>{secondHighestPos.company} ({secondHighestPos.symbol})</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: secondHighestPos.profitLossPct >= 0 ? '#16A34A' : '#DC2626' }}>
                  {secondHighestPos.profitLossPct >= 0 ? '+' : ''}{secondHighestPos.profitLossPct.toFixed(2)}%
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: subTextCol }}>
                  ({secondHighestPos.profitLoss >= 0 ? '+' : ''}₹{secondHighestPos.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })})
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12.5px', color: subTextCol, marginTop: '10px' }}>No Active Trades</div>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="Search symbol, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', flex: 1, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
          >
            <option value="ALL">All Types</option>
            <option value="BUY">BUY Only</option>
            <option value="SELL">SELL Only</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(order as any);
            }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
          >
            <option value="entryDate-desc">Newest First</option>
            <option value="entryDate-asc">Oldest First</option>
            <option value="profitLossPct-desc">Highest Profit %</option>
            <option value="profitLossPct-asc">Lowest Profit %</option>
            <option value="currentValue-desc">Highest Value</option>
          </select>
        </div>

        {selectedIds.length > 0 && user?.role === 'OWNER' && (
          <button onClick={() => setShowBulkDeleteConfirm(true)} style={{ padding: '8px 14px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
            🗑️ Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* TABLE */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
        {loading && positions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: subTextCol }}>Loading live open positions...</div>
        ) : filteredPositions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>💼</div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: textCol, margin: 0 }}>No Open Positions Found</h3>
            <p style={{ fontSize: '13px', color: subTextCol, marginTop: '4px', marginBottom: '16px' }}>
              Create your first trade allocation to start tracking live market positions.
            </p>
            {user?.role === 'OWNER' && (
              <button onClick={() => setShowAddModal(true)} className="btnPrimary" style={{ padding: '10px 20px', fontSize: '13px', backgroundColor: '#16A34A', borderRadius: '8px' }}>
                ➕ Create First Trade
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderBottom: `2px solid ${borderCol}`, color: subTextCol, textAlign: 'left' }}>
                  {user?.role === 'OWNER' && <th style={{ padding: '12px', width: '30px', textAlign: 'center' }}>✓</th>}
                  <th style={{ padding: '12px', fontWeight: 800 }}>Symbol</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Company</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Type</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Qty</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Buy Price</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>CMP</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Target</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Stop Loss</th>
                  <th style={{ padding: '12px', fontWeight: 800, color: '#16A34A' }}>Target Rem.</th>
                  <th style={{ padding: '12px', fontWeight: 800, color: '#DC2626' }}>Stop Rem.</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Holding</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Invested</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Current Val</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Live P&amp;L</th>
                  {user?.role === 'OWNER' && <th style={{ padding: '12px', textAlign: 'center', width: '220px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedPositions.map((pos) => {
                  const targetRem = getTargetRemaining(pos);
                  const stopRem = getStopRemaining(pos);
                  const isProfit = pos.profitLoss >= 0;

                  return (
                    <tr key={pos.id} style={{ borderBottom: `1px solid ${borderCol}`, backgroundColor: stopRem.isWarning ? (isDark ? '#451A1A' : '#FFF5F5') : 'transparent' }}>
                      {user?.role === 'OWNER' && (
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(pos.id)}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(pos.id) ? prev.filter((i) => i !== pos.id) : [...prev, pos.id]
                              )
                            }
                          />
                        </td>
                      )}

                      <td style={{ padding: '10px', fontWeight: 800, color: textCol }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div>{pos.symbol}</div>
                          {pos.atBuyPrice && (
                            <span style={{ fontSize: '9.5px', fontWeight: 900, backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '4px', width: 'fit-content' }}>
                              🎯 At Buy Price
                            </span>
                          )}
                          {!pos.atBuyPrice && pos.nearBuyPrice && (
                            <span style={{ fontSize: '9.5px', fontWeight: 900, backgroundColor: '#FEF3C7', color: '#B45309', padding: '1px 5px', borderRadius: '4px', width: 'fit-content' }}>
                              📍 Near Buy (±1%)
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '10px', color: subTextCol }}>{pos.company}</td>

                      <td style={{ padding: '10px', fontWeight: 700 }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: pos.tradeType === 'BUY' ? '#DCFCE7' : '#FEE2E2', color: pos.tradeType === 'BUY' ? '#15803D' : '#991B1B', fontSize: '11px', fontWeight: 800 }}>
                          {pos.tradeType}
                        </span>
                      </td>

                      <td style={{ padding: '10px', fontWeight: 600 }}>{pos.quantity}</td>

                      <td style={{ padding: '10px', fontWeight: 700 }}>₹{pos.buyPrice}</td>

                      <td style={{ padding: '10px', fontWeight: 800, color: '#16A34A' }}>₹{pos.currentPrice}</td>

                      <td style={{ padding: '10px', color: '#16A34A', fontWeight: 700 }}>{pos.targetPrice ? `₹${pos.targetPrice}` : '-'}</td>

                      <td style={{ padding: '10px', color: '#DC2626', fontWeight: 700 }}>{pos.stopLoss ? `₹${pos.stopLoss}` : '-'}</td>

                      <td style={{ padding: '10px', fontWeight: 700, color: '#16A34A' }}>{targetRem.text}</td>

                      <td style={{ padding: '10px', fontWeight: 700, color: '#DC2626' }}>{stopRem.text}</td>

                      <td style={{ padding: '10px', fontWeight: 700, color: textCol }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: isDark ? '#334155' : '#F1F5F9', fontSize: '11.5px' }}>
                          ⏱️ {pos.holdingPeriod} Days
                        </span>
                      </td>

                      <td style={{ padding: '10px', fontWeight: 600 }}>₹{pos.investedAmount.toLocaleString('en-IN')}</td>

                      <td style={{ padding: '10px', fontWeight: 700 }}>₹{pos.currentValue.toLocaleString('en-IN')}</td>

                      <td style={{ padding: '10px', fontWeight: 800, color: isProfit ? '#16A34A' : '#DC2626' }}>
                        <div>{isProfit ? '+' : ''}₹{pos.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <div style={{ fontSize: '11px' }}>({isProfit ? '+' : ''}{pos.profitLossPct.toFixed(2)}%)</div>
                      </td>

                      {/* Actions in exact requested order: Close Position -> Edit -> Delete */}
                      {user?.role === 'OWNER' && (
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setClosingPosition(pos);
                                setClosePrice(pos.currentPrice.toString());
                              }}
                              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              ✅ Close
                            </button>
                            <button
                              onClick={() => handleOpenEditDrawer(pos)}
                              title="Edit Position"
                              style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: textCol, fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => setDeletingId(pos.id)}
                              title="Delete Position"
                              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              🗑️ Delete
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

        {/* Pagination */}
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
            width: '520px',
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px', borderRadius: '12px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC', border: `1px solid ${borderCol}` }}>
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
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Stock Symbol</label>
              <input
                type="text"
                value={editForm.symbol}
                onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value.toUpperCase() })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
              />
              {validationErrors.symbol && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.symbol}</span>}
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Trade Type</label>
              <select
                value={editForm.tradeType}
                onChange={(e) => setEditForm({ ...editForm, tradeType: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.quantity && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.quantity}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Exit Reason</label>
                    <select
                      value={editForm.exitReason}
                      onChange={(e) => setEditForm({ ...editForm, exitReason: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Sell Date</label>
                    <input
                      type="date"
                      value={editForm.closedAt}
                      onChange={(e) => setEditForm({ ...editForm, closedAt: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Stop Loss (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.stopLoss}
                      onChange={(e) => setEditForm({ ...editForm, stopLoss: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
                    />
                    {validationErrors.nearBuyProximityPct && <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 600 }}>⚠️ {validationErrors.nearBuyProximityPct}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Mute Alerts Until</label>
                    <input
                      type="date"
                      value={editForm.muteAlertsUntil}
                      onChange={(e) => setEditForm({ ...editForm, muteAlertsUntil: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '6px', height: '80px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}
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

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '550px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', backgroundColor: cardBg, color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800 }}>
              {newType === 'BUY' ? '➕ Create New Open Position' : '📝 Record Historical Closed Trade'}
            </h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Symbol *</label>
                  <input type="text" placeholder="e.g. RELIANCE.NS" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value.toUpperCase())} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Company Name</label>
                  <input type="text" placeholder="e.g. Reliance Ind." value={newCompany} onChange={(e) => setNewCompany(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              {newType === 'SELL' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Buy Price *</label>
                      <input type="number" step="any" placeholder="₹" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Sell Price *</label>
                      <input type="number" step="any" placeholder="₹" value={newSellPrice} onChange={(e) => setNewSellPrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Quantity *</label>
                      <input type="number" step="any" placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Exit Reason</label>
                      <select value={newExitReason} onChange={(e) => setNewExitReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}>
                        <option value="TARGET_HIT">Target Hit</option>
                        <option value="MANUAL_EXIT">Manual Exit</option>
                        <option value="STOP_LOSS_HIT">Stop Loss Hit</option>
                        <option value="TIME_EXIT">Time Exit</option>
                        <option value="PARTIAL_EXIT">Partial Exit</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Buy Date *</label>
                      <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Sell Date *</label>
                      <input type="date" value={newSellDate} onChange={(e) => setNewSellDate(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Target Price (Optional)</label>
                      <input type="number" step="any" placeholder="Target ₹" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Stop Loss (Optional)</label>
                      <input type="number" step="any" placeholder="Stop Loss ₹" value={newStop} onChange={(e) => setNewStop(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Buy Price *</label>
                      <input type="number" step="any" placeholder="₹" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Quantity *</label>
                      <input type="number" step="any" placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Target Price</label>
                      <input type="number" step="any" placeholder="Target ₹" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Stop Loss</label>
                      <input type="number" step="any" placeholder="Stop Loss ₹" value={newStop} onChange={(e) => setNewStop(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Buy Date *</label>
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Notes</label>
                <textarea placeholder="Trade notes..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', height: '60px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
                <button type="submit" className="btnPrimary" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#16A34A' }}>
                  {newType === 'BUY' ? 'Create Open Position' : 'Save Historical Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Position Modal */}
      {closingPosition && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '420px', padding: '24px', backgroundColor: cardBg, color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 800 }}>✅ Close Trade: {closingPosition.symbol}</h3>
            <form onSubmit={handleCloseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Selling Price (Exit CMP) *</label>
                <input type="number" step="any" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Exit Reason</label>
                <select value={closeReason} onChange={(e) => setCloseReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}>
                  <option value="MANUAL_EXIT">Manual Exit</option>
                  <option value="TARGET_HIT">Target Hit</option>
                  <option value="STOP_LOSS_HIT">Stop Loss Hit</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Closing Notes</label>
                <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Reason for exit..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', height: '60px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setClosingPosition(null)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '12.5px' }}>Cancel</button>
                <button type="submit" className="btnPrimary" style={{ padding: '8px 16px', fontSize: '12.5px', backgroundColor: '#16A34A' }}>Confirm Exit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Req 7) */}
      {deletingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '380px', padding: '24px', backgroundColor: cardBg, color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}`, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 800, color: textCol }}>Confirm Delete</h4>
            <p style={{ fontSize: '13px', color: subTextCol, margin: 0 }}>Are you sure you want to permanently delete this trade?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setDeletingId(null)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '12.5px', borderRadius: '8px' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '8px 18px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {showBulkDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '400px', padding: '20px', backgroundColor: cardBg, color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 800 }}>Confirm Bulk Delete</h4>
            <p style={{ fontSize: '13px', color: subTextCol, margin: 0 }}>Are you sure you want to delete {selectedIds.length} selected open positions?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="btnSecondary" style={{ padding: '6px 14px', fontSize: '12px' }}>Cancel</button>
              <button onClick={confirmBulkDelete} style={{ padding: '6px 14px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Delete All Selected</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
