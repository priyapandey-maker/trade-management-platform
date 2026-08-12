'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';
import { User, Bell, Eye, Settings } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States matching backend schema - keeping all fields to preserve API contract
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

  const cardBg = 'var(--color-surface-1)';
  const borderCol = 'var(--color-border)';
  const textCol = 'var(--color-text-primary)';
  const subTextCol = 'var(--color-text-secondary)';

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notification/settings');
      if (res.data?.preferences) {
        setNotifPreferences(res.data.preferences);
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
      setSuccessMsg('✅ Notification preferences saved successfully.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration settings.');
    } finally {
      setSaving(false);
    }
  };

  // Compact access denied state
  if (user?.role !== 'OWNER') {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          ⚠️ Access Denied
        </h2>
        <p style={{ fontSize: '13.5px', color: subTextCol, margin: 0 }}>
          Only platform administrators have access to global engine preferences.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: textCol, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={22} style={{ color: '#2563EB' }} />
          Settings
        </h1>
        <p style={{ fontSize: '13px', color: subTextCol, margin: '4px 0 0 0' }}>
          Manage your account, preferences, notifications and appearance.
        </p>
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
          Loading user preferences...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ========================================================== */}
          {/* SECTION 1: ACCOUNT                                        */}
          {/* ========================================================== */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 900, color: textCol, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} style={{ color: '#2563EB' }} />
              Account
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', color: subTextCol }}>Profile and account details.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Name</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: textCol, marginTop: '4px' }}>{user?.name || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Email</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: textCol, marginTop: '4px' }}>{user?.email || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Role</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: textCol, marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#2563EB', padding: '3px 8px', borderRadius: '4px' }}>
                    {user?.role || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* SECTION 2: APPEARANCE                                     */}
          {/* ========================================================== */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 900, color: textCol, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={15} style={{ color: '#2563EB' }} />
              Appearance
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', color: subTextCol }}>Customize the look and feel of the platform terminal.</p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: textCol }}>Theme Mode</span>
              <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => theme === 'dark' && toggleTheme()}
                  style={{
                    border: 'none',
                    background: theme === 'light' ? '#FFFFFF' : 'transparent',
                    color: theme === 'light' ? '#2563EB' : subTextCol,
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => theme === 'light' && toggleTheme()}
                  style={{
                    border: 'none',
                    background: theme === 'dark' ? '#FFFFFF' : 'transparent',
                    color: theme === 'dark' ? '#2563EB' : subTextCol,
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* SECTION 3: NOTIFICATIONS                                  */}
          {/* ========================================================== */}
          <form onSubmit={handleSaveSettings}>
            <div className="premium-card" style={{ backgroundColor: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 900, color: textCol, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={15} style={{ color: '#2563EB' }} />
                  Notifications
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: subTextCol }}>Manage which market event categories should generate alert dispatches.</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                  <input type="checkbox" checked={notifPreferences.prefNearBuy} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefNearBuy: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                  Near Buy Entry Range (±Proximity %)
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                  <input type="checkbox" checked={notifPreferences.prefBuyTrigger} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefBuyTrigger: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                  Buy Target Reached
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                  <input type="checkbox" checked={notifPreferences.prefStopLoss} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefStopLoss: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                  Stop Loss triggers (Auto-exit)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                  <input type="checkbox" checked={notifPreferences.prefTargetHit} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefTargetHit: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                  Target Price Hit (Auto-exit)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                  <input type="checkbox" checked={notifPreferences.prefManualClose} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefManualClose: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                  Manual Position Closures
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                  <input type="checkbox" checked={notifPreferences.prefPriceMovement} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefPriceMovement: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                  Price Movements (2%, 3%, 5%)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                  <input type="checkbox" checked={notifPreferences.prefDailySummary} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefDailySummary: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                  Daily Performance Portfolio Summary
                </label>
              </div>

              {/* Delivery Channels */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '16px', marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: textCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Channels</h4>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                    <input type="checkbox" checked={notifPreferences.emailEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, emailEnabled: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                    Email Alerts
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                    <input type="checkbox" checked={notifPreferences.telegramEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, telegramEnabled: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                    Telegram Alerts
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', cursor: 'pointer', color: textCol }}>
                    <input type="checkbox" checked={notifPreferences.inAppEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, inAppEnabled: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: '#2563EB' }} />
                    In-App Alerts
                  </label>
                </div>
              </div>

              {/* Alert Destinations */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '16px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: '0', fontSize: '13px', fontWeight: 800, color: textCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alert Destinations</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: subTextCol, marginBottom: '6px' }}>Email Address</label>
                    <input type="email" value={notifPreferences.email || ''} onChange={(e) => setNotifPreferences({ ...notifPreferences, email: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13.5px', backgroundColor: 'var(--color-surface-2)', color: textCol }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: subTextCol, marginBottom: '6px' }}>Telegram Chat IDs (comma-separated)</label>
                    <input type="text" placeholder="e.g. 982736412, 123456789" value={notifPreferences.telegramChatIds || ''} onChange={(e) => setNotifPreferences({ ...notifPreferences, telegramChatIds: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13.5px', backgroundColor: 'var(--color-surface-2)', color: textCol }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${borderCol}`, paddingTop: '16px', marginTop: '4px' }}>
                <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </form>

        </div>
      )}
    </div>
  );
}
