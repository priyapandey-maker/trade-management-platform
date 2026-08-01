'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';

export default function ClosedPositionsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Delete Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

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

  const exportCSV = () => {
    const headers = ['Symbol,Company,BuyPrice,ExitPrice,Qty,EntryDate,ExitDate,HoldingPeriod,PnL,PnLPct,Reason'];
    const rows = positions.map(
      (p) => `${p.symbol},"${p.company}",${p.buyPrice},${p.sellingPrice || p.currentPrice},${p.quantity},${p.entryDate},${p.closedAt},${p.holdingPeriod || 0},${p.profitLoss},${p.profitLossPct},${p.exitReason}`
    );
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Closed_Positions_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  // Top 4 Summary Cards metrics
  const totalClosedTrades = positions.length;
  const realizedPnL = positions.reduce((sum, p) => sum + p.profitLoss, 0);
  const wins = positions.filter((p) => p.profitLoss > 0).length;
  const winRate = totalClosedTrades > 0 ? (wins / totalClosedTrades) * 100 : 0;
  const avgHoldingPeriod = totalClosedTrades > 0 ? positions.reduce((sum, p) => sum + (p.holdingPeriod || 0), 0) / totalClosedTrades : 0;

  const filteredPositions = positions.filter((pos) => {
    const term = search.toLowerCase();
    const matchesSearch =
      pos.symbol.toLowerCase().includes(term) ||
      pos.company.toLowerCase().includes(term) ||
      (pos.notes && pos.notes.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'ALL' || pos.exitReason === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: textCol, margin: 0 }}>Closed Positions History</h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
            Completed trade records, trade duration badges, realized profit/loss, and exit rationales.
          </p>
        </div>

        <button onClick={exportCSV} className="btnSecondary" style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '6px' }}>
          📥 Export CSV
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* TOP 4 SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Closed Trades</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{totalClosedTrades}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Completed History</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Realized P&amp;L</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: realizedPnL >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
            {realizedPnL >= 0 ? '+' : ''}₹{realizedPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Locked Net Return</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Win Rate</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>{winRate.toFixed(1)}%</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Successful Exits</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Avg Holding Period</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{avgHoldingPeriod.toFixed(1)} Days</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Trade Duration Average</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder="🔍 Search closed symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '260px', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: textCol, fontSize: '13px' }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: textCol, fontSize: '13px' }}>
          <option value="ALL">All Exit Reasons</option>
          <option value="TARGET_HIT">🎯 Target Hit</option>
          <option value="STOP_LOSS_HIT">🛑 Stop Loss Hit</option>
          <option value="MANUAL_EXIT">Manual Exit</option>
        </select>
      </div>

      {/* Closed Positions Table */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: subTextCol }}>Loading completed trades...</div>
        ) : filteredPositions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>📚</div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: textCol, margin: 0 }}>No Closed Positions Recorded</h3>
            <p style={{ fontSize: '13px', color: subTextCol, marginTop: '4px' }}>
              Closed positions will automatically record trade duration badges and net realized profit/loss.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderBottom: `2px solid ${borderCol}`, color: subTextCol, textAlign: 'left' }}>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Symbol</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Company Name</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Buy Price</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Exit Price</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Qty</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Entry Date</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Exit Date</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Trade Duration</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Realized P&amp;L</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Return %</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Exit Reason</th>
                  {user?.role === 'OWNER' && <th style={{ padding: '12px', textAlign: 'center', width: '90px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((pos) => {
                  const isProfit = pos.profitLoss >= 0;
                  return (
                    <tr key={pos.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: textCol }}>{pos.symbol}</td>
                      <td style={{ padding: '12px 10px', color: subTextCol }}>{pos.company}</td>
                      <td style={{ padding: '12px 10px' }}>₹{pos.buyPrice?.toFixed(2)}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 700 }}>₹{(pos.sellingPrice || pos.currentPrice)?.toFixed(2)}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{pos.quantity}</td>
                      <td style={{ padding: '12px 10px' }}>{formatDate(pos.entryDate)}</td>
                      <td style={{ padding: '12px 10px' }}>{formatDate(pos.closedAt)}</td>
                      
                      {/* TRADE DURATION BADGE */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: isDark ? '#334155' : '#F1F5F9', color: textCol, fontSize: '11px', fontWeight: 800 }}>
                          ⏱️ {pos.holdingPeriod || 0} Days
                        </span>
                      </td>

                      <td style={{ padding: '12px 10px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626' }}>
                        {isProfit ? '+' : ''}₹{pos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626' }}>
                        {isProfit ? '+' : ''}{pos.profitLossPct?.toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: pos.exitReason === 'TARGET_HIT' ? '#DCFCE7' : pos.exitReason === 'STOP_LOSS_HIT' ? '#FEE2E2' : '#FEF3C7',
                            color: pos.exitReason === 'TARGET_HIT' ? '#15803D' : pos.exitReason === 'STOP_LOSS_HIT' ? '#991B1B' : '#92400E',
                          }}
                        >
                          {pos.exitReason === 'TARGET_HIT' ? '🎯 Target Hit' : pos.exitReason === 'STOP_LOSS_HIT' ? '🛑 SL Hit' : 'Manual Exit'}
                        </span>
                      </td>

                      {user?.role === 'OWNER' && (
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditDrawer(pos)}
                              title="Edit Closed Position"
                              style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: textCol, fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => setDeletingId(pos.id)}
                              title="Delete Closed Position"
                              style={{
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
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
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '380px', backgroundColor: cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${borderCol}`, color: textCol }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 900, color: '#DC2626' }}>🗑️ Delete Closed Position</h3>
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
    </div>
  );
}
