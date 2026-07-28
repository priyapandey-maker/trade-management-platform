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

  // Excel-like Editing State
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
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));

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

  // Excel-like cell edit handlers
  const handleInlineChange = (id: string, field: string, val: any) => {
    setPositions((prev) =>
      prev.map((pos) => {
        if (pos.id === id) {
          const updated = { ...pos, [field]: val };
          const qty = parseFloat(updated.quantity) || 0;
          const buyPrice = parseFloat(updated.buyPrice) || 0;
          const currentPrice = parseFloat(updated.currentPrice) || buyPrice;
          const charges = parseFloat(updated.brokerCharges) || 0;

          const invested = buyPrice * qty;
          const currentVal = currentPrice * qty;

          let profitLoss = 0;
          if (updated.tradeType === 'SELL') {
            profitLoss = (buyPrice - currentPrice) * qty - charges;
          } else {
            profitLoss = (currentPrice - buyPrice) * qty - charges;
          }
          const profitLossPct = invested > 0 ? (profitLoss / invested) * 100 : 0;

          return {
            ...updated,
            investedAmount: invested,
            currentValue: currentVal,
            profitLoss,
            profitLossPct,
          };
        }
        return pos;
      })
    );
  };

  const saveInlineEdit = async (id: string) => {
    if (user?.role !== 'OWNER') return;
    const pos = positions.find((p) => p.id === id);
    if (!pos) return;
    try {
      await api.patch(`/portfolio/position/${id}`, {
        buyPrice: pos.buyPrice,
        quantity: pos.quantity,
        currentPrice: pos.currentPrice,
        targetPrice: pos.targetPrice,
        stopLoss: pos.stopLoss,
        notes: pos.notes,
      });
      fetchPositions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update position.');
    }
  };

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
            Live active trades, Excel-like inline editing, and real-time target/stop proximity metrics.
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

      {/* REQ 8: HIGHEST PERFORMING & 2ND HIGHEST PERFORMING CARDS + KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Total Open Trades */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Open Trades</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>{totalOpenTrades}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Active Allocations</div>
        </div>

        {/* Card 2: Current Exposure */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Current Exposure</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px' }}>₹{currentExposure.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Total Market Value</div>
        </div>

        {/* Card 3: Overall Live P&L */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Unrealized Live P&amp;L</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: overallPnL >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px' }}>
            {overallPnL >= 0 ? '+' : ''}₹{overallPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Open Profit/Loss</div>
        </div>

        {/* REQ 8: Card 4: Highest Performing Position */}
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

        {/* REQ 8: Card 5: Second Highest Performing Position */}
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

      {/* Control Bar: Search, Type Filter, Sort, Bulk Delete */}
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

      {/* OPEN POSITIONS TABLE */}
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

                      {/* Symbol + Row Alert Badges (Req 1) */}
                      <td style={{ padding: '10px', fontWeight: 800, color: textCol }} onDoubleClick={() => user?.role === 'OWNER' && setEditingCell({ id: pos.id, field: 'symbol' })}>
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

                      {/* Company */}
                      <td style={{ padding: '10px', color: subTextCol }}>{pos.company}</td>

                      {/* Type */}
                      <td style={{ padding: '10px', fontWeight: 700 }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: pos.tradeType === 'BUY' ? '#DCFCE7' : '#FEE2E2', color: pos.tradeType === 'BUY' ? '#15803D' : '#991B1B', fontSize: '11px', fontWeight: 800 }}>
                          {pos.tradeType}
                        </span>
                      </td>

                      {/* Qty */}
                      <td style={{ padding: '10px', fontWeight: 600 }}>{pos.quantity}</td>

                      {/* Buy Price */}
                      <td style={{ padding: '10px', fontWeight: 700 }}>₹{pos.buyPrice}</td>

                      {/* CMP */}
                      <td style={{ padding: '10px', fontWeight: 800, color: '#16A34A' }}>₹{pos.currentPrice}</td>

                      {/* Target */}
                      <td style={{ padding: '10px', color: '#16A34A', fontWeight: 700 }}>{pos.targetPrice ? `₹${pos.targetPrice}` : '-'}</td>

                      {/* Stop Loss */}
                      <td style={{ padding: '10px', color: '#DC2626', fontWeight: 700 }}>{pos.stopLoss ? `₹${pos.stopLoss}` : '-'}</td>

                      {/* Target Rem */}
                      <td style={{ padding: '10px', fontWeight: 700, color: '#16A34A' }}>{targetRem.text}</td>

                      {/* Stop Rem */}
                      <td style={{ padding: '10px', fontWeight: 700, color: '#DC2626' }}>{stopRem.text}</td>

                      {/* REQ 2: Holding Days (Today - Buy Date) */}
                      <td style={{ padding: '10px', fontWeight: 700, color: textCol }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: isDark ? '#334155' : '#F1F5F9', fontSize: '11.5px' }}>
                          ⏱️ {pos.holdingPeriod} Days
                        </span>
                      </td>

                      {/* Invested */}
                      <td style={{ padding: '10px', fontWeight: 600 }}>₹{pos.investedAmount.toLocaleString('en-IN')}</td>

                      {/* Current Value */}
                      <td style={{ padding: '10px', fontWeight: 700 }}>₹{pos.currentValue.toLocaleString('en-IN')}</td>

                      {/* REQ 3: Live P&L and P&L % */}
                      <td style={{ padding: '10px', fontWeight: 800, color: isProfit ? '#16A34A' : '#DC2626' }}>
                        <div>{isProfit ? '+' : ''}₹{pos.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <div style={{ fontSize: '11px' }}>({isProfit ? '+' : ''}{pos.profitLossPct.toFixed(2)}%)</div>
                      </td>

                      {/* Actions */}
                      {user?.role === 'OWNER' && (
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setClosingPosition(pos);
                                setClosePrice(pos.currentPrice.toString());
                              }}
                              title="Close Trade"
                              style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Close
                            </button>
                            <button
                              onClick={() => handleDuplicate(pos.id)}
                              title="Duplicate Position"
                              style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${borderCol}`, backgroundColor: 'transparent', color: textCol, fontSize: '11px', cursor: 'pointer' }}
                            >
                              📋
                            </button>
                            <button
                              onClick={() => handleArchive(pos.id)}
                              title="Archive Position"
                              style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${borderCol}`, backgroundColor: 'transparent', color: textCol, fontSize: '11px', cursor: 'pointer' }}
                            >
                              📁
                            </button>
                            <button
                              onClick={() => setDeletingId(pos.id)}
                              title="Delete Position"
                              style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '11px', cursor: 'pointer' }}
                            >
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

      {/* Add Position Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '500px', padding: '24px', backgroundColor: cardBg, color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800 }}>➕ Create New Open Position</h3>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Type</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }}>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
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
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Buy Date</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
                <button type="submit" className="btnPrimary" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#16A34A' }}>Create Trade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Trade Modal */}
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

      {/* Single Delete Confirmation */}
      {deletingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '380px', padding: '20px', backgroundColor: cardBg, color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 800 }}>Confirm Delete</h4>
            <p style={{ fontSize: '13px', color: subTextCol, margin: 0 }}>Are you sure you want to permanently delete this open position?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setDeletingId(null)} className="btnSecondary" style={{ padding: '6px 14px', fontSize: '12px' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '6px 14px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
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
