'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';

// -------------------------------------------------------------
// 1. ADD POSITION MODAL
// -------------------------------------------------------------
export interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialSymbol?: string;
  initialPrice?: number;
  initialTarget?: number;
  initialStopLoss?: number;
}

export const AddPositionModal: React.FC<AddPositionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSymbol = '',
  initialPrice,
  initialTarget,
  initialStopLoss,
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [buyPrice, setBuyPrice] = useState<string>(initialPrice ? initialPrice.toString() : '');
  const [quantity, setQuantity] = useState<string>('1');
  const [targetPrice, setTargetPrice] = useState<string>(initialTarget ? initialTarget.toString() : '');
  const [stopLoss, setStopLoss] = useState<string>(initialStopLoss ? initialStopLoss.toString() : '');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [sellingDate, setSellingDate] = useState<string>('');
  const [brokerCharges, setBrokerCharges] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSymbol(initialSymbol);
      if (initialPrice) setBuyPrice(initialPrice.toString());
      if (initialTarget) setTargetPrice(initialTarget.toString());
      if (initialStopLoss) setStopLoss(initialStopLoss.toString());
    }
  }, [isOpen, initialSymbol, initialPrice, initialTarget, initialStopLoss]);

  if (!isOpen) return null;

  const numBuyPrice = parseFloat(buyPrice) || 0;
  const numQty = parseFloat(quantity) || 0;
  const numSellingPrice = parseFloat(sellingPrice) || 0;
  const numBrokerage = parseFloat(brokerCharges) || 0;
  const investedAmount = numBuyPrice * numQty;
  const isClosed = numSellingPrice > 0;
  const currentValue = isClosed ? numSellingPrice * numQty : investedAmount; // for open, defaults to invested
  const profitLoss = isClosed ? currentValue - investedAmount - numBrokerage : 0;
  const returnPct = investedAmount > 0 && isClosed ? (profitLoss / investedAmount) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || numBuyPrice <= 0 || numQty <= 0) {
      setError('Please enter valid Symbol, Entry Price, and Quantity (> 0).');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await api.post('/portfolio/position', {
        symbol: symbol.trim().toUpperCase(),
        buyPrice: numBuyPrice,
        quantity: numQty,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        sellingPrice: isClosed ? numSellingPrice : undefined,
        sellingDate: isClosed && sellingDate ? sellingDate : undefined,
        brokerCharges: numBrokerage,
        notes: notes.trim() || undefined,
      });
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || 'Failed to save trade.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition"
        >
          ✕
        </button>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
            💼
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Add Trade Position</h3>
            <p className="text-xs text-slate-500">Record open trade or completed historical execution</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Symbol *</label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE.NS"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity (Decimals OK) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 0.25, 1.75, 10"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Entry Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Stop Loss (₹)</label>
              <input
                type="number"
                step="0.01"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Exit / Completed Trade Details (Optional)</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {isClosed ? 'Calculates Realised P&L' : 'Calculates Unrealised P&L'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="Leave blank if open"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Selling Date</label>
                <input
                  type="date"
                  disabled={!isClosed}
                  value={sellingDate}
                  onChange={(e) => setSellingDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Brokerage & Taxes (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={brokerCharges}
                  onChange={(e) => setBrokerCharges(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>
          </div>

          {investedAmount > 0 && (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <div>
                Invested: <span className="text-slate-900 font-bold">₹{investedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {isClosed ? (
                <div className={profitLoss >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                  Realised Profit: ₹{profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({returnPct.toFixed(2)}%)
                </div>
              ) : (
                <div className="text-blue-700">Open Position (Live CMP will track P&L)</div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Thesis</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why are you entering this position?"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
            >
              {loading ? 'Saving Trade...' : 'Save Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. EDIT POSITION MODAL
// -------------------------------------------------------------
export interface EditPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  position: any | null;
}

export const EditPositionModal: React.FC<EditPositionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  position,
}) => {
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [sellingDate, setSellingDate] = useState<string>('');
  const [brokerCharges, setBrokerCharges] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && position) {
      setBuyPrice(position.buyPrice !== undefined ? position.buyPrice.toString() : '');
      setQuantity(position.quantity !== undefined ? position.quantity.toString() : '');
      setTargetPrice(position.targetPrice ? position.targetPrice.toString() : '');
      setStopLoss(position.stopLoss ? position.stopLoss.toString() : '');
      setSellingPrice(position.sellingPrice ? position.sellingPrice.toString() : '');
      setSellingDate(position.closedAt ? new Date(position.closedAt).toISOString().split('T')[0] : '');
      setBrokerCharges(position.brokerCharges !== undefined ? position.brokerCharges.toString() : '0');
      setNotes(position.notes || '');
    }
  }, [isOpen, position]);

  if (!isOpen || !position) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.patch(`/portfolio/position/${position.id}`, {
        buyPrice: parseFloat(buyPrice) || position.buyPrice,
        quantity: parseFloat(quantity) || position.quantity,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
        sellingDate: sellingDate || undefined,
        brokerCharges: parseFloat(brokerCharges) || 0,
        notes: notes.trim() || undefined,
        status: sellingPrice && parseFloat(sellingPrice) > 0 ? 'CLOSED' : 'OPEN',
      });
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || 'Failed to update trade.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition"
        >
          ✕
        </button>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-amber-500/20">
            ✏️
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Edit Position ({position.symbol})</h3>
            <p className="text-xs text-slate-500">Update execution parameters without deleting position</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Entry Price (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity (Decimals OK)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Stop Loss (₹)</label>
              <input
                type="number"
                step="0.01"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700">Exit / Brokerage Override</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="Blank if open"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Selling Date</label>
                <input
                  type="date"
                  value={sellingDate}
                  onChange={(e) => setSellingDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Brokerage (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={brokerCharges}
                  onChange={(e) => setBrokerCharges(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 disabled:opacity-50 transition"
            >
              {loading ? 'Updating...' : 'Update Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. SELL POSITION MODAL
// -------------------------------------------------------------
export interface SellPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  position: any | null;
}

export const SellPositionModal: React.FC<SellPositionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  position,
}) => {
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [sellingDate, setSellingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [brokerCharges, setBrokerCharges] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && position) {
      setSellingPrice((position.currentPrice || position.buyPrice).toFixed(2));
      setSellingDate(new Date().toISOString().split('T')[0]);
      setBrokerCharges((position.brokerCharges || 0).toString());
      setNotes(position.notes || '');
    }
  }, [isOpen, position]);

  if (!isOpen || !position) return null;

  const numSellingPrice = parseFloat(sellingPrice) || 0;
  const numBrokerage = parseFloat(brokerCharges) || 0;
  const investedAmount = position.investedAmount || (position.buyPrice * position.quantity);
  const exitValue = numSellingPrice * position.quantity;
  const realisedProfit = exitValue - investedAmount - numBrokerage;
  const returnPct = investedAmount > 0 ? (realisedProfit / investedAmount) * 100 : 0;

  const startMs = position.createdAt ? new Date(position.createdAt).getTime() : Date.now();
  const endMs = sellingDate ? new Date(sellingDate).getTime() : Date.now();
  const holdingDays = Math.max(0, Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numSellingPrice <= 0) {
      setError('Please enter a valid selling price (> 0).');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await api.patch(`/portfolio/position/${position.id}/close`, {
        sellingPrice: numSellingPrice,
        sellingDate,
        brokerCharges: numBrokerage,
        notes: notes.trim() || undefined,
      });
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || 'Failed to close trade.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition"
        >
          ✕
        </button>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-500/20">
            💰
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Sell Position ({position.symbol})</h3>
            <p className="text-xs text-slate-500">Record exit price & date to finalize realised P&L</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Exit / Selling Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Date *</label>
              <input
                type="date"
                required
                value={sellingDate}
                onChange={(e) => setSellingDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Brokerage & Taxes (₹)</label>
            <input
              type="number"
              step="0.01"
              value={brokerCharges}
              onChange={(e) => setBrokerCharges(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50"
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Invested Amount:</span>
              <span className="font-bold text-slate-800">₹{investedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Exit Value:</span>
              <span className="font-bold text-slate-800">₹{exitValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Holding Days:</span>
              <span className="font-bold text-slate-800">{holdingDays} days</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Realised P&L:</span>
              <span className={`text-sm font-extrabold ${realisedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{realisedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Exit Notes / Learning</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did you exit? Did target hit or stop loss trigger?"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition"
            >
              {loading ? 'Closing Trade...' : 'Confirm Sell'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. EDIT WATCHLIST MODAL
// -------------------------------------------------------------
export interface EditWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  idea: any | null;
}

export const EditWatchlistModal: React.FC<EditWatchlistModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  idea,
}) => {
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && idea) {
      setBuyPrice(idea.buyPrice !== undefined ? idea.buyPrice.toString() : '');
      setTargetPrice(idea.targetPrice ? idea.targetPrice.toString() : '');
      setStopLoss(idea.stopLoss ? idea.stopLoss.toString() : '');
      setNotes(idea.notes || '');
    }
  }, [isOpen, idea]);

  if (!isOpen || !idea) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.patch(`/ideas/${idea.id}`, {
        buyPrice: parseFloat(buyPrice) || idea.buyPrice,
        targetPrice: parseFloat(targetPrice) || idea.targetPrice,
        stopLoss: parseFloat(stopLoss) || idea.stopLoss,
        notes: notes.trim() || undefined,
      });
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || 'Failed to update idea.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition"
        >
          ✕
        </button>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
            👁️
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Edit Watchlist ({idea.symbol})</h3>
            <p className="text-xs text-slate-500">Update target, stop loss, and research notes</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Buy / Entry Zone (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Stop Loss (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Research Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thesis and institutional FVG context..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition"
            >
              {loading ? 'Updating...' : 'Save Watchlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
