'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';

export default function OpenPositionsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [positions, setPositions] = useState<any[]>([]);
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

  // Excel-like Editing State: activeCell = { id, field }
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

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
  const [newSector, setNewSector] = useState('Technology');
  const [newMarketCap, setNewMarketCap] = useState('Large Cap');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));

  const fetchPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/portfolio');
      const openList = res.data.positions?.open || [];
      setPositions(openList);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch open positions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();

    const handleRefresh = () => fetchPositions();
    window.addEventListener('shree_manual_refresh', handleRefresh);
    return () => window.removeEventListener('shree_manual_refresh', handleRefresh);
  }, [fetchPositions]);

  // Proximity Metrics & Calculations
  const getTargetRemaining = (pos: any) => {
    if (!pos.targetPrice || !pos.currentPrice) return { dist: '—', pct: '—' };
    const diff = pos.targetPrice - pos.currentPrice;
    const pct = (diff / pos.currentPrice) * 100;
    return {
      dist: `₹${Math.abs(diff).toFixed(2)}`,
      pct: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
      isPositive: diff >= 0,
    };
  };

  const getStopRemaining = (pos: any) => {
    if (!pos.stopLoss || !pos.currentPrice) return { dist: '—', pct: '—' };
    const diff = pos.currentPrice - pos.stopLoss;
    const pct = (diff / pos.currentPrice) * 100;
    return {
      dist: `₹${Math.abs(diff).toFixed(2)}`,
      pct: `${pct >= 0 ? '-' : '+'}${Math.abs(pct).toFixed(1)}%`,
      isWarning: diff <= (pos.currentPrice * 0.03), // within 3% of SL
    };
  };

  // Optimistic Inline Change
  const handleInlineChange = (id: string, field: string, val: any) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, [field]: val };
          const buy = parseFloat(updated.buyPrice) || 0;
          const qty = parseFloat(updated.quantity) || 0;
          const current = parseFloat(updated.currentPrice) || 0;
          const bc = parseFloat(updated.brokerCharges) || 0;

          updated.investedAmount = buy * qty;
          updated.currentValue = current * qty;
          updated.profitLoss = updated.tradeType === 'SELL' ? (buy - current) * qty - bc : (current - buy) * qty - bc;
          updated.profitLossPct = updated.investedAmount > 0 ? (updated.profitLoss / updated.investedAmount) * 100 : 0;
          return updated;
        }
        return p;
      })
    );
  };

  const saveInlineEdit = async (id: string) => {
    if (user?.role !== 'OWNER') return;
    const pos = positions.find((p) => p.id === id);
    if (!pos) return;
    try {
      await api.patch(`/portfolio/position/${id}`, {
        symbol: pos.symbol,
        company: pos.company,
        tradeType: pos.tradeType,
        buyPrice: parseFloat(pos.buyPrice),
        currentPrice: parseFloat(pos.currentPrice),
        quantity: parseFloat(pos.quantity),
        targetPrice: pos.targetPrice ? parseFloat(pos.targetPrice) : null,
        stopLoss: pos.stopLoss ? parseFloat(pos.stopLoss) : null,
        notes: pos.notes,
      });
    } catch (err) {
      fetchPositions(); // rollback on failure
    }
  };

  // Excel key navigation listener
  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string) => {
    if (e.key === 'Enter') {
      saveInlineEdit(id);
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      fetchPositions();
      setEditingCell(null);
    }
  };

  // Add Position
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'OWNER') return;
    try {
      await api.post('/portfolio/position', {
        symbol: newSymbol.toUpperCase(),
        company: newCompany || newSymbol,
        tradeType: newType,
        buyPrice: parseFloat(newBuyPrice),
        quantity: parseFloat(newQty),
        targetPrice: newTarget ? parseFloat(newTarget) : null,
        stopLoss: newStop ? parseFloat(newStop) : null,
        notes: newNotes,
        entryDate: newDate,
      });
      setShowAddModal(false);
      setNewSymbol('');
      setNewCompany('');
      setNewBuyPrice('');
      setNewQty('');
      setNewTarget('');
      setNewStop('');
      setNewNotes('');
      fetchPositions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add position.');
    }
  };

  // Actions
  const handleDuplicate = async (id: string) => {
    if (user?.role !== 'OWNER') return;
    try {
      await api.post(`/portfolio/position/${id}/duplicate`);
      fetchPositions();
    } catch (e) {}
  };

  const handleArchive = async (id: string) => {
    if (user?.role !== 'OWNER') return;
    try {
      await api.patch(`/portfolio/position/${id}/archive`, { archive: true });
      fetchPositions();
    } catch (e) {}
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
        closedAt: new Date().toISOString(),
      });
      setClosingPosition(null);
      fetchPositions();
    } catch (e) {}
  };

  // Exports
  const exportCSV = () => {
    const headers = ['Symbol,Company,Type,Qty,BuyPrice,CMP,Invested,CurrentValue,PnL,PnLPct'];
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

  // Top Summary Cards metrics
  const totalOpenTrades = positions.length;
  const currentExposure = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const overallPnL = positions.reduce((sum, p) => sum + p.profitLoss, 0);
  const todayPnL = positions.reduce((sum, p) => sum + (p.currentPrice * p.quantity * 0.005), 0); // live estimate

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
            Live active trades, Excel-like inline editing, and real-time target/stop proximity metrics.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportCSV} className="btnSecondary" style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '6px' }}>
            📥 Export CSV
          </button>
          {user?.role === 'OWNER' && (
            <button onClick={() => setShowAddModal(true)} className="btnPrimary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px', backgroundColor: '#16A34A' }}>
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

      {/* TOP 4 POSITION KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Open Trades</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#2563EB', marginTop: '6px' }}>{totalOpenTrades}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Active Positions</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Current Exposure</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: textCol, marginTop: '6px' }}>
            ₹{currentExposure.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Total Market Value</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Today&apos;s P&amp;L (Est)</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: todayPnL >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
            {todayPnL >= 0 ? '+' : ''}₹{todayPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Intraday Movement</div>
        </div>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Overall Live P&amp;L</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: overallPnL >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
            {overallPnL >= 0 ? '+' : ''}₹{overallPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Unrealized Return</div>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="🔍 Search symbol, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '260px', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: textCol, fontSize: '13px' }}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: textCol, fontSize: '13px' }}>
            <option value="ALL">All Types</option>
            <option value="BUY">BUY (Long)</option>
            <option value="SELL">SELL (Short)</option>
          </select>
        </div>

        {user?.role === 'OWNER' && selectedIds.length > 0 && (
          <button onClick={() => setShowBulkDeleteConfirm(true)} style={{ padding: '8px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}>
            🗑️ Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* EXCEL-LIKE SPREADSHEET TABLE */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: subTextCol }}>Loading live open positions...</div>
        ) : filteredPositions.length === 0 ? (
          /* Custom Actionable Empty State */
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>⚡</div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: textCol, margin: 0 }}>No Open Positions Found</h3>
            <p style={{ fontSize: '13px', color: subTextCol, marginTop: '4px', marginBottom: '16px' }}>
              Create your first trade allocation to start tracking live market positions.
            </p>
            {user?.role === 'OWNER' && (
              <button onClick={() => setShowAddModal(true)} className="btnPrimary" style={{ padding: '10px 20px', fontSize: '13px', backgroundColor: '#16A34A', borderRadius: '6px' }}>
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
                  <th style={{ padding: '12px', fontWeight: 800 }}>Invested</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Current Val</th>
                  <th style={{ padding: '12px', fontWeight: 800 }}>Live P&amp;L</th>
                  {user?.role === 'OWNER' && <th style={{ padding: '12px', textAlign: 'center', width: '180px' }}>Actions</th>}
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

                      {/* Excel editable Symbol */}
                      <td style={{ padding: '10px', fontWeight: 800, color: textCol }} onDoubleClick={() => user?.role === 'OWNER' && setEditingCell({ id: pos.id, field: 'symbol' })}>
                        {editingCell?.id === pos.id && editingCell?.field === 'symbol' ? (
                          <input
                            type="text"
                            value={pos.symbol}
                            onChange={(e) => handleInlineChange(pos.id, 'symbol', e.target.value.toUpperCase())}
                            onKeyDown={(e) => handleKeyDown(e, pos.id, 'symbol')}
                            onBlur={() => { saveInlineEdit(pos.id); setEditingCell(null); }}
                            autoFocus
                            style={{ width: '80px', padding: '4px', border: '1px solid #16A34A', borderRadius: '4px' }}
                          />
                        ) : (
                          pos.symbol
                        )}
                      </td>

                      {/* Company */}
                      <td style={{ padding: '10px', color: subTextCol }}>{pos.company}</td>

                      {/* Type */}
                      <td style={{ padding: '10px', fontWeight: 700 }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: pos.tradeType === 'BUY' ? '#DCFCE7' : '#FEE2E2', color: pos.tradeType === 'BUY' ? '#15803D' : '#991B1B', fontSize: '11px', fontWeight: 800 }}>
                          {pos.tradeType}
                        </span>
                      </td>

                      {/* Qty */}
                      <td style={{ padding: '10px', fontWeight: 600 }} onDoubleClick={() => user?.role === 'OWNER' && setEditingCell({ id: pos.id, field: 'quantity' })}>
                        {editingCell?.id === pos.id && editingCell?.field === 'quantity' ? (
                          <input
                            type="number"
                            value={pos.quantity}
                            onChange={(e) => handleInlineChange(pos.id, 'quantity', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, pos.id, 'quantity')}
                            onBlur={() => { saveInlineEdit(pos.id); setEditingCell(null); }}
                            autoFocus
                            style={{ width: '60px', padding: '4px', border: '1px solid #16A34A', borderRadius: '4px' }}
                          />
                        ) : (
                          pos.quantity
                        )}
                      </td>

                      {/* Buy Price */}
                      <td style={{ padding: '10px', fontWeight: 600 }} onDoubleClick={() => user?.role === 'OWNER' && setEditingCell({ id: pos.id, field: 'buyPrice' })}>
                        ₹{pos.buyPrice?.toFixed(2)}
                      </td>

                      {/* CMP */}
                      <td style={{ padding: '10px', fontWeight: 800, color: textCol }}>₹{pos.currentPrice?.toFixed(2)}</td>

                      {/* Target */}
                      <td style={{ padding: '10px', color: '#16A34A', fontWeight: 600 }}>
                        {pos.targetPrice ? `₹${pos.targetPrice.toFixed(2)}` : '—'}
                      </td>

                      {/* Stop Loss */}
                      <td style={{ padding: '10px', color: '#DC2626', fontWeight: 600 }}>
                        {pos.stopLoss ? `₹${pos.stopLoss.toFixed(2)}` : '—'}
                      </td>

                      {/* PROXIMITY METRIC: Target Remaining */}
                      <td style={{ padding: '10px', fontWeight: 700, color: '#16A34A' }}>
                        <div>{targetRem.dist}</div>
                        <div style={{ fontSize: '10.5px' }}>({targetRem.pct})</div>
                      </td>

                      {/* PROXIMITY METRIC: Stop Remaining */}
                      <td style={{ padding: '10px', fontWeight: 700, color: '#DC2626' }}>
                        <div>{stopRem.dist}</div>
                        <div style={{ fontSize: '10.5px' }}>({stopRem.pct})</div>
                      </td>

                      {/* Invested */}
                      <td style={{ padding: '10px' }}>₹{pos.investedAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>

                      {/* Current Value */}
                      <td style={{ padding: '10px' }}>₹{pos.currentValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>

                      {/* Live P&L */}
                      <td style={{ padding: '10px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626' }}>
                        {isProfit ? '+' : ''}₹{pos.profitLoss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isProfit ? '+' : ''}{pos.profitLossPct?.toFixed(1)}%)
                      </td>

                      {/* Owner Actions */}
                      {user?.role === 'OWNER' && (
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={() => { setClosingPosition(pos); setClosePrice(pos.currentPrice.toString()); }} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                              Close
                            </button>
                            <button onClick={() => handleDuplicate(pos.id)} title="Duplicate" style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: `1px solid ${borderCol}`, background: 'none', cursor: 'pointer' }}>
                              📋
                            </button>
                            <button onClick={() => handleArchive(pos.id)} title="Archive" style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: `1px solid ${borderCol}`, background: 'none', cursor: 'pointer' }}>
                              📁
                            </button>
                            <button onClick={() => setDeletingId(pos.id)} title="Delete" style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}>
                              🗑️
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

      {/* CREATE POSITION MODAL */}
      {showAddModal && user?.role === 'OWNER' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleAddSubmit} style={{ width: '520px', backgroundColor: cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${borderCol}`, color: textCol }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 900 }}>➕ Create New Trade Position</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: subTextCol }}>Symbol</label>
                <input type="text" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value.toUpperCase())} placeholder="e.g. RELIANCE.NS" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: subTextCol }}>Company Name</label>
                <input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="Company" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: subTextCol }}>Trade Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}>
                  <option value="BUY">BUY (Long)</option>
                  <option value="SELL">SELL (Short)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: subTextCol }}>Buy Price (₹)</label>
                <input type="number" step="0.01" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: subTextCol }}>Quantity</label>
                <input type="number" step="0.01" value={newQty} onChange={(e) => setNewQty(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: subTextCol }}>Entry Date</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: subTextCol }}>Target Price (₹)</label>
                <input type="number" step="0.01" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: subTextCol }}>Stop Loss (₹)</label>
                <input type="number" step="0.01" value={newStop} onChange={(e) => setNewStop(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
              <button type="submit" className="btnPrimary" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#16A34A' }}>Save Trade</button>
            </div>
          </form>
        </div>
      )}

      {/* CLOSE POSITION MODAL */}
      {closingPosition && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleCloseSubmit} style={{ width: '400px', backgroundColor: cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${borderCol}`, color: textCol }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800 }}>🚪 Close Trade: {closingPosition.symbol}</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: subTextCol }}>Selling / Exit Price (₹)</label>
              <input type="number" step="0.01" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: subTextCol }}>Exit Reason</label>
              <select value={closeReason} onChange={(e) => setCloseReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}>
                <option value="TARGET_HIT">🎯 Target Hit</option>
                <option value="STOP_LOSS_HIT">🛑 Stop Loss Hit</option>
                <option value="MANUAL_EXIT">Manual Exit</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" onClick={() => setClosingPosition(null)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
              <button type="submit" className="btnPrimary" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#16A34A' }}>Confirm Exit</button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '380px', backgroundColor: cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${borderCol}`, color: textCol }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 900, color: '#DC2626' }}>🗑️ Delete Position</h3>
            <p style={{ fontSize: '13px', color: subTextCol, margin: '0 0 16px 0' }}>
              Are you sure you want to delete this position permanently? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDeletingId(null)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
