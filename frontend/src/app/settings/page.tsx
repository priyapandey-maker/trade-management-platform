'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

export default function SettingsPage() {
  const { theme } = useTheme();
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

  useEffect(() => {
    if (user?.role === 'OWNER') {
      fetchSettings();
    }
  }, [user, fetchSettings]);

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
