'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';

interface AnalyzeStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIdeaSaved?: () => void;
  initialSymbol?: string;
}

export const AnalyzeStockModal: React.FC<AnalyzeStockModalProps> = ({
  isOpen,
  onClose,
  onIdeaSaved,
  initialSymbol,
}) => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);

  // Step 2 form values for saving idea
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && initialSymbol) {
      setSymbol(initialSymbol);
      runAnalysisForSymbol(initialSymbol);
    }
  }, [isOpen, initialSymbol]);

  if (!isOpen) return null;

  const runAnalysisForSymbol = async (symToAnalyze: string) => {
    if (!symToAnalyze.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setSaveSuccess(false);

    try {
      let formattedSymbol = symToAnalyze.trim().toUpperCase();
      if (!formattedSymbol.includes('.')) formattedSymbol += '.NS';

      const res = await api.get(`/fundamental/analyze?symbol=${encodeURIComponent(formattedSymbol)}`);
      const data = res.data.data;
      setAnalysis(data);

      const cmp = data.currentPrice || 0;
      if (cmp > 0) {
        setBuyPrice(cmp.toFixed(2));
        setTargetPrice((cmp * 1.15).toFixed(2)); // 15% upside target default
        setStopLoss((cmp * 0.93).toFixed(2)); // 7% stop loss default
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unable to fetch live market data or fundamental metrics.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    runAnalysisForSymbol(symbol);
  };

  const handleSaveIdea = async () => {
    if (!analysis || !buyPrice || !targetPrice || !stopLoss) return;
    setSaving(true);
    setError(null);

    try {
      await api.post('/ideas', {
        company: analysis.company,
        symbol: analysis.symbol,
        currentPrice: analysis.currentPrice,
        alphaedgeScore: analysis.alphaedgeScore,
        checksJson: JSON.stringify(analysis.checks || []),
        buyPrice: parseFloat(buyPrice),
        targetPrice: parseFloat(targetPrice),
        stopLoss: parseFloat(stopLoss),
        notes: notes.trim() || undefined,
      });

      setSaveSuccess(true);
      if (onIdeaSaved) onIdeaSaved();
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save investment idea.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSymbol('');
    setAnalysis(null);
    setError(null);
    setBuyPrice('');
    setTargetPrice('');
    setStopLoss('');
    setNotes('');
    setSaveSuccess(false);
  };

  const renderStars = (score: number) => {
    return '★'.repeat(score) + '☆'.repeat(Math.max(0, 6 - score));
  };

  const getFvgBadgeStyle = (status?: string) => {
    switch (status) {
      case 'INSIDE_BUY_ZONE':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', label: '🔥 Inside Bullish FVG Buy Zone' };
      case 'NEAR_BUY_ZONE':
        return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', label: '🟢 Near Buy Zone (≤5% away)' };
      case 'INSIDE_SELL_ZONE':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5', label: '⚠️ Inside Bearish FVG Sell Zone' };
      case 'NEAR_SELL_ZONE':
        return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA', label: '🟠 Near Sell Zone (≤5% away)' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', label: '⚪ Neutral Consolidation' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 800 }}>▲</span>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Shree Associates Institutional Evaluation</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontWeight: 500 }}>
              Evaluates asset against 6 institutional rules, weekly FVG order blocks, and valuation multiples. 100% Real Data.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748B' }}
          >
            ✕
          </button>
        </div>

        {/* Step 1: Search Form */}
        <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter Ticker / Symbol (e.g., RELIANCE.NS, TCS.NS, INFY.NS, CDSL.NS)..."
            className="input"
            style={{ flex: 1, padding: '12px 16px', fontSize: '15px' }}
            disabled={loading || saving}
          />
          <button
            type="submit"
            className="btnPrimary"
            style={{ padding: '0 24px', fontSize: '15px', whiteSpace: 'nowrap' }}
            disabled={loading || saving || !symbol.trim()}
          >
            {loading ? 'Evaluating...' : 'Run Analysis'}
          </button>
        </form>

        {/* Error State */}
        {error && (
          <div className="emptyState" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
            <div className="emptyStateTitle" style={{ color: '#991B1B' }}>Analysis Failed</div>
            <div className="emptyStateText" style={{ color: '#B91C1C', marginBottom: 0 }}>{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="emptyState" style={{ padding: '48px 20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 2s linear infinite' }}>⏳</div>
            <div className="emptyStateTitle" style={{ fontSize: '18px', fontWeight: 700 }}>Fetching Live Institutional & Market Data...</div>
            <div className="emptyStateText">
              Evaluating shareholding structure, unrounded PE/PB historical multiples, forward EPS growth, RSI momentum, and Weekly FVG Order Blocks.
            </div>
          </div>
        )}

        {/* Step 2: Analysis Results */}
        {analysis && !loading && (
          <div>
            {/* Header Summary */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '22px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                    {analysis.company} <span style={{ fontSize: '15px', color: '#64748B', fontWeight: 600 }}>({analysis.symbol})</span>
                  </h3>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', fontWeight: 500 }}>
                    Sector: {analysis.sector} • Industry: {analysis.industry} • Market Cap: ₹{(analysis.marketCap / 1e7)?.toFixed(0) || 0} Cr
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>₹{analysis.currentPrice?.toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Live Market Price (CMP)</div>
                </div>
              </div>

              {/* Star Rating Banner */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px 18px',
                  backgroundColor: analysis.alphaedgeScore >= 4 ? '#ECFDF5' : analysis.alphaedgeScore === 3 ? '#EFF6FF' : '#FEF2F2',
                  border: `1px solid ${analysis.alphaedgeScore >= 4 ? '#A7F3D0' : analysis.alphaedgeScore === 3 ? '#BFDBFE' : '#FECACA'}`,
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB', marginRight: '10px', letterSpacing: '1px' }}>
                    {renderStars(analysis.alphaedgeScore)}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    Shree Rating: {analysis.alphaedgeScore} / 6
                  </span>
                </div>
                <span
                  className={analysis.alphaedgeScore >= 4 ? 'badge badgeBullish' : analysis.alphaedgeScore === 3 ? 'badge badgeNeutral' : 'badge badgeBearish'}
                  style={{ fontSize: '13px', padding: '6px 14px', fontWeight: 700 }}
                >
                  {analysis.recommendationLabel || (analysis.alphaedgeScore >= 4 ? '🚀 WORTH BUYING' : analysis.alphaedgeScore === 3 ? '👀 WATCHLIST' : '⚠️ AVOID')}
                </span>
              </div>
            </div>

            {/* Valuation Multiples Section (Method A & Method B) */}
            {analysis.valuation && (
              <div style={{ marginBottom: '24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚖️</span>
                  <span>Valuation Multiples Benchmark (Unrounded Historical Averages)</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Method A: PE */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Method A: P/E Multiple</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: analysis.valuation.pe?.isUndervalued ? '#DCFCE7' : '#FEE2E2', color: analysis.valuation.pe?.isUndervalued ? '#15803D' : '#B91C1C' }}>
                        {analysis.valuation.pe?.isUndervalued ? 'Undervalued' : 'Above Benchmark'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                      <div>Current P/E: <strong style={{ color: '#0F172A' }}>{analysis.valuation.pe?.current?.toFixed(2) || 'N/A'}</strong></div>
                      <div>1Y Avg: {analysis.valuation.pe?.avg1Y?.toFixed(2)} | 3Y Avg: {analysis.valuation.pe?.avg3Y?.toFixed(2)} | 5Y Avg: {analysis.valuation.pe?.avg5Y?.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Method B: PB */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Method B: P/B Multiple</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: analysis.valuation.pb?.isUndervalued ? '#DCFCE7' : '#FEE2E2', color: analysis.valuation.pb?.isUndervalued ? '#15803D' : '#B91C1C' }}>
                        {analysis.valuation.pb?.isUndervalued ? 'Undervalued' : 'Above Benchmark'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                      <div>Current P/B: <strong style={{ color: '#0F172A' }}>{analysis.valuation.pb?.current?.toFixed(2) || 'N/A'}</strong></div>
                      <div>1Y Avg: {analysis.valuation.pb?.avg1Y?.toFixed(2)} | 3Y Avg: {analysis.valuation.pb?.avg3Y?.toFixed(2)} | 5Y Avg: {analysis.valuation.pb?.avg5Y?.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly FVG & Order Block Structure */}
            {analysis.weeklyOrderBlock && (
              <div style={{ marginBottom: '24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📊</span>
                    <span>Weekly FVG & Order Block Structure (Institutional Zones)</span>
                  </h4>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '16px',
                    ...(() => {
                      const st = getFvgBadgeStyle(analysis.weeklyOrderBlock.zoneStatus);
                      return { backgroundColor: st.bg, color: st.text, border: `1px solid ${st.border}` };
                    })()
                  }}>
                    {getFvgBadgeStyle(analysis.weeklyOrderBlock.zoneStatus).label}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#334155', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '14px', lineHeight: 1.5, fontWeight: 500 }}>
                  <strong>Algorithmic Verdict:</strong> {analysis.weeklyOrderBlock.explanation}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46', marginBottom: '6px' }}>
                      🟢 Active Bullish Zones ({analysis.weeklyOrderBlock.activeBullishZones?.length || 0})
                    </div>
                    {analysis.weeklyOrderBlock.activeBullishZones?.length > 0 ? (
                      <div style={{ fontSize: '12px', color: '#064E3B' }}>
                        {analysis.weeklyOrderBlock.activeBullishZones.map((z: any, idx: number) => (
                          <div key={idx} style={{ marginBottom: '4px' }}>
                            • ₹{z.bottom?.toFixed(2)} - ₹{z.top?.toFixed(2)} (Gap: {z.imbalancePct?.toFixed(1)}%)
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#065F46', fontStyle: 'italic' }}>No unmitigated weekly buy zones.</div>
                    )}
                  </div>

                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', marginBottom: '6px' }}>
                      🔴 Overhead Bearish Zones ({analysis.weeklyOrderBlock.activeBearishZones?.length || 0})
                    </div>
                    {analysis.weeklyOrderBlock.activeBearishZones?.length > 0 ? (
                      <div style={{ fontSize: '12px', color: '#7F1D1D' }}>
                        {analysis.weeklyOrderBlock.activeBearishZones.map((z: any, idx: number) => (
                          <div key={idx} style={{ marginBottom: '4px' }}>
                            • ₹{z.bottom?.toFixed(2)} - ₹{z.top?.toFixed(2)} (Gap: {z.imbalancePct?.toFixed(1)}%)
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#991B1B', fontStyle: 'italic' }}>No overhead institutional supply boxes.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6-Rule Breakdown */}
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
              6-Rule Institutional Evaluation Breakdown
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {analysis.checks?.map((check: any) => (
                <div
                  key={check.code}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: check.passed ? '#FFFFFF' : '#FEF2F2',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                  }}
                >
                  <span
                    className={check.passed ? 'badge badgeBullish' : 'badge badgeBearish'}
                    style={{ minWidth: '65px', justifyContent: 'center', fontWeight: 800, padding: '6px 10px' }}
                  >
                    {check.passed ? '✔ PASS' : '✖ FAIL'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{check.name}</div>
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '3px' }}>
                      <strong>Real Metric:</strong> {check.displayValue}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>{check.reason}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Step 3: Save as Investment Idea */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '22px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
                Save to Workspace Watchlist & Set Price Levels
              </h4>

              <div className="grid3" style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="inputGroup">
                  <label className="label" style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Ideal Buy Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                    required
                  />
                </div>
                <div className="inputGroup">
                  <label className="label" style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Target Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                    required
                  />
                </div>
                <div className="inputGroup">
                  <label className="label" style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Stop Loss (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                    required
                  />
                </div>
              </div>

              <div className="inputGroup" style={{ marginBottom: '20px' }}>
                <label className="label" style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Analyst Notes & Thesis (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why do you recommend buying or avoiding this stock? What is the FVG trigger?"
                  className="textarea"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'inherit' }}
                  rows={2}
                />
              </div>

              {saveSuccess && (
                <div className="badge badgeBullish" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginBottom: '16px', fontSize: '14px', fontWeight: 700 }}>
                  ✔ Investment Idea saved to Shree Associates Workspace! Redirecting...
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={handleReset} className="btnSecondary" style={{ padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}>
                  Analyze Another Asset
                </button>
                <button
                  type="button"
                  onClick={handleSaveIdea}
                  className="btnPrimary"
                  style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700 }}
                  disabled={saving || saveSuccess || !buyPrice || !targetPrice || !stopLoss}
                >
                  {saving ? 'Saving Idea...' : '💡 Save Idea & Track'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
