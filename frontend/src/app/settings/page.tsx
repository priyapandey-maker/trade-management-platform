'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States matching backend schema
  const [notifPreferences, setNotifPreferences] = useState({
    prefNearBuy: true,
    prefBuyTrigger: true,
    prefStopLoss: true,
    prefTargetHit: true,
    prefManualClose: true,
    prefDailySummary: true,
    prefPriceMovement: true,
    emailEnabled: true,
    telegramEnabled: true,
    inAppEnabled: true,
    telegramChatIds: '',
    email: '',
  });

  const [telegramRecipients, setTelegramRecipients] = useState<any[]>([]);
  const [newChatId, setNewChatId] = useState('');
  const [newChatName, setNewChatName] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [refreshInterval, setRefreshInterval] = useState(60);

  // Styling Tokens
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0F172A' : '#F8FAFC';

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notification/settings');
      if (res.data?.preferences) {
        setNotifPreferences(res.data.preferences);
      }
      if (res.data?.telegramRecipients) {
        setTelegramRecipients(res.data.telegramRecipients);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load configuration settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notification');
      setNotifications(res.data.notifications || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (user?.role === 'OWNER') {
      fetchSettings();
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user, fetchSettings, fetchNotifications]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.patch('/notification/settings', {
        preferences: notifPreferences,
      });
      setSuccessMsg('✅ Notification engine preferences saved successfully.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTelegramRecipient = async () => {
    if (!newChatId.trim()) return;
    setError(null);
    try {
      const res = await api.post('/notification/recipient', {
        chatId: newChatId.trim(),
        name: newChatName.trim() || null,
      });
      setTelegramRecipients([...telegramRecipients, res.data]);
      setNewChatId('');
      setNewChatName('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add Telegram recipient.');
    }
  };

  const handleDeleteTelegramRecipient = async (id: string) => {
    setError(null);
    try {
      await api.delete(`/notification/recipient/${id}`);
      setTelegramRecipients(telegramRecipients.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete Telegram recipient.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notification/mark-all-read');
      fetchNotifications();
    } catch (e) {}
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/notification/clear-all');
      fetchNotifications();
    } catch (e) {}
  };

  const handleNotifClick = async (notif: any) => {
    try {
      await api.patch(`/notification/${notif.id}/read`);
      fetchNotifications();
      if (notif.type === 'TARGET_HIT' || notif.type === 'STOP_LOSS' || notif.type === 'TRADE_CLOSED') {
        window.location.href = '/closed';
      } else {
        window.location.href = '/open';
      }
    } catch (e) {}
  };

  const handleSetInterval = (val: number) => {
    setRefreshInterval(val);
    window.dispatchEvent(new CustomEvent('shree_set_refresh_interval', { detail: { interval: val } }));
  };

  const handleInstantRefresh = () => {
    window.dispatchEvent(new CustomEvent('shree_manual_refresh'));
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / (60 * 1000)));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const filteredNotifications = notifications
    .filter((n) => {
      const term = notifSearch.toLowerCase();
      const matchesSearch =
        n.symbol.toLowerCase().includes(term) ||
        n.company.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term) ||
        n.type.toLowerCase().includes(term);

      if (notifFilter === 'unread') return matchesSearch && !n.read;
      if (notifFilter === 'read') return matchesSearch && n.read;
      return matchesSearch;
    });

  if (user?.role !== 'OWNER') {
    return (
      <div style={{ padding: '24px', color: textCol }}>
        <h2>⚠️ Access Denied</h2>
        <p style={{ color: subTextCol }}>Only platform administrators have access to global engine preferences.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: textCol, margin: 0 }}>Global Terminal Control</h1>
        <p style={{ fontSize: '14px', color: subTextCol, margin: 0 }}>Configure alerts thresholds, delivery networks, bot integrations and notifications channels</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          {successMsg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: subTextCol }}>
          Loading system preferences...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* UI PREFERENCES */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
             <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>🎨 Interface Preferences</h3>
             <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: subTextCol }}>Configure visual appearance and UI layout.</p>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div>
                 <div style={{ fontSize: '14px', fontWeight: 700, color: textCol }}>Theme Mode</div>
                 <div style={{ fontSize: '12.5px', color: subTextCol }}>Toggle between Light and Dark interface modes</div>
               </div>
               <button onClick={toggleTheme} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol, fontSize: '14px', cursor: 'pointer', fontWeight: 700 }}>
                 {isDark ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
               </button>
             </div>
          </div>

          {/* MARKET DATA PREFERENCES */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
             <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>📈 Market Data Stream</h3>
             <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: subTextCol }}>Configure real-time market data connections and refresh cycles.</p>
             
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${borderCol}` }}>
               <div>
                 <div style={{ fontSize: '14px', fontWeight: 700, color: textCol }}>Connection Status</div>
                 <div style={{ fontSize: '12.5px', color: subTextCol }}>Current status of the NSE market data feed</div>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, padding: '6px 12px', backgroundColor: isDark ? '#064E3B' : '#DCFCE7', borderRadius: '20px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block', boxShadow: '0 0 6px #16A34A' }} />
                  <span style={{ color: '#16A34A', fontSize: '12px' }}>NSE LIVE</span>
               </div>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div>
                 <div style={{ fontSize: '14px', fontWeight: 700, color: textCol }}>Data Refresh Interval</div>
                 <div style={{ fontSize: '12.5px', color: subTextCol }}>How often the terminal pulls new prices</div>
               </div>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <select value={refreshInterval} onChange={(e) => handleSetInterval(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textCol, fontSize: '13px', cursor: 'pointer' }}>
                   <option value={0}>Auto: OFF</option>
                   <option value={30}>Auto: 30 seconds</option>
                   <option value={60}>Auto: 60 seconds</option>
                   <option value={300}>Auto: 5 minutes</option>
                 </select>
                 <button onClick={handleInstantRefresh} style={{ padding: '8px 16px', backgroundColor: '#3B82F6', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                   ⚡ Force Refresh
                 </button>
               </div>
             </div>
          </div>

          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Alert Switches Section */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>🔔 Alert Engine Switches</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: subTextCol }}>Select which market event categories should generate alert dispatches.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.prefNearBuy} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefNearBuy: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#10B981' }} />
                    Near Buy Entry Range (±Proximity %)
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.prefBuyTrigger} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefBuyTrigger: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#10B981' }} />
                    Buy Target Reached
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.prefStopLoss} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefStopLoss: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#10B981' }} />
                    Stop Loss triggers (Auto-exit)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.prefTargetHit} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefTargetHit: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#10B981' }} />
                    Target Price Hit (Auto-exit)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.prefManualClose} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefManualClose: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#10B981' }} />
                    Manual Position Closures
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.prefPriceMovement} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefPriceMovement: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#10B981' }} />
                    Price Movements (2%, 3%, 5%)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', gridColumn: 'span 2' }}>
                    <input type="checkbox" checked={notifPreferences.prefDailySummary} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefDailySummary: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#10B981' }} />
                    Daily Performance Portfolio Summary
                  </label>
                </div>
              </div>

              {/* Delivery Channels Section */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>🔌 Active Delivery Networks</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: subTextCol }}>Define which messaging channels are used for broadcasting alerts.</p>
                
                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.emailEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, emailEnabled: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#2563EB' }} />
                    Email Dispatch System
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.telegramEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, telegramEnabled: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#2563EB' }} />
                    Telegram Bot Gateway
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifPreferences.inAppEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, inAppEnabled: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#2563EB' }} />
                    In-App Notification Feed
                  </label>
                </div>
              </div>

              {/* Network Credentials Configuration */}
              <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>🔑 Channel Configuration</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: subTextCol }}>Specify contact endpoints for automated system alerts.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>System Administrator Email *</label>
                    <input type="email" value={notifPreferences.email || ''} onChange={(e) => setNotifPreferences({ ...notifPreferences, email: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '14px', backgroundColor: inputBg, color: textCol }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Telegram Chat IDs (comma-separated for multi-channel broadcasts)</label>
                    <input type="text" placeholder="e.g. 982736412, 123456789" value={notifPreferences.telegramChatIds || ''} onChange={(e) => setNotifPreferences({ ...notifPreferences, telegramChatIds: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '14px', backgroundColor: inputBg, color: textCol }} />
                  </div>
                </div>
              </div>

              {/* Action Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={{ padding: '12px 28px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving preferences...' : '💾 Save Settings'}
                </button>
              </div>

            </div>
          </form>

          {/* IN-APP NOTIFICATIONS INBOX */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800 }}>📥 In-App Notifications Inbox</h3>
                <p style={{ margin: 0, fontSize: '13px', color: subTextCol }}>View all system notifications and trading alerts directly from the dashboard.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#16A34A', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>✓ Mark All Read</button>
                <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>🗑️ Clear All</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search notifications..."
                value={notifSearch}
                onChange={(e) => setNotifSearch(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13.5px', backgroundColor: inputBg, color: textCol }}
              />
              <div style={{ display: 'flex', gap: '4px', backgroundColor: inputBg, padding: '4px', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                {(['all', 'unread', 'read'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setNotifFilter(filter)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: notifFilter === filter ? 700 : 500,
                      backgroundColor: notifFilter === filter ? (isDark ? '#334155' : '#E2E8F0') : 'transparent',
                      color: textCol,
                      cursor: 'pointer',
                    }}
                  >
                    {filter.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
              {filteredNotifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: subTextCol, fontSize: '14px', backgroundColor: inputBg, borderRadius: '8px', border: `1px dashed ${borderCol}` }}>
                  No notifications match your criteria.
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const isUnread = !n.read;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        backgroundColor: isUnread ? (isDark ? '#1E293B' : '#F0FDF4') : inputBg,
                        border: `1px solid ${isUnread ? (isDark ? '#334155' : '#DCFCE7') : borderCol}`,
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: n.type === 'TARGET_HIT' ? '#16A34A' : n.type === 'STOP_LOSS' ? '#DC2626' : '#2563EB' }}>
                          {n.type.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '12px', color: subTextCol }}>{formatRelativeTime(n.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: textCol }}>{n.company} ({n.symbol})</div>
                      <div style={{ fontSize: '13px', color: subTextCol, marginTop: '4px' }}>{n.message}</div>
                      {isUnread && <span style={{ position: 'absolute', top: '16px', left: '8px', width: '6px', height: '6px', backgroundColor: '#16A34A', borderRadius: '50%' }} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Legacy Bot Recipients configuration */}
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>🤖 Telegram Bot Recipients (Legacy)</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: subTextCol }}>Manage dedicated individual subscriber chat nodes connected to the bot.</p>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Telegram Chat ID (e.g. 9827318)" value={newChatId} onChange={(e) => setNewChatId(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13.5px', flex: 2, backgroundColor: inputBg, color: textCol }} />
              <input type="text" placeholder="Subscriber Name (e.g. Anuj)" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13.5px', flex: 2, backgroundColor: inputBg, color: textCol }} />
              <button type="button" onClick={handleAddTelegramRecipient} style={{ padding: '10px 20px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', flex: 1, minWidth: '100px' }}>Add node</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {telegramRecipients.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: subTextCol }}>No custom bot nodes registered yet.</p>
              ) : (
                telegramRecipients.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: `1px solid ${borderCol}`, borderRadius: '8px', backgroundColor: isDark ? '#131D31' : '#F8FAFC' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{r.name || 'Unnamed Recipient'}</span>
                      <span style={{ fontSize: '12.5px', color: subTextCol, marginLeft: '12px' }}>ID: {r.chatId}</span>
                    </div>
                    <button onClick={() => handleDeleteTelegramRecipient(r.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#EF4444' }}>🗑️ Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
