'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

import api from '@/lib/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pencil, Trash2, CheckCircle2, Clock, TrendingUp, TrendingDown, Target, ShieldAlert, Users, X, Info } from 'lucide-react';
import { formatDecimal, calculateInvestment, calculateCurrentValue, calculateLivePnL, calculateReturnPct, calculateRealizedPnL, calculateRealizedReturnPct } from '@/lib/financial-calculations';

export default function OpenPositionsPage() {
  const { user } = useAuth();
  
  

  const [positions, setPositions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Performer Rotation State
  const [performerIndex, setPerformerIndex] = useState(0);

  // Search, Filter, Sort, Pagination
  const [search, setSearch] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [investorFilter, setInvestorFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('entryDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sparkline cache state
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  // CSV Bulk Import wizard states
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importStep, setImportStep] = useState<'UPLOAD' | 'PREVIEW' | 'REPORT'>('UPLOAD');
  const [csvContent, setCsvContent] = useState('');
  const [importReport, setImportReport] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(displaySearch);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [displaySearch]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Investor management state
  const [newInvestorName, setNewInvestorName] = useState('Shree');
  const [isCreatingNewInvestor, setIsCreatingNewInvestor] = useState(false);
  const [customNewInvestor, setCustomNewInvestor] = useState('');

  const [isEditingNewInvestor, setIsEditingNewInvestor] = useState(false);
  const [customEditInvestor, setCustomEditInvestor] = useState('');

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    investorName: 'Shree',
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

  // CSV Import Wizard Handlers
  const downloadTemplate = () => {
    const headers = 'Investor,Symbol,Buy Price,Quantity,Target,Stop Loss,Buy Date,Trade Type,Notes\n';
    const sample = 'Shree,TCS,3400.00,10,3800.00,3200.00,2026-08-01,BUY,Investment note\n';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'shree_associates_bulk_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setImportStep('PREVIEW');
      setImportLoading(true);
      try {
        const res = await api.post('/portfolio/bulk-import', { csvData: text, dryRun: true });
        setImportReport(res.data);
      } catch (err: any) {
        alert(err.response?.data?.message || 'CSV validation dry-run failed.');
        setImportStep('UPLOAD');
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    setImportLoading(true);
    try {
      const res = await api.post('/portfolio/bulk-import', { csvData: csvContent, dryRun: false });
      setImportReport(res.data);
      setImportStep('REPORT');
      fetchPositions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Bulk import failed.');
    } finally {
      setImportLoading(false);
    }
  };

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

    let currentValue = 0;
    let profitLoss = 0;
    let profitLossPct = 0;
    let finalClosedAt = editingPosition.closedAt;
    let holdingPeriod = editingPosition.holdingPeriod;

    if (isSellWorkflow) {
      currentValue = calculateCurrentValue(sp, qty, editForm.tradeType, bp);
      profitLoss = calculateRealizedPnL(bp, sp, qty, editForm.tradeType);
      profitLossPct = calculateRealizedReturnPct(bp, sp, editForm.tradeType);
      finalClosedAt = editForm.closedAt ? new Date(editForm.closedAt).toISOString() : new Date().toISOString();
      holdingPeriod = Math.max(0, Math.floor((new Date(finalClosedAt).getTime() - new Date(entryDate).getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      currentValue = calculateCurrentValue(editingPosition.currentPrice, qty, editForm.tradeType, bp);
      profitLoss = calculateLivePnL(bp, editingPosition.currentPrice, qty, editForm.tradeType);
      profitLossPct = calculateReturnPct(bp, editingPosition.currentPrice, editForm.tradeType);
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
        investorName: isEditingNewInvestor ? customEditInvestor.trim() || 'Shree' : editForm.investorName,
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
          investorName: isCreatingNewInvestor ? customNewInvestor.trim() || 'Shree' : newInvestorName,
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
          investorName: isCreatingNewInvestor ? customNewInvestor.trim() || 'Shree' : newInvestorName,
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
      const filtersText = `Filters: Investor=${investorFilter}, Type=${typeFilter}`;
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
      'Current Price',
      'Qty',
      'Invested Value',
      'Current Value',
      'Live P&L',
      'Return %',
      'Target Price',
      'Stop Loss',
      'Status'
    ];

    const tableRows = filteredPositions.map((p) => {
      const isProfit = p.profitLoss >= 0;
      return [
        p.symbol,
        p.company || p.symbol,
        p.investorName || 'Shree',
        `₹${p.buyPrice.toFixed(2)}`,
        `₹${p.currentPrice.toFixed(2)}`,
        p.quantity.toString(),
        `₹${p.investedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        `₹${p.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        `${isProfit ? '+' : ''}₹${p.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        `${isProfit ? '+' : ''}${formatDecimal(p.profitLossPct)}%`,
        p.targetPrice ? `₹${p.targetPrice.toFixed(2)}` : '-',
        p.stopLoss ? `₹${p.stopLoss.toFixed(2)}` : '-',
        p.status
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 65,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 8 || data.column.index === 9) {
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

    if (finalY + 80 > pageHeight) {
      doc.addPage();
      drawHeader();
    }

    const startTotalY = finalY + 15;
    doc.setFillColor(248, 250, 252);
    doc.rect(20, startTotalY, pageWidth - 40, 48, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, startTotalY, pageWidth - 40, 48, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    const overallPnL = filteredPositions.reduce((sum, p) => sum + p.profitLoss, 0);
    const totalInvested = filteredPositions.reduce((sum, p) => sum + p.investedAmount, 0);
    const currentExposure = filteredPositions.reduce((sum, p) => sum + p.currentValue, 0);
    const overallReturn = totalInvested > 0 ? (overallPnL / totalInvested) * 100 : 0;

    doc.text(`Total Investment: ₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 30, startTotalY + 20);
    doc.text(`Current Portfolio Value: ₹${currentExposure.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 30, startTotalY + 36);

    doc.setTextColor(overallPnL >= 0 ? 22 : 220, overallPnL >= 0 ? 163 : 38, overallPnL >= 0 ? 74 : 38);
    doc.text(`Total Unrealized Profit/Loss: ${overallPnL >= 0 ? '+' : ''}₹${overallPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, pageWidth / 2 + 10, startTotalY + 20);
    doc.text(`Overall Return: ${overallPnL >= 0 ? '+' : ''}${overallReturn.toFixed(2)}%`, pageWidth / 2 + 10, startTotalY + 36);

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

    doc.save(`Shree_Associates_Open_Positions_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // KPI summaries
  const totalOpenTrades = positions.length;
  const currentExposure = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const overallPnL = positions.reduce((sum, p) => sum + p.profitLoss, 0);

  // Performance Leaders Logic
  const sortedByPerf = positions.length > 0 ? [...positions].sort((a, b) => b.profitLossPct - a.profitLossPct) : [];
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

  // Filtering & Sorting
  const filteredPositions = positions
    .filter((pos) => {
      const term = search.toLowerCase();
      const matchesSearch =
        pos.symbol.toLowerCase().includes(term) ||
        pos.company.toLowerCase().includes(term) ||
        (pos.notes && pos.notes.toLowerCase().includes(term));
      const matchesType = typeFilter === 'ALL' || pos.tradeType === typeFilter;
      const matchesInvestor = investorFilter === 'ALL' || pos.investorName === investorFilter;
      return matchesSearch && matchesType && matchesInvestor;
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

  const cardBg = '#FFFFFF';
  const borderCol = '#E2E8F0';
  const textCol = '#0F172A';
  const subTextCol = '#64748B';

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header Panel */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 900, color: textCol, margin: 0 }}>Open Positions</h1>
          <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
            Active positions and live market performance
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportPDF} className="btnSecondary" style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px' }}>
            📥 Export PDF
          </button>
          {user?.role === 'OWNER' && (
            <>
              <button onClick={() => setShowImportWizard(true)} className="btnSecondary" style={{ padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px', cursor: 'pointer' }}>
                📤 Bulk Upload
              </button>
              <button onClick={() => setShowAddModal(true)} className="btnPrimary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', backgroundColor: '#16A34A' }}>
                ➕ Create Position
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Highlights & KPI cards */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Total Open Trades</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>{totalOpenTrades}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Active Allocations</div>
        </div>

        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Current Exposure</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textCol, marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>₹{currentExposure.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Total Market Value</div>
        </div>

        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Unrealized Live P&amp;L</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: overallPnL >= 0 ? '#16A34A' : '#DC2626', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            {overallPnL >= 0 ? '+' : ''}₹{Math.abs(overallPnL).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: subTextCol, marginTop: '2px' }}>Open Profit/Loss</div>
        </div>

        <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '12px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {currentLeader?.type === 'BEST PERFORMER' ? <TrendingUp size={14} color="#16A34A" /> : <TrendingDown size={14} color={currentLeader ? "#DC2626" : subTextCol} />}
              Performance Leaders
            </span>
            {currentLeader && (
              <span style={{ fontSize: '10px', fontWeight: 800, color: currentLeader.type === 'BEST PERFORMER' ? '#16A34A' : '#DC2626', backgroundColor: currentLeader.type === 'BEST PERFORMER' ? ('#DCFCE7') : ('#FEE2E2'), padding: '2px 6px', borderRadius: '4px' }}>
                #{currentLeader.rank} {currentLeader.type}
              </span>
            )}
          </div>
          
          {currentLeader ? (
            <div key={`${currentLeader.symbol}-${currentLeader.type}-${currentLeader.rank}`} style={{ animation: 'fadeSlideIn 0.5s ease-out forwards' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: textCol, lineHeight: 1.2 }}>{currentLeader.symbol}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: subTextCol, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>₹{currentLeader.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: currentLeader.type === 'BEST PERFORMER' ? '#16A34A' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                    {currentLeader.profitLossPct >= 0 ? '+' : ''}{formatDecimal(currentLeader.profitLossPct)}%
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: subTextCol, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    {currentLeader.profitLoss >= 0 ? '+' : ''}₹{Math.abs(currentLeader.profitLoss).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: subTextCol, fontStyle: 'italic' }}>No active performance data</div>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '12px', flex: 1, width: '100%', maxWidth: isMobile ? 'none' : '600px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search symbol, notes..."
              value={displaySearch}
              onChange={(e) => setDisplaySearch(e.target.value)}
              style={{ padding: '8px 12px', paddingLeft: '32px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', width: '100%', backgroundColor: '#FFFFFF', color: textCol }}
            />
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: subTextCol }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(order as any);
            }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }}
          >
            <option value="entryDate-desc">Newest First</option>
            <option value="entryDate-asc">Oldest First</option>
            <option value="profitLossPct-desc">Highest Profit %</option>
            <option value="profitLossPct-asc">Lowest Profit %</option>
            <option value="currentValue-desc">Highest Value</option>
          </select>

          <select
            value={investorFilter}
            onChange={(e) => setInvestorFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }}
          >
            <option value="ALL">All Investors</option>
            {Array.from(new Set(positions.map((p) => p.investorName).filter(Boolean))).map((inv: any) => (
              <option key={inv} value={inv}>{inv}</option>
            ))}
          </select>
        </div>

        {selectedIds.length > 0 && user?.role === 'OWNER' && (
          <button onClick={() => setShowBulkDeleteConfirm(true)} style={{ padding: '8px 14px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={14} /> Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* TABLE & CARDS */}
      <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
        {loading && positions.length === 0 ? (
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
              <Info size={48} color={subTextCol} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: textCol, margin: 0 }}>No Open Positions</h3>
            <p style={{ fontSize: '14px', color: subTextCol, marginTop: '8px', marginBottom: '24px' }}>
              There are currently no active positions.
            </p>
            {user?.role === 'OWNER' && (
              <button onClick={() => setShowAddModal(true)} className="btnPrimary" style={{ padding: '10px 20px', fontSize: '13px', backgroundColor: '#16A34A', borderRadius: '8px' }}>
                ➕ Create Position
              </button>
            )}
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
            {paginatedPositions.map((pos) => {
              const targetRem = getTargetRemaining(pos);
              const stopRem = getStopRemaining(pos);
              const isProfit = pos.profitLoss >= 0;

              return (
                <div
                  key={pos.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${borderCol}`,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: textCol }}>{pos.symbol}</div>
                      <div style={{ width: '80px', height: '12px' }}>
                        <Sparkline symbol={pos.symbol} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: textCol, fontVariantNumeric: 'tabular-nums' }}>
                        ₹{pos.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: subTextCol }}>
                        Buy: ₹{pos.buyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${borderCol}`, margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: subTextCol }}>Live P&amp;L</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: isProfit ? '#16A34A' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                        {isProfit ? '+' : ''}₹{Math.abs(pos.profitLoss).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: subTextCol }}>Return</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: isProfit ? '#16A34A' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                        {isProfit ? '+' : ''}{formatDecimal(pos.profitLossPct)}%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px', marginTop: '4px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ color: subTextCol, display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Target</span>
                      <strong style={{ color: textCol }}>{pos.targetPrice ? `₹${formatDecimal(pos.targetPrice)}` : <span style={{ color: subTextCol }}>N/A</span>}</strong>
                    </div>
                    <div>
                      <span style={{ color: subTextCol, display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Stop Loss</span>
                      <strong style={{ color: textCol }}>{pos.stopLoss ? `₹${formatDecimal(pos.stopLoss)}` : <span style={{ color: subTextCol }}>N/A</span>}</strong>
                    </div>
                    <div>
                      <span style={{ color: subTextCol, display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Quantity</span>
                      <strong style={{ color: textCol }}>{pos.quantity}</strong>
                    </div>
                    <div>
                      <span style={{ color: subTextCol, display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Holding</span>
                      <strong style={{ color: textCol }}>{pos.holdingPeriod} Days</strong>
                    </div>
                  </div>

                  {user?.role === 'OWNER' && (
                    <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                      <button
                        onClick={() => {
                          setClosingPosition(pos);
                          setClosePrice(pos.currentPrice.toString());
                        }}
                        style={{
                          flex: 1.5,
                          height: '40px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={16} /> Close
                      </button>
                      <button
                        onClick={() => handleOpenEditDrawer(pos)}
                        style={{
                          flex: 1,
                          height: '40px',
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
                          gap: '6px',
                        }}
                      >
                        <Pencil size={16} /> Edit
                      </button>
                      <button
                        onClick={() => setDeletingId(pos.id)}
                        style={{
                          flex: 1,
                          height: '40px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `2px solid ${borderCol}`, color: subTextCol, textAlign: 'left' }}>
                  {user?.role === 'OWNER' && <th style={{ padding: '14px', width: '30px', textAlign: 'center' }}>✓</th>}
                  <th style={{ padding: '14px', fontWeight: 800 }}>Symbol &amp; Trend</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Type</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Qty</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Buy Price</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>CMP</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Target</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Stop Loss</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Est. Target</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Stop Rem.</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Holding</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Invested</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Current Val</th>
                  <th style={{ padding: '14px', fontWeight: 800 }}>Live P&amp;L</th>
                  {user?.role === 'OWNER' && <th style={{ padding: '14px', textAlign: 'center', width: '220px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedPositions.map((pos) => {
                  const targetRem = getTargetRemaining(pos);
                  const stopRem = getStopRemaining(pos);
                  const isProfit = pos.profitLoss >= 0;

                  return (
                    <tr key={pos.id} style={{ borderBottom: `1px solid ${borderCol}`, backgroundColor: 'transparent' }}>
                      {user?.role === 'OWNER' && (
                        <td style={{ padding: '12px', textAlign: 'center' }}>
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

                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontWeight: 800, color: textCol, fontSize: '14px' }}>{pos.symbol}</div>
                          <div style={{ width: '80px', height: '14px', display: 'flex', alignItems: 'center' }}>
                            <Sparkline symbol={pos.symbol} />
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px', fontWeight: 700 }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: pos.tradeType === 'BUY' ? ('#DCFCE7') : ('#FEE2E2'), color: pos.tradeType === 'BUY' ? ('#15803D') : ('#991B1B'), fontSize: '11px', fontWeight: 800 }}>
                          {pos.tradeType}
                        </span>
                      </td>

                      <td style={{ padding: '12px', fontWeight: 600 }}>{pos.quantity}</td>

                      <td style={{ padding: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₹{formatDecimal(pos.buyPrice)}</td>

                      <td style={{ padding: '12px', fontWeight: 800, color: '#16A34A', fontVariantNumeric: 'tabular-nums' }}>₹{formatDecimal(pos.currentPrice)}</td>

                      <td style={{ padding: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: textCol }}>{pos.targetPrice ? `₹${formatDecimal(pos.targetPrice)}` : <span style={{ color: subTextCol }}>N/A</span>}</td>

                      <td style={{ padding: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: textCol }}>{pos.stopLoss ? `₹${formatDecimal(pos.stopLoss)}` : <span style={{ color: subTextCol }}>N/A</span>}</td>

                      <td style={{ padding: '12px', fontWeight: 700, color: targetRem.text === 'N/A' ? subTextCol : '#16A34A' }}>{targetRem.text}</td>

                      <td style={{ padding: '12px', fontWeight: 700, color: stopRem.text === 'N/A' ? subTextCol : '#DC2626' }}>{stopRem.text}</td>

                      <td style={{ padding: '12px', fontWeight: 700, color: textCol }}>
                        <span style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color={subTextCol} /> {pos.holdingPeriod} Days
                        </span>
                      </td>

                      <td style={{ padding: '12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>₹{pos.investedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                      <td style={{ padding: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₹{pos.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                      <td style={{ padding: '12px', fontWeight: 800, color: isProfit ? '#16A34A' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                        <div>{isProfit ? '+' : ''}₹{Math.abs(pos.profitLoss).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div style={{ fontSize: '11.5px' }}>({isProfit ? '+' : ''}{formatDecimal(pos.profitLossPct)}%)</div>
                      </td>

                      {/* Actions */}
                      {user?.role === 'OWNER' && (
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setClosingPosition(pos);
                                setClosePrice(pos.currentPrice.toString());
                              }}
                              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <CheckCircle2 size={14} /> Close
                            </button>
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
          zIndex: 200,
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

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ width: isMobile ? '100%' : '550px', maxHeight: isMobile ? '100vh' : '90vh', overflowY: 'auto', padding: '24px', backgroundColor: cardBg, color: textCol, borderRadius: isMobile ? '0' : '12px', border: isMobile ? 'none' : `1px solid ${borderCol}` }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800 }}>
              {newType === 'BUY' ? '➕ Create New Open Position' : '📝 Record Historical Closed Trade'}
            </h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Symbol *</label>
                  <input type="text" placeholder="e.g. RELIANCE.NS" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value.toUpperCase())} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Company Name</label>
                  <input type="text" placeholder="e.g. Reliance Ind." value={newCompany} onChange={(e) => setNewCompany(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Investor Name *</label>
                {isCreatingNewInvestor ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="New Investor Name..."
                      value={customNewInvestor}
                      onChange={(e) => setCustomNewInvestor(e.target.value)}
                      required
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewInvestor(false)}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, backgroundColor: '#FFFFFF', color: textCol, cursor: 'pointer', fontSize: '12px' }}
                    >
                      Choose Existing
                    </button>
                  </div>
                ) : (
                  <select
                    value={newInvestorName}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCreatingNewInvestor(true);
                      } else {
                        setNewInvestorName(e.target.value);
                      }
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', marginTop: '4px', backgroundColor: '#FFFFFF', color: textCol }}
                  >
                    {Array.from(new Set(['Shree', 'Priya', 'Rahul', 'Amit', ...positions.map(p => p.investorName).filter(Boolean)])).map(inv => (
                      <option key={inv} value={inv}>{inv}</option>
                    ))}
                    <option value="__NEW__">+ Create New Investor...</option>
                  </select>
                )}
              </div>

              {newType === 'SELL' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Buy Price *</label>
                      <input type="number" step="any" placeholder="₹" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Sell Price *</label>
                      <input type="number" step="any" placeholder="₹" value={newSellPrice} onChange={(e) => setNewSellPrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Quantity *</label>
                      <input type="number" step="any" placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Exit Reason</label>
                      <select value={newExitReason} onChange={(e) => setNewExitReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }}>
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
                      <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Sell Date *</label>
                      <input type="date" value={newSellDate} onChange={(e) => setNewSellDate(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Target Price (Optional)</label>
                      <input type="number" step="any" placeholder="Target ₹" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Stop Loss (Optional)</label>
                      <input type="number" step="any" placeholder="Stop Loss ₹" value={newStop} onChange={(e) => setNewStop(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Buy Price *</label>
                      <input type="number" step="any" placeholder="₹" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Quantity *</label>
                      <input type="number" step="any" placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Target Price</label>
                      <input type="number" step="any" placeholder="Target ₹" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Stop Loss</label>
                      <input type="number" step="any" placeholder="Stop Loss ₹" value={newStop} onChange={(e) => setNewStop(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Buy Date *</label>
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Notes</label>
                <textarea placeholder="Trade notes..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', height: '60px', backgroundColor: '#FFFFFF', color: textCol }} />
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ width: isMobile ? '100%' : '420px', padding: '24px', backgroundColor: cardBg, color: textCol, borderRadius: isMobile ? '12px 12px 0 0' : '12px', border: `1px solid ${borderCol}` }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 800 }}>✅ Close Trade: {closingPosition.symbol}</h3>
            <form onSubmit={handleCloseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Selling Price (Exit CMP) *</label>
                <input type="number" step="any" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Exit Reason</label>
                <select value={closeReason} onChange={(e) => setCloseReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }}>
                  <option value="MANUAL_EXIT">Manual Exit</option>
                  <option value="TARGET_HIT">Target Hit</option>
                  <option value="STOP_LOSS_HIT">Stop Loss Hit</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: subTextCol }}>Closing Notes</label>
                <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Reason for exit..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', height: '60px', backgroundColor: '#FFFFFF', color: textCol }} />
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
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

      {/* CSV Bulk Import Wizard overlay */}
      {showImportWizard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ width: '800px', maxHeight: '85vh', padding: '24px', backgroundColor: cardBg, color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderCol}`, paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>📥 Enterprise Bulk Upload Wizard</h3>
              <button onClick={() => { setShowImportWizard(false); setImportStep('UPLOAD'); setImportReport(null); }} style={{ border: 'none', background: 'none', fontSize: '16px', cursor: 'pointer', color: subTextCol }}>❌</button>
            </div>

            {importLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: subTextCol }}>
                Processing batch records...
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* STEP 1: UPLOAD WIDGET */}
                {importStep === 'UPLOAD' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: '48px' }}>📁</div>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800 }}>Upload CSV Trade Sheet</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: subTextCol }}>Columns required: Investor, Symbol, Buy Price, Quantity, Target, Stop Loss, Buy Date, Trade Type, Notes</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
                      <button onClick={downloadTemplate} style={{ padding: '10px 20px', backgroundColor: '#E2E8F0', color: textCol, border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}>
                        📥 Download CSV Template
                      </button>
                      
                      <label style={{ padding: '10px 20px', backgroundColor: '#16A34A', color: '#FFFFFF', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-block' }}>
                        📤 Choose CSV File
                        <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                )}

                {/* STEP 2: PREVIEW & VALIDATION */}
                {importStep === 'PREVIEW' && importReport && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: `1px solid ${borderCol}` }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800 }}>Pre-import validation report</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: subTextCol, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li>Ready to Import: <strong style={{ color: '#10B981' }}>{importReport.summary?.importedCount || 0} rows</strong></li>
                        <li>Skipped duplicates: <strong style={{ color: '#F59E0B' }}>{importReport.summary?.duplicateCount || 0} rows</strong></li>
                        <li>Malformed / Invalid: <strong style={{ color: '#EF4444' }}>{importReport.summary?.invalidCount || 0} rows</strong></li>
                      </ul>
                    </div>

                    {/* Invalid Rows Table */}
                    {importReport.invalid?.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#EF4444' }}>⚠️ Validation failures ({importReport.invalid.length})</h4>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: `1px solid ${borderCol}`, borderRadius: '8px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: `1px solid ${borderCol}` }}>
                                <th style={{ padding: '8px' }}>Excel Row</th>
                                <th style={{ padding: '8px' }}>Symbol</th>
                                <th style={{ padding: '8px' }}>Validation Failures</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importReport.invalid.map((item: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${borderCol}` }}>
                                  <td style={{ padding: '8px', fontWeight: 700 }}>Row {item.row}</td>
                                  <td style={{ padding: '8px' }}>{item.symbol}</td>
                                  <td style={{ padding: '8px', color: '#EF4444' }}>{item.errors?.join(', ')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Duplicate Rows Table */}
                    {importReport.duplicates?.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#F59E0B' }}>⚠️ Duplicate records skipped ({importReport.duplicates.length})</h4>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: `1px solid ${borderCol}`, borderRadius: '8px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: `1px solid ${borderCol}` }}>
                                <th style={{ padding: '8px' }}>Excel Row</th>
                                <th style={{ padding: '8px' }}>Symbol</th>
                                <th style={{ padding: '8px' }}>Duplicate Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importReport.duplicates.map((item: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${borderCol}` }}>
                                  <td style={{ padding: '8px', fontWeight: 700 }}>Row {item.row}</td>
                                  <td style={{ padding: '8px' }}>{item.symbol}</td>
                                  <td style={{ padding: '8px', color: '#F59E0B' }}>{item.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                      <button onClick={() => setImportStep('UPLOAD')} style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: 'transparent', color: textCol, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                        Cancel &amp; Reupload
                      </button>
                      <button onClick={confirmImport} disabled={importReport.summary?.importedCount === 0} style={{ padding: '10px 24px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: importReport.summary?.importedCount === 0 ? 0.5 : 1 }}>
                        Confirm Import ({importReport.summary?.importedCount || 0} Trades)
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: SUMMARY REPORT */}
                {importStep === 'REPORT' && importReport && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '20px' }}>
                    <div style={{ fontSize: '48px' }}></div>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>Import Complete!</h4>
                      <p style={{ margin: 0, fontSize: '14px', color: subTextCol }}>Successfully created <strong>{importReport.summary?.importedCount || 0}</strong> positions in database.</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                      <button onClick={() => { setShowImportWizard(false); setImportStep('UPLOAD'); setImportReport(null); }} style={{ padding: '10px 24px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}>
                        Close Wizard
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
