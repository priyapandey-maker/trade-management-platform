'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { AddPositionModal, EditWatchlistModal } from '@/components/modals/GlobalActionModals';
import { AnalyzeStockModal } from '@/components/AnalyzeStockModal';

export const ResearchWatchlistWorkspace = () => {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<'ALL' | 'Stock' | 'ETF' | 'Crypto' | 'Commodity'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Near Buy' | 'Buy Triggered' | 'Holding' | 'Near Sell' | 'Target Hit' | 'Stop Loss Hit'>('ALL');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | '6' | '5+' | '4+' | '<4'>('ALL');
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | 'NSE_BSE' | 'US_GLOBAL' | 'CRYPTO_COMMODITY'>('ALL');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAnalyzeBatchModal, setShowAnalyzeBatchModal] = useState(false);

  // Action Modals State
  const [selectedIdeaToEdit, setSelectedIdeaToEdit] = useState<any | null>(null);
  const [isEditIdeaOpen, setIsEditIdeaOpen] = useState(false);
  const [selectedSymbolForAdd, setSelectedSymbolForAdd] = useState<string>('');
  const [selectedPriceForAdd, setSelectedPriceForAdd] = useState<number | undefined>(undefined);
  const [selectedTargetForAdd, setSelectedTargetForAdd] = useState<number | undefined>(undefined);
  const [selectedStopForAdd, setSelectedStopForAdd] = useState<number | undefined>(undefined);
  const [isAddPosOpen, setIsAddPosOpen] = useState(false);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);

  // Fetch Live Data
  const fetchData = useCallback(async (isQuiet = false) => {
    try {
      if (!isQuiet) setLoading(true);
      setError(null);
      const [ideasRes, portfolioRes] = await Promise.all([
        api.get('/ideas').catch(() => ({ data: { data: [] } })),
        api.get('/portfolio').catch(() => ({ data: { data: { positions: [] } } })),
      ]);

      const fetchedIdeas = ideasRes.data.data || [];
      const fetchedPositions = portfolioRes.data.data?.positions || [];

      setIdeas(fetchedIdeas);
      setPositions(fetchedPositions);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      setError('Unable to load real-time research watchlist. Please verify local backend connection.');
    } finally {
      if (!isQuiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Automatically refresh every 15 seconds
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Helper: Asset Type Detection
  const getAssetType = (idea: any): 'Stock' | 'ETF' | 'Crypto' | 'Commodity' => {
    const sym = (idea.symbol || '').toUpperCase();
    const comp = (idea.company || '').toUpperCase();
    const notes = (idea.notes || '').toUpperCase();
    if (sym.endsWith('-USD') || sym.includes('BTC') || sym.includes('ETH') || idea.assetType === 'CRYPTO') return 'Crypto';
    if (sym.endsWith('=F') || sym.includes('GOLD') || sym.includes('SILVER') || sym.includes('CRUDE') || idea.assetType === 'COMMODITY') return 'Commodity';
    if (comp.includes('ETF') || comp.includes('BEES') || comp.includes('INDEX') || comp.includes('NIFTY') || notes.includes('ETF') || idea.assetType === 'ETF') return 'ETF';
    return 'Stock';
  };

  // Helper: Exchange Detection
  const getExchange = (idea: any): 'NSE_BSE' | 'US_GLOBAL' | 'CRYPTO_COMMODITY' => {
    const sym = (idea.symbol || '').toUpperCase();
    if (sym.endsWith('.NS') || sym.endsWith('.BO') || sym.endsWith('.BSE') || sym.endsWith('.NSE')) return 'NSE_BSE';
    if (sym.endsWith('-USD') || sym.endsWith('=F')) return 'CRYPTO_COMMODITY';
    return 'US_GLOBAL';
  };

  // Helper: Status Determination
  const getStatus = (idea: any): 'Near Buy' | 'Buy Triggered' | 'Holding' | 'Near Sell' | 'Target Hit' | 'Stop Loss Hit' => {
    if (idea.status === 'STOP_LOSS_HIT') return 'Stop Loss Hit';
    if (idea.status === 'TARGET_HIT') return 'Target Hit';

    const cmp = idea.currentPrice || 0;
    const buy = idea.buyPrice || 0;
    const target = idea.targetPrice || 0;
    const stop = idea.stopLoss || 0;

    if (stop > 0 && cmp <= stop) return 'Stop Loss Hit';
    if (target > 0 && cmp >= target) return 'Target Hit';
    if (target > 0 && cmp >= target * 0.98) return 'Near Sell';
    if (buy > 0 && cmp <= buy * 1.02 && cmp >= buy * 0.98) return 'Near Buy';
    if (buy > 0 && cmp < buy * 0.98) return 'Buy Triggered';
    return 'Holding';
  };

  // Helper: Recommendation Determination
  const getRecommendation = (idea: any, status: string): { label: string; badgeClass: string; color: string } => {
    if (status === 'Near Buy' || status === 'Buy Triggered') {
      return { label: 'BUY', badgeClass: 'badge badgeBullish', color: '#166534' };
    }
    if (status === 'Near Sell' || status === 'Target Hit') {
      return { label: 'SELL', badgeClass: 'badge badgeBearish', color: '#991B1B' };
    }
    if (status === 'Stop Loss Hit') {
      return { label: 'EXIT', badgeClass: 'badge badgeBearish', color: '#991B1B' };
    }
    if ((idea.alphaedgeScore || 0) >= 4) {
      return { label: 'HOLD', badgeClass: 'badge badgeBullish', color: '#1D4ED8' };
    }
    return { label: 'WAIT', badgeClass: 'badge badgeNeutral', color: '#475569' };
  };

  // Helper: Confidence Score
  const getConfidenceScore = (idea: any): number => {
    if (typeof idea.confidence === 'number') return idea.confidence;
    const score = idea.alphaedgeScore || 0;
    return Math.min(100, Math.max(0, Math.round((score / 6) * 100)));
  };

  // Process and Enrich All Ideas
  const enrichedIdeas = useMemo(() => {
    return ideas.map((idea) => {
      const cmp = idea.currentPrice || 0;
      const buy = idea.buyPrice || 0;
      const target = idea.targetPrice || 0;
      const stop = idea.stopLoss || 0;
      const score = idea.alphaedgeScore || 0;

      const distanceToBuyPct = buy > 0 ? ((cmp - buy) / buy) * 100 : 0;
      const distanceToTargetPct = cmp > 0 && target > 0 ? ((target - cmp) / cmp) * 100 : 0;
      const expectedUpsidePct = buy > 0 && target > 0 ? ((target - buy) / buy) * 100 : 0;

      const status = getStatus(idea);
      const recommendation = getRecommendation(idea, status);
      const confidence = getConfidenceScore(idea);
      const assetType = getAssetType(idea);
      const exchange = getExchange(idea);

      // Check if already in portfolio
      const openPos = positions.find((p) => p.symbol === idea.symbol && p.status === 'OPEN');
      const portfolioPnl = openPos ? openPos.profitLoss || 0 : null;
      const portfolioPnlPct = openPos && openPos.investedAmount > 0 ? (openPos.profitLoss / openPos.investedAmount) * 100 : null;

      return {
        ...idea,
        cmp,
        buy,
        target,
        stop,
        score,
        distanceToBuyPct,
        distanceToTargetPct,
        expectedUpsidePct,
        status,
        recommendation,
        confidence,
        assetType,
        exchange,
        openPos,
        portfolioPnl,
        portfolioPnlPct,
      };
    });
  }, [ideas, positions]);

  // Filter Ideas
  const filteredIdeas = useMemo(() => {
    return enrichedIdeas.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSym = item.symbol?.toLowerCase().includes(q);
        const matchComp = item.company?.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchSym && !matchComp && !matchNotes) return false;
      }
      if (assetTypeFilter !== 'ALL' && item.assetType !== assetTypeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (exchangeFilter !== 'ALL' && item.exchange !== exchangeFilter) return false;
      if (ratingFilter !== 'ALL') {
        if (ratingFilter === '6' && item.score !== 6) return false;
        if (ratingFilter === '5+' && item.score < 5) return false;
        if (ratingFilter === '4+' && item.score < 4) return false;
        if (ratingFilter === '<4' && item.score >= 4) return false;
      }
      return true;
    });
  }, [enrichedIdeas, searchQuery, assetTypeFilter, statusFilter, ratingFilter, exchangeFilter]);

  // Sort by Priority: 1. Near Buy/Triggered, 2. Highest Confidence, 3. Closest to Target, 4. Remaining
  const sortedIdeas = useMemo(() => {
    return [...filteredIdeas].sort((a, b) => {
      const aIsBuyPriority = a.status === 'Near Buy' || a.status === 'Buy Triggered' ? 1 : 0;
      const bIsBuyPriority = b.status === 'Near Buy' || b.status === 'Buy Triggered' ? 1 : 0;
      if (aIsBuyPriority !== bIsBuyPriority) return bIsBuyPriority - aIsBuyPriority;

      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      if (a.score !== b.score) return b.score - a.score;

      // Closest to target (smaller distanceToTargetPct is better if positive)
      const aDist = a.distanceToTargetPct > 0 ? a.distanceToTargetPct : 9999;
      const bDist = b.distanceToTargetPct > 0 ? b.distanceToTargetPct : 9999;
      if (aDist !== bDist) return aDist - bDist;

      return (b.cmp || 0) - (a.cmp || 0);
    });
  }, [filteredIdeas]);

  // Summary Bar Metrics
  const summaryMetrics = useMemo(() => {
    const totalTracked = enrichedIdeas.length;
    const passing6Rule = enrichedIdeas.filter((i) => i.score >= 4).length;
    const nearBuyCount = enrichedIdeas.filter((i) => i.status === 'Near Buy' || i.status === 'Buy Triggered').length;
    const nearSellCount = enrichedIdeas.filter((i) => i.status === 'Near Sell' || i.status === 'Target Hit').length;
    return { totalTracked, passing6Rule, nearBuyCount, nearSellCount };
  }, [enrichedIdeas]);

  // Research Insights Panel Metrics
  const insights = useMemo(() => {
    if (enrichedIdeas.length === 0) return null;

    // 1. Most Undervalued (Highest Score + Highest Upside)
    const mostUndervalued = [...enrichedIdeas].sort((a, b) => (b.score * 10 + b.expectedUpsidePct) - (a.score * 10 + a.expectedUpsidePct))[0];
    
    // 2. Strongest Weekly Setup (Score >= 5 in Buy Zone, or highest score)
    const setupCandidates = enrichedIdeas.filter((i) => (i.status === 'Near Buy' || i.status === 'Buy Triggered') && i.score >= 4);
    const strongestSetup = setupCandidates.length > 0
      ? setupCandidates.sort((a, b) => b.score - a.score)[0]
      : [...enrichedIdeas].sort((a, b) => b.score - a.score)[0];

    // 3. Highest Institutional Buying / Confidence
    const highestConfidence = [...enrichedIdeas].sort((a, b) => b.confidence - a.confidence)[0];

    // 4. Closest to Buy Zone
    const closestToBuy = [...enrichedIdeas]
      .filter((i) => i.buy > 0 && i.status !== 'Stop Loss Hit' && i.status !== 'Target Hit')
      .sort((a, b) => Math.abs(a.distanceToBuyPct) - Math.abs(b.distanceToBuyPct))[0] || enrichedIdeas[0];

    // 5. Highest Expected Upside
    const highestUpside = [...enrichedIdeas]
      .filter((i) => i.target > 0 && i.cmp > 0)
      .sort((a, b) => b.distanceToTargetPct - a.distanceToTargetPct)[0] || enrichedIdeas[0];

    return { mostUndervalued, strongestSetup, highestConfidence, closestToBuy, highestUpside };
  }, [enrichedIdeas]);

  // Delete Handler
  const handleDeleteIdea = async (id: string, sym: string) => {
    if (!confirm(`Permanently remove ${sym} from Watchlist?`)) return;
    try {
      await api.delete(`/ideas/${id}`);
      setIdeas((prev) => prev.filter((i) => i.id !== id));
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    } catch (err) {
      alert('Failed to delete watchlist item.');
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sortedIdeas.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Permanently delete ${selectedIds.length} selected research items?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/ideas/${id}`)));
      setIdeas((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
    } catch (err) {
      alert('Failed to delete some items.');
      fetchData(true);
    }
  };

  const handleBulkMoveToPortfolio = async () => {
    if (selectedIds.length === 0) return;
    const selectedItems = enrichedIdeas.filter((i) => selectedIds.includes(i.id));
    let movedCount = 0;
    try {
      for (const item of selectedItems) {
        if (!item.openPos) {
          await api.post('/portfolio/position', {
            symbol: item.symbol,
            company: item.company,
            buyPrice: item.buy || item.cmp,
            quantity: 1,
            targetPrice: item.target,
            stopLoss: item.stop,
            notes: `Moved from Research Watchlist (Score: ${item.score}/6)`,
          });
          movedCount++;
        }
      }
      alert(`Successfully added ${movedCount} new trade positions to your active Portfolio holdings!`);
      setSelectedIds([]);
      fetchData(true);
    } catch (err) {
      alert('Error moving selected items to portfolio.');
      fetchData(true);
    }
  };

  const handleExportCSV = () => {
    const itemsToExport = selectedIds.length > 0
      ? sortedIdeas.filter((i) => selectedIds.includes(i.id))
      : sortedIdeas;

    if (itemsToExport.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = [
      'Symbol',
      'Company',
      'Asset Type',
      'Exchange',
      'Live CMP',
      'Buy Price',
      'Target Price',
      'Stop Loss',
      'Distance to Buy (%)',
      'Distance to Target (%)',
      'Expected Upside (%)',
      'Shree Score',
      'Confidence (%)',
      'Status',
      'Recommendation',
      'In Portfolio P&L',
      'Notes',
    ];

    const rows = itemsToExport.map((i) => [
      `"${i.symbol}"`,
      `"${(i.company || '').replace(/"/g, '""')}"`,
      `"${i.assetType}"`,
      `"${i.exchange}"`,
      i.cmp.toFixed(2),
      i.buy.toFixed(2),
      i.target.toFixed(2),
      i.stop.toFixed(2),
      i.distanceToBuyPct.toFixed(2),
      i.distanceToTargetPct.toFixed(2),
      i.expectedUpsidePct.toFixed(2),
      `${i.score}/6`,
      `${i.confidence}%`,
      `"${i.status}"`,
      `"${i.recommendation.label}"`,
      i.portfolioPnl !== null ? `"${i.portfolioPnl >= 0 ? '+' : ''}${i.portfolioPnl.toFixed(2)} (${i.portfolioPnlPct?.toFixed(1)}%)"` : '"Not in Portfolio"',
      `"${(i.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Shree_Associates_Watchlist_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStars = (score: number) => {
    return '★'.repeat(score) + '☆'.repeat(Math.max(0, 6 - score));
  };

  const hasActiveFilters = searchQuery !== '' || assetTypeFilter !== 'ALL' || statusFilter !== 'ALL' || ratingFilter !== 'ALL' || exchangeFilter !== 'ALL';

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '48px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 1. PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '26px' }}>📊</span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>
              Shree Associates Research Watchlist & Ideas
            </h1>
          </div>
          <p style={{ fontSize: '15px', color: '#475569', maxWidth: '850px', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
            Answers one institutional question only: <strong style={{ color: '#2563EB', fontWeight: 700 }}>"Which stocks deserve attention today?"</strong> Real-time quantitative screening and 6-Rule Weekly evaluation.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <button
            onClick={() => setIsAnalyzeOpen(true)}
            className="btnPrimary"
            style={{ padding: '12px 22px', fontSize: '14px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
          >
            <span>➕</span>
            <span>Analyze Asset / New Idea</span>
          </button>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }} />
            <span>Last Updated: <strong>{lastUpdated || 'Syncing...'}</strong> (Live 15s auto-refresh)</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '16px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* 2. COMPACT RESEARCH SUMMARY BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '28px', backgroundColor: '#F1F5F9', padding: '12px', borderRadius: '12px', color: '#334155' }}>📁</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Stocks Tracked</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{summaryMetrics.totalTracked}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '28px', backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '12px', color: '#2563EB' }}>🏛️</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passing 6-Rule Engine</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
              {summaryMetrics.passing6Rule} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>({summaryMetrics.totalTracked > 0 ? Math.round((summaryMetrics.passing6Rule/summaryMetrics.totalTracked)*100) : 0}%)</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '28px', backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px' }}>🟢</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Near Buy Opportunities</div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#065F46', marginTop: '2px' }}>{summaryMetrics.nearBuyCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '28px', backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px' }}>⚠️</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Near Sell Opportunities</div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#B45309', marginTop: '2px' }}>{summaryMetrics.nearSellCount}</div>
          </div>
        </div>
      </div>

      {/* 3. PROFESSIONAL FILTER BAR */}
      <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '320px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#94A3B8' }}>🔍</span>
          <input
            type="text"
            placeholder="Search symbol, company, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13.5px',
              outline: 'none',
              fontWeight: 500,
              backgroundColor: '#F8FAFC',
            }}
          />
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <select
            value={assetTypeFilter}
            onChange={(e: any) => setAssetTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, backgroundColor: '#FFFFFF', color: '#334155', cursor: 'pointer' }}
          >
            <option value="ALL">All Asset Types</option>
            <option value="Stock">Stocks</option>
            <option value="ETF">ETFs & Index</option>
            <option value="Crypto">Crypto</option>
            <option value="Commodity">Commodities</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, backgroundColor: '#FFFFFF', color: '#334155', cursor: 'pointer' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Near Buy">🟢 Near Buy</option>
            <option value="Buy Triggered">🔥 Buy Triggered</option>
            <option value="Holding">🛡️ Holding</option>
            <option value="Near Sell">⚠️ Near Sell</option>
            <option value="Target Hit">🎯 Target Hit</option>
            <option value="Stop Loss Hit">🚨 Stop Loss Hit</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e: any) => setRatingFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, backgroundColor: '#FFFFFF', color: '#334155', cursor: 'pointer' }}
          >
            <option value="ALL">All Shree Ratings</option>
            <option value="6">★★★★★★ 6/6 Flawless</option>
            <option value="5+">★★★★★☆ 5+ Stars</option>
            <option value="4+">★★★★☆☆ 4+ Institutional Pass</option>
            <option value="<4">★★★☆☆☆ &lt; 4 Stars</option>
          </select>

          <select
            value={exchangeFilter}
            onChange={(e: any) => setExchangeFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, backgroundColor: '#FFFFFF', color: '#334155', cursor: 'pointer' }}
          >
            <option value="ALL">All Exchanges</option>
            <option value="NSE_BSE">NSE / BSE (.NS/.BO)</option>
            <option value="US_GLOBAL">US & Global</option>
            <option value="CRYPTO_COMMODITY">Crypto / Commodities</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('');
                setAssetTypeFilter('ALL');
                setStatusFilter('ALL');
                setRatingFilter('ALL');
                setExchangeFilter('ALL');
              }}
              className="btnSecondary"
              style={{ padding: '8px 14px', fontSize: '12px', color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2', fontWeight: 700 }}
            >
              ✕ Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. BULK SELECTION ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div style={{ padding: '14px 20px', borderRadius: '12px', backgroundColor: '#1E293B', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>✨</span>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>{selectedIds.length} research assets selected</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowAnalyzeBatchModal(true)}
              style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#3B82F6', color: '#FFFFFF', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>📊</span> Analyze Selected
            </button>
            <button
              onClick={handleBulkMoveToPortfolio}
              style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>💼</span> Move to Portfolio
            </button>
            <button
              onClick={handleExportCSV}
              style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#475569', color: '#FFFFFF', border: '1px solid #64748B', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>📥</span> Export CSV
            </button>
            <button
              onClick={handleBulkDelete}
              style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🗑️</span> Delete
            </button>
          </div>
        </div>
      )}

      {/* 5. WATCHLIST TABLE */}
      <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', overflowX: 'auto', marginBottom: '32px' }}>
        {loading && ideas.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px', animation: 'spin 2s linear infinite' }}>⏳</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Loading Real-Time Watchlist & Valuations...</h3>
            <p style={{ fontSize: '14px', color: '#64748B' }}>Syncing live CMP quotes and institutional 6-Rule scores.</p>
          </div>
        ) : sortedIdeas.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>📊</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>No Watchlist Stocks Found</h3>
            <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              {hasActiveFilters
                ? 'No investment ideas match your active search or filter criteria. Try resetting your filters above.'
                : 'Your research watchlist is currently empty. Click "+ Analyze Asset / New Idea" in the top header to run a quantitative evaluation and start building your institutional decision workspace.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 10px', width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={sortedIdeas.length > 0 && selectedIds.length === sortedIdeas.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th style={{ padding: '12px 10px' }}>Symbol & Company</th>
                <th style={{ padding: '12px 10px' }}>Live CMP</th>
                <th style={{ padding: '12px 10px' }}>Buy Price</th>
                <th style={{ padding: '12px 10px' }}>Target Price</th>
                <th style={{ padding: '12px 10px' }}>Distance to Buy (%)</th>
                <th style={{ padding: '12px 10px' }}>Distance to Target (%)</th>
                <th style={{ padding: '12px 10px' }}>Weekly Score & Conf.</th>
                <th style={{ padding: '12px 10px' }}>Current Status</th>
                <th style={{ padding: '12px 10px' }}>Recommendation</th>
                <th style={{ padding: '12px 10px' }}>Portfolio P&L</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedIdeas.map((idea, idx) => {
                const isSelected = selectedIds.includes(idea.id);
                const isBuyPriority = idea.status === 'Near Buy' || idea.status === 'Buy Triggered';

                return (
                  <tr
                    key={idea.id}
                    style={{
                      borderBottom: idx === sortedIdeas.length - 1 ? 'none' : '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#EFF6FF' : isBuyPriority ? '#FCFDF8' : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '16px 10px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(idea.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '16px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link href={`/charts?symbol=${idea.symbol}`} style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px', textDecoration: 'none' }}>
                          {idea.symbol}
                        </Link>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
                          {idea.assetType}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                        {idea.company?.slice(0, 24)}
                      </div>
                      {idea.notes && (
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', fontStyle: 'italic', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={idea.notes}>
                          "{idea.notes}"
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '16px 10px', fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>
                      ₹{idea.cmp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td style={{ padding: '16px 10px', fontWeight: 700, color: '#16A34A', fontSize: '14px' }}>
                      ₹{idea.buy.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td style={{ padding: '16px 10px', fontWeight: 700, color: '#2563EB', fontSize: '14px' }}>
                      ₹{idea.target.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {idea.expectedUpsidePct > 0 && (
                        <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 600 }}>
                          +{idea.expectedUpsidePct.toFixed(1)}% total
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '16px 10px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: idea.distanceToBuyPct <= 2 && idea.distanceToBuyPct >= -2 ? '#16A34A' : idea.distanceToBuyPct < -2 ? '#2563EB' : '#64748B',
                          backgroundColor: idea.distanceToBuyPct <= 2 && idea.distanceToBuyPct >= -2 ? '#DCFCE7' : idea.distanceToBuyPct < -2 ? '#EFF6FF' : '#F8FAFC',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                        }}
                      >
                        {idea.distanceToBuyPct >= 0 ? `+${idea.distanceToBuyPct.toFixed(1)}% above` : `${idea.distanceToBuyPct.toFixed(1)}% below`}
                      </span>
                    </td>

                    <td style={{ padding: '16px 10px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: idea.distanceToTargetPct > 0 ? '#1D4ED8' : '#DC2626',
                          backgroundColor: idea.distanceToTargetPct > 0 ? '#EFF6FF' : '#FEE2E2',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                        }}
                      >
                        {idea.distanceToTargetPct >= 0 ? `+${idea.distanceToTargetPct.toFixed(1)}% left` : `${idea.distanceToTargetPct.toFixed(1)}% past`}
                      </span>
                    </td>

                    <td style={{ padding: '16px 10px' }}>
                      <div style={{ color: '#2563EB', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px' }}>
                        {renderStars(idea.score)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 700, marginTop: '2px' }}>
                        Score: {idea.score}/6 | Conf: {idea.confidence}%
                      </div>
                    </td>

                    <td style={{ padding: '16px 10px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          padding: '5px 10px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor:
                            idea.status === 'Near Buy'
                              ? '#DCFCE7'
                              : idea.status === 'Buy Triggered'
                              ? '#DBEAFE'
                              : idea.status === 'Target Hit'
                              ? '#D1FAE5'
                              : idea.status === 'Stop Loss Hit'
                              ? '#FEE2E2'
                              : idea.status === 'Near Sell'
                              ? '#FEF3C7'
                              : '#F1F5F9',
                          color:
                            idea.status === 'Near Buy'
                              ? '#166534'
                              : idea.status === 'Buy Triggered'
                              ? '#1D4ED8'
                              : idea.status === 'Target Hit'
                              ? '#065F46'
                              : idea.status === 'Stop Loss Hit'
                              ? '#991B1B'
                              : idea.status === 'Near Sell'
                              ? '#92400E'
                              : '#475569',
                          border: '1px solid rgba(0,0,0,0.05)',
                        }}
                      >
                        {idea.status === 'Near Buy' && '🟢'}
                        {idea.status === 'Buy Triggered' && '🔥'}
                        {idea.status === 'Target Hit' && '🎯'}
                        {idea.status === 'Stop Loss Hit' && '🚨'}
                        {idea.status === 'Near Sell' && '⚠️'}
                        {idea.status === 'Holding' && '🛡️'}
                        <span>{idea.status}</span>
                      </span>
                    </td>

                    <td style={{ padding: '16px 10px' }}>
                      <span className={idea.recommendation.badgeClass} style={{ fontWeight: 800, fontSize: '11.5px', padding: '4px 10px', borderRadius: '6px' }}>
                        {idea.recommendation.label}
                      </span>
                    </td>

                    <td style={{ padding: '16px 10px' }}>
                      {idea.openPos && idea.portfolioPnl !== null ? (
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: idea.portfolioPnl >= 0 ? '#DCFCE7' : '#FEE2E2',
                            color: idea.portfolioPnl >= 0 ? '#166534' : '#991B1B',
                            display: 'inline-block',
                          }}
                        >
                          {idea.portfolioPnl >= 0 ? '+' : ''}₹{idea.portfolioPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({idea.portfolioPnl >= 0 ? '+' : ''}{idea.portfolioPnlPct?.toFixed(1)}%)
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Not in Portfolio</span>
                      )}
                    </td>

                    <td style={{ padding: '16px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link
                          href={`/charts?symbol=${idea.symbol}`}
                          title="Open Chart"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            fontSize: '15px',
                            border: '1px solid #BFDBFE',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          📈
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedSymbolForAdd(idea.symbol);
                            setSelectedPriceForAdd(idea.buy || idea.cmp);
                            setSelectedTargetForAdd(idea.target);
                            setSelectedStopForAdd(idea.stop);
                            setIsAddPosOpen(true);
                          }}
                          title="Add Position to Portfolio"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #A7F3D0',
                            cursor: 'pointer',
                            fontSize: '15px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          💼
                        </button>
                        <button
                          onClick={() => {
                            setSelectedIdeaToEdit(idea);
                            setIsEditIdeaOpen(true);
                          }}
                          title="Edit Watchlist Idea"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#F8FAFC',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #CBD5E1',
                            cursor: 'pointer',
                            fontSize: '15px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteIdea(idea.id, idea.symbol)}
                          title="Delete from Watchlist"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#FEF2F2',
                            color: '#EF4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #FECACA',
                            cursor: 'pointer',
                            fontSize: '15px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 6. RESEARCH INSIGHTS PANEL GENERATED FROM LIVE DATA */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>🧠</span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Live Algorithmic Research Insights
          </h2>
          <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', backgroundColor: '#DBEAFE', color: '#1E40AF', textTransform: 'uppercase' }}>
            Generated from Live Data
          </span>
        </div>

        {!insights ? (
          <div className="card" style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>💡</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', margin: '0 0 6px 0' }}>No Watchlist Data Available to Generate Insights</h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Analyze and save at least one asset above to unlock algorithmic research insights, weekly setup identification, and valuation highlights.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {/* Insight 1: Most Undervalued Stock */}
            <div className="card" style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💎</span> Most Undervalued
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>{insights.mostUndervalued.symbol}</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{insights.mostUndervalued.company?.slice(0, 20)}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A', marginTop: '10px', backgroundColor: '#DCFCE7', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                  +{insights.mostUndervalued.expectedUpsidePct.toFixed(1)}% Upside Potential
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                <Link href={`/charts?symbol=${insights.mostUndervalued.symbol}`} className="btnSecondary" style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '12px', textDecoration: 'none' }}>
                  📈 Chart
                </Link>
                <button
                  onClick={() => {
                    setSelectedSymbolForAdd(insights.mostUndervalued.symbol);
                    setSelectedPriceForAdd(insights.mostUndervalued.buy || insights.mostUndervalued.cmp);
                    setSelectedTargetForAdd(insights.mostUndervalued.target);
                    setSelectedStopForAdd(insights.mostUndervalued.stop);
                    setIsAddPosOpen(true);
                  }}
                  className="btnSuccess"
                  style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                >
                  💼 Add
                </button>
              </div>
            </div>

            {/* Insight 2: Strongest Weekly Setup */}
            <div className="card" style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔥</span> Strongest Weekly Setup
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>{insights.strongestSetup.symbol}</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{insights.strongestSetup.company?.slice(0, 20)}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', marginTop: '10px', backgroundColor: '#EFF6FF', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                  Score: {insights.strongestSetup.score}/6 | {insights.strongestSetup.status}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                <Link href={`/charts?symbol=${insights.strongestSetup.symbol}`} className="btnSecondary" style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '12px', textDecoration: 'none' }}>
                  📈 Chart
                </Link>
                <button
                  onClick={() => {
                    setSelectedSymbolForAdd(insights.strongestSetup.symbol);
                    setSelectedPriceForAdd(insights.strongestSetup.buy || insights.strongestSetup.cmp);
                    setSelectedTargetForAdd(insights.strongestSetup.target);
                    setSelectedStopForAdd(insights.strongestSetup.stop);
                    setIsAddPosOpen(true);
                  }}
                  className="btnSuccess"
                  style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                >
                  💼 Add
                </button>
              </div>
            </div>

            {/* Insight 3: Highest Institutional Buying */}
            <div className="card" style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏛️</span> Institutional Conviction
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>{insights.highestConfidence.symbol}</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{insights.highestConfidence.company?.slice(0, 20)}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '10px', backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                  {insights.highestConfidence.confidence}% Conf. | {insights.highestConfidence.score}/6 Score
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                <Link href={`/charts?symbol=${insights.highestConfidence.symbol}`} className="btnSecondary" style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '12px', textDecoration: 'none' }}>
                  📈 Chart
                </Link>
                <button
                  onClick={() => {
                    setSelectedSymbolForAdd(insights.highestConfidence.symbol);
                    setSelectedPriceForAdd(insights.highestConfidence.buy || insights.highestConfidence.cmp);
                    setSelectedTargetForAdd(insights.highestConfidence.target);
                    setSelectedStopForAdd(insights.highestConfidence.stop);
                    setIsAddPosOpen(true);
                  }}
                  className="btnSuccess"
                  style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                >
                  💼 Add
                </button>
              </div>
            </div>

            {/* Insight 4: Closest to Buy Zone */}
            <div className="card" style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯</span> Closest to Buy Zone
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>{insights.closestToBuy.symbol}</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{insights.closestToBuy.company?.slice(0, 20)}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A', marginTop: '10px', backgroundColor: '#DCFCE7', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                  {insights.closestToBuy.distanceToBuyPct >= 0 ? `+${insights.closestToBuy.distanceToBuyPct.toFixed(1)}% above buy` : `${insights.closestToBuy.distanceToBuyPct.toFixed(1)}% below buy`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                <Link href={`/charts?symbol=${insights.closestToBuy.symbol}`} className="btnSecondary" style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '12px', textDecoration: 'none' }}>
                  📈 Chart
                </Link>
                <button
                  onClick={() => {
                    setSelectedSymbolForAdd(insights.closestToBuy.symbol);
                    setSelectedPriceForAdd(insights.closestToBuy.buy || insights.closestToBuy.cmp);
                    setSelectedTargetForAdd(insights.closestToBuy.target);
                    setSelectedStopForAdd(insights.closestToBuy.stop);
                    setIsAddPosOpen(true);
                  }}
                  className="btnSuccess"
                  style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                >
                  💼 Add
                </button>
              </div>
            </div>

            {/* Insight 5: Highest Expected Upside */}
            <div className="card" style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🚀</span> Highest Expected Upside
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>{insights.highestUpside.symbol}</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{insights.highestUpside.company?.slice(0, 20)}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', marginTop: '10px', backgroundColor: '#EFF6FF', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                  +{insights.highestUpside.distanceToTargetPct.toFixed(1)}% Upside Left
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                <Link href={`/charts?symbol=${insights.highestUpside.symbol}`} className="btnSecondary" style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '12px', textDecoration: 'none' }}>
                  📈 Chart
                </Link>
                <button
                  onClick={() => {
                    setSelectedSymbolForAdd(insights.highestUpside.symbol);
                    setSelectedPriceForAdd(insights.highestUpside.buy || insights.highestUpside.cmp);
                    setSelectedTargetForAdd(insights.highestUpside.target);
                    setSelectedStopForAdd(insights.highestUpside.stop);
                    setIsAddPosOpen(true);
                  }}
                  className="btnSuccess"
                  style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                >
                  💼 Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. GLOBAL ACTION MODALS */}
      <AddPositionModal
        isOpen={isAddPosOpen}
        onClose={() => setIsAddPosOpen(false)}
        onSuccess={() => fetchData(true)}
        initialSymbol={selectedSymbolForAdd}
        initialPrice={selectedPriceForAdd}
        initialTarget={selectedTargetForAdd}
        initialStopLoss={selectedStopForAdd}
      />

      <EditWatchlistModal
        isOpen={isEditIdeaOpen}
        onClose={() => setIsEditIdeaOpen(false)}
        idea={selectedIdeaToEdit}
        onSuccess={() => fetchData(true)}
      />

      <AnalyzeStockModal
        isOpen={isAnalyzeOpen}
        onClose={() => setIsAnalyzeOpen(false)}
        onIdeaSaved={() => fetchData(true)}
      />

      {/* 8. BATCH ANALYSIS SUMMARY MODAL */}
      {showAnalyzeBatchModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div className="card" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '28px', maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Institutional Batch Research Analysis</h3>
              </div>
              <button onClick={() => setShowAnalyzeBatchModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
              Summary analysis for <strong style={{ color: '#0F172A' }}>{selectedIds.length} selected assets</strong> evaluated against the Shree Associates 6-Rule Methodology:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {enrichedIdeas.filter((i) => selectedIds.includes(i.id)).map((i) => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{i.symbol}</span>
                    <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '8px' }}>({i.company?.slice(0, 20)})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB' }}>Score: {i.score}/6</span>
                    <span className={i.recommendation.badgeClass} style={{ fontSize: '11px', fontWeight: 800 }}>{i.recommendation.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: i.distanceToBuyPct <= 2 ? '#16A34A' : '#64748B' }}>
                      {i.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <button onClick={() => setShowAnalyzeBatchModal(false)} className="btnSecondary" style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 700 }}>
                Close Summary
              </button>
              <button
                onClick={() => {
                  setShowAnalyzeBatchModal(false);
                  handleBulkMoveToPortfolio();
                }}
                className="btnPrimary"
                style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 700 }}
              >
                💼 Move Selected to Portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
