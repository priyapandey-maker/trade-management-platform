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
                          <button
                            onClick={() => setDeletingId(pos.id)}
                            title="Delete Closed Position"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            🗑️ Delete
                          </button>
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
    </div>
  );
}
