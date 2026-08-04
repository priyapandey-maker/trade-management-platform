'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/axios';

interface HeaderProps {
  sidebarWidth: number;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  refreshInterval: number;
  setRefreshInterval: (sec: number) => void;
  onManualRefresh: () => void;
  lastUpdatedTime: string;
  isMobile?: boolean;
  toggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarWidth,
  isCollapsed,
  toggleSidebar,
  refreshInterval,
  setRefreshInterval,
  onManualRefresh,
  lastUpdatedTime,
  isMobile = false,
  toggleMobileSidebar,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Mobile search state
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Live compact clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Global search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Manage Clients modal state
  const [showManageClients, setShowManageClients] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientMsg, setClientMsg] = useState<string | null>(null);

  // Notification Settings Modal (Owner Only)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notifPreferences, setNotifPreferences] = useState({
    prefNearBuy: true,
    prefBuyTrigger: true,
    prefStopLoss: true,
    prefTargetHit: true,
    prefManualClose: true,
    prefDailySummary: true,
    emailNotificationsEnabled: true,
    telegramNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    telegramChatIds: '',
    email: '',
    telegramEnabled: true,
    emailEnabled: true,
    inAppEnabled: true,
  });
  const [telegramRecipients, setTelegramRecipients] = useState<any[]>([]);
  const [newChatId, setNewChatId] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // In-App Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Dropdowns
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll In-App notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notification');
      setNotifications(res.data.notifications || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Global search handler
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const fetchSearchData = async () => {
      try {
        const res = await api.get('/portfolio');
        const allPos = res.data.positions?.all || [];
        const term = searchTerm.toLowerCase();
        const matches = allPos.filter(
          (p: any) =>
            p.symbol.toLowerCase().includes(term) ||
            p.company.toLowerCase().includes(term) ||
            (p.notes && p.notes.toLowerCase().includes(term))
        );
        setSearchResults(matches);
        setShowSearchResults(true);
      } catch (e) {
        setSearchResults([]);
      }
    };

    const delay = setTimeout(fetchSearchData, 200);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !clientPassword) return;
    try {
      await api.post('/auth/register-client', {
        email: clientEmail,
        password: clientPassword,
        name: clientName || 'Client Analyst',
      });
      setClientMsg('✅ Client account created successfully!');
      setClientEmail('');
      setClientPassword('');
      setClientName('');
    } catch (err: any) {
      setClientMsg(`⚠️ ${err.response?.data?.message || 'Failed to create client.'}`);
    }
  };

  // Fetch Notification Settings
  const handleOpenSettings = async () => {
    try {
      const res = await api.get('/notification/settings');
      setNotifPreferences(res.data.preferences);
      setTelegramRecipients(res.data.telegramRecipients || []);
      setSettingsMsg(null);
      setShowNotificationSettings(true);
      setShowProfileMenu(false);
    } catch (e) {}
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/notification/settings', {
        preferences: notifPreferences,
        telegramRecipients,
      });
      setSettingsMsg('✅ Settings updated successfully!');
      setTimeout(() => setShowNotificationSettings(false), 1200);
    } catch (err: any) {
      setSettingsMsg(`⚠️ ${err.response?.data?.message || 'Failed to save settings.'}`);
    }
  };

  const handleAddTelegramRecipient = () => {
    if (!newChatId.trim()) return;
    setTelegramRecipients([
      ...telegramRecipients,
      {
        id: `temp-${Date.now()}`,
        chatId: newChatId.trim(),
        name: newChatName.trim() || 'Recipient',
        enabled: true,
      },
    ]);
    setNewChatId('');
    setNewChatName('');
  };

  const handleRemoveTelegramRecipient = (id: string) => {
    setTelegramRecipients(telegramRecipients.filter((r) => r.id !== id));
  };

  const handleSendTestTelegram = async () => {
    try {
      await api.post('/notification/test/telegram');
      setSettingsMsg('✅ Test Telegram message dispatched immediately!');
    } catch (e) {
      setSettingsMsg('⚠️ Failed to dispatch Telegram test.');
    }
  };

  const handleSendTestEmail = async () => {
    try {
      await api.post('/notification/test/email');
      setSettingsMsg('✅ Test Email message dispatched immediately!');
    } catch (e) {
      setSettingsMsg('⚠️ Failed to dispatch Email test.');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notification/mark-all-read');
      fetchNotifications();
    } catch (e) {}
  };

  // Clear all notifications
  const handleClearAll = async () => {
    try {
      await api.delete('/notification/clear-all');
      fetchNotifications();
    } catch (e) {}
  };

  // Mark specific notification as read and route
  const handleNotifClick = async (notif: any) => {
    try {
      await api.patch(`/notification/${notif.id}/read`);
      fetchNotifications();
      setShowNotifDrawer(false);
      // Route based on type
      if (notif.type === 'TARGET_HIT' || notif.type === 'STOP_LOSS' || notif.type === 'TRADE_CLOSED') {
        window.location.href = '/closed';
      } else {
        window.location.href = '/open';
      }
    } catch (e) {}
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter & Search notifications
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

  const bgCol = isDark ? '#0F172A' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';

  return (
    <>
      {isMobile ? (
        <header
          style={{
            height: '70px',
            position: 'fixed',
            top: 0,
            left: `${sidebarWidth}px`,
            right: 0,
            backgroundColor: bgCol,
            borderBottom: `1px solid ${borderCol}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 30,
            transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {showMobileSearch ? (
            /* Mobile Search Overlay Mode */
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
              <button
                onClick={() => { setShowMobileSearch(false); setSearchTerm(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: subTextCol, fontSize: '18px', padding: '6px' }}
              >
                ⬅️
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${borderCol}`, borderRadius: '8px', padding: '8px 12px' }}>
                <input
                  type="text"
                  placeholder="Search Symbol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  style={{ width: '100%', border: 'none', background: 'transparent', color: textCol, fontSize: '14px', outline: 'none' }}
                />
              </div>
              {searchTerm.trim() && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: subTextCol, fontSize: '14px' }}
                >
                  Clear
                </button>
              )}
              
              {/* Search results drawer on mobile search mode */}
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '70px', left: 0, right: 0, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottom: `1px solid ${borderCol}`, boxShadow: '0 12px 30px rgba(0,0,0,0.15)', maxHeight: 'calc(100vh - 70px)', overflowY: 'auto', zIndex: 50, padding: '8px' }}>
                  {searchResults.map((res) => (
                    <div key={res.id} onClick={() => { setShowSearchResults(false); setShowMobileSearch(false); setSearchTerm(''); window.location.href = res.status === 'CLOSED' ? '/closed' : '/open'; }} style={{ padding: '12px', borderBottom: `1px solid ${borderCol}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: textCol }}>
                      <div>
                        <span style={{ fontWeight: 800 }}>{res.symbol}</span>
                        <span style={{ marginLeft: '8px', color: subTextCol, fontSize: '12px' }}>{res.company}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Mobile Standard Mode */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={toggleMobileSidebar}
                  aria-label="Open navigation"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: subTextCol,
                    fontSize: '22px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ☰
                </button>
                <div style={{ fontSize: '14px', fontWeight: 900, color: textCol, letterSpacing: '0.04em' }}>
                  SHREE ASSOCIATES
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Search Toggle Icon */}
                <button
                  onClick={() => setShowMobileSearch(true)}
                  aria-label="Search"
                  style={{
                    padding: '8px',
                    background: 'none',
                    border: 'none',
                    color: textCol,
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  🔍
                </button>

                {/* Bell */}
                <button
                  onClick={() => setShowNotifDrawer(true)}
                  aria-label="Notifications"
                  style={{
                    padding: '8px',
                    background: 'none',
                    border: 'none',
                    color: textCol,
                    fontSize: '16px',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '0px',
                        right: '0px',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        fontSize: '9px',
                        fontWeight: 900,
                        borderRadius: '50%',
                        width: '15px',
                        height: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 5px rgba(220, 38, 38, 0.6)',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Profile dropdown */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowProfileMenu(!showProfileMenu)} aria-label="Profile" style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: textCol, fontSize: '16px', padding: '8px' }}>
                    👤
                  </button>
                  {showProfileMenu && (
                    <div style={{ position: 'absolute', top: '42px', right: 0, width: '210px', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, padding: '6px 0' }}>
                      <div style={{ padding: '8px 16px', borderBottom: `1px solid ${borderCol}`, fontSize: '11.5px', color: subTextCol }}>
                        Logged in as <br />
                        <strong style={{ color: textCol, fontSize: '12.5px' }}>{user?.email}</strong>
                      </div>

                      {user?.role === 'OWNER' && (
                        <>
                          <button onClick={() => { setShowProfileMenu(false); setShowManageClients(true); }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: textCol }}>👥 Manage Clients</button>
                          <button onClick={handleOpenSettings} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: textCol }}>⚙️ Settings</button>
                        </>
                      )}

                      {/* Dark/Light mode toggle in mobile profile dropdown */}
                      <button onClick={() => { toggleTheme(); setShowProfileMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: textCol }}>
                        {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
                      </button>

                      <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: '#EF4444' }}>🚪 Sign Out</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>
      ) : (
        <header
          style={{
            height: '70px',
            position: 'fixed',
            top: 0,
            left: `${sidebarWidth}px`,
            right: 0,
            backgroundColor: bgCol,
            borderBottom: `1px solid ${borderCol}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            zIndex: 30,
            transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* LEFT SECTION */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleSidebar}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: subTextCol,
                fontSize: '20px',
                padding: '6px 8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ☰
            </button>

            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: textCol, letterSpacing: '0.04em' }}>
                SHREE ASSOCIATES
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: Search -> Clock -> Market Status -> Refresh -> Dark Mode -> Bell -> Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, justifyContent: 'flex-end' }}>
            
            {/* 1. SEARCH BAR */}
            <div style={{ position: 'relative', width: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isDark ? '#1E293B' : '#F8FAFC', border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, borderRadius: '8px', padding: '6px 12px' }}>
                <span style={{ fontSize: '13px', color: subTextCol, marginRight: '8px' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search Symbol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm.trim() && setShowSearchResults(true)}
                  style={{ width: '100%', border: 'none', background: 'transparent', color: textCol, fontSize: '12.5px', outline: 'none' }}
                />
              </div>

              {showSearchResults && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '42px', left: 0, right: 0, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', maxHeight: '300px', overflowY: 'auto', zIndex: 50, padding: '4px' }}>
                  {searchResults.map((res) => (
                    <div key={res.id} onClick={() => { setShowSearchResults(false); setSearchTerm(''); window.location.href = res.status === 'CLOSED' ? '/closed' : '/open'; }} style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: textCol }}>
                      <div>
                        <span style={{ fontWeight: 800 }}>{res.symbol}</span>
                        <span style={{ marginLeft: '8px', color: subTextCol, fontSize: '11.5px' }}>{res.company}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. CLOCK */}
            <div style={{ textAlign: 'right', fontSize: '12px', color: subTextCol, fontWeight: 600 }}>
              <div style={{ color: textCol, fontWeight: 800, fontSize: '12.5px' }}>{currentTime}</div>
              <div style={{ fontSize: '10.5px' }}>{currentDate}</div>
            </div>

            {/* 3. MARKET STATUS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block', boxShadow: '0 0 6px #16A34A' }} />
                <span style={{ color: textCol }}>NSE LIVE</span>
              </div>
            </div>

            {/* 4. REFRESH CONTROL */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowRefreshMenu(!showRefreshMenu)} style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: textCol, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔄 Refresh</span>
              </button>
              {showRefreshMenu && (
                <div style={{ position: 'absolute', top: '42px', right: 0, width: '170px', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, padding: '6px' }}>
                  <button onClick={() => { onManualRefresh(); setShowRefreshMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: textCol }}>⚡ Instant Refresh</button>
                  <div style={{ borderTop: `1px solid ${borderCol}`, margin: '4px 0' }} />
                  {[
                    { label: 'Auto: OFF', val: 0 },
                    { label: 'Auto: 30 sec', val: 30 },
                    { label: 'Auto: 60 sec', val: 60 },
                    { label: 'Auto: 5 min', val: 300 },
                  ].map((item) => (
                    <button key={item.val} onClick={() => { setRefreshInterval(item.val); setShowRefreshMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', backgroundColor: refreshInterval === item.val ? (isDark ? '#334155' : '#F1F5F9') : 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: refreshInterval === item.val ? 800 : 500, color: textCol, borderRadius: '6px' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. DARK MODE */}
            <button onClick={toggleTheme} title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`} style={{ padding: '7px 11px', borderRadius: '8px', border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: textCol, fontSize: '14px', cursor: 'pointer' }}>
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* 6. NOTIFICATION BELL WITH UNREAD BADGE */}
            <button
              onClick={() => setShowNotifDrawer(true)}
              style={{
                padding: '7px 11px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                color: textCol,
                fontSize: '15px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '9.5px',
                    fontWeight: 900,
                    borderRadius: '50%',
                    width: '17px',
                    height: '17px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 5px rgba(220, 38, 38, 0.6)',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* 7. PROFILE MENU */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: textCol, cursor: 'pointer', fontSize: '12.5px', fontWeight: 700 }}>
                <span>👤 {user?.name || 'Analyst'}</span>
              </button>
              {showProfileMenu && (
                <div style={{ position: 'absolute', top: '42px', right: 0, width: '210px', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, padding: '6px 0' }}>
                  <div style={{ padding: '8px 16px', borderBottom: `1px solid ${borderCol}`, fontSize: '11.5px', color: subTextCol }}>
                    Logged in as <br />
                    <strong style={{ color: textCol, fontSize: '12.5px' }}>{user?.email}</strong>
                  </div>

                  {user?.role === 'OWNER' && (
                    <>
                      <button onClick={() => { setShowProfileMenu(false); setShowManageClients(true); }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: textCol }}>👥 Manage Clients</button>
                      <button onClick={handleOpenSettings} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: textCol }}>⚙️ Notification Settings</button>
                    </>
                  )}

                  <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: '#EF4444' }}>🚪 Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Slide-over Notifications Drawer (BELL DRAWER - Req 10) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(3px)',
          zIndex: 100,
          opacity: showNotifDrawer ? 1 : 0,
          pointerEvents: showNotifDrawer ? 'auto' : 'none',
          transition: 'opacity 0.25s ease-in-out',
        }}
        onClick={() => setShowNotifDrawer(false)}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '460px',
            height: '100%',
            backgroundColor: cardBg,
            boxShadow: '-8px 0 25px rgba(0,0,0,0.15)',
            transform: showNotifDrawer ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: textCol }}>🔔 Alerts &amp; Notifications</h3>
              {unreadCount > 0 && <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>{unreadCount} unread messages</span>}
            </div>
            <button onClick={() => setShowNotifDrawer(false)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: subTextCol }}>❌</button>
          </div>

          {/* Search & Filters */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search notifications..."
              value={notifSearch}
              onChange={(e) => setNotifSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '12.5px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: textCol }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'unread', 'read'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setNotifFilter(filter)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: notifFilter === filter ? 800 : 500,
                      backgroundColor: notifFilter === filter ? (isDark ? '#334155' : '#E2E8F0') : 'transparent',
                      color: textCol,
                      cursor: 'pointer',
                    }}
                  >
                    {filter.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Bulk Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#16A34A', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Mark All Read</button>
                <span style={{ color: subTextCol, fontSize: '11px' }}>|</span>
                <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Clear All</button>
              </div>
            </div>
          </div>

          {/* Notifications List (Relative time & scroll - Req 10) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: subTextCol, fontSize: '13px' }}>
                No notifications to display.
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isUnread = !n.read;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      backgroundColor: isUnread ? (isDark ? '#1E293B' : '#F0FDF4') : 'transparent',
                      border: `1px solid ${isUnread ? (isDark ? '#334155' : '#DCFCE7') : borderCol}`,
                      marginBottom: '10px',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          color: n.type === 'TARGET_HIT' ? '#16A34A' : n.type === 'STOP_LOSS' ? '#DC2626' : '#2563EB',
                        }}
                      >
                        {n.type.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '11px', color: subTextCol }}>
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 800, color: textCol, marginTop: '4px' }}>
                      {n.company} ({n.symbol})
                    </div>
                    <div style={{ fontSize: '12px', color: subTextCol, marginTop: '2px', lineBreak: 'anywhere' }}>
                      {n.message}
                    </div>

                    {isUnread && (
                      <span style={{ position: 'absolute', top: '14px', left: '6px', width: '6px', height: '6px', backgroundColor: '#16A34A', borderRadius: '50%' }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* OWNER: Notification Settings Modal */}
      {showNotificationSettings && user?.role === 'OWNER' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '560px', padding: '24px', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}`, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>⚙️ Shree Associates Notification Engine Settings</h3>
              <button onClick={() => setShowNotificationSettings(false)} style={{ border: 'none', background: 'none', fontSize: '15px', cursor: 'pointer', color: subTextCol }}>❌</button>
            </div>

            {settingsMsg && (
              <div style={{ padding: '10px', borderRadius: '6px', fontSize: '12.5px', marginBottom: '14px', backgroundColor: settingsMsg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2', color: settingsMsg.startsWith('✅') ? '#15803D' : '#991B1B' }}>
                {settingsMsg}
              </div>
            )}

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Preferences Toggles */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Alert Switches</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.prefNearBuy} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefNearBuy: e.target.checked })} />
                    Near Buy Target
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.prefBuyTrigger} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefBuyTrigger: e.target.checked })} />
                    Buy Price Triggers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.prefStopLoss} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefStopLoss: e.target.checked })} />
                    Stop Loss Triggers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.prefTargetHit} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefTargetHit: e.target.checked })} />
                    Target Hits
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.prefManualClose} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefManualClose: e.target.checked })} />
                    Manual Position Closures
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.prefDailySummary} onChange={(e) => setNotifPreferences({ ...notifPreferences, prefDailySummary: e.target.checked })} />
                    Daily Summary
                  </label>
                </div>
              </div>

              {/* Channels Toggles */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Delivery Channels</h4>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.emailEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, emailEnabled: e.target.checked, emailNotificationsEnabled: e.target.checked })} />
                    Email Alerts
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.telegramEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, telegramEnabled: e.target.checked, telegramNotificationsEnabled: e.target.checked })} />
                    Telegram Bot
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <input type="checkbox" checked={notifPreferences.inAppEnabled} onChange={(e) => setNotifPreferences({ ...notifPreferences, inAppEnabled: e.target.checked, inAppNotificationsEnabled: e.target.checked })} />
                    In-App Notification
                  </label>
                </div>
              </div>

              {/* Editable email and chat ID fields */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Email Address *</label>
                  <input type="email" value={notifPreferences.email || ''} onChange={(e) => setNotifPreferences({ ...notifPreferences, email: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '12.5px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Telegram Chat IDs (comma-separated)</label>
                  <input type="text" placeholder="e.g. 982736412, 123456789" value={notifPreferences.telegramChatIds || ''} onChange={(e) => setNotifPreferences({ ...notifPreferences, telegramChatIds: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '12.5px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                </div>
              </div>

              {/* Legacy Telegram Recipients list */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: subTextCol, textTransform: 'uppercase' }}>Telegram Bot Recipients (Legacy)</h4>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <input type="text" placeholder="Chat ID" value={newChatId} onChange={(e) => setNewChatId(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '12.5px', flex: 1, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                  <input type="text" placeholder="Name tag" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '12.5px', flex: 1, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
                  <button type="button" onClick={handleAddTelegramRecipient} style={{ padding: '6px 14px', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>Add</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {telegramRecipients.map((r, idx) => (
                    <div key={r.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '6px', backgroundColor: isDark ? '#0F172A' : '#F8FAFC', border: `1px solid ${borderCol}` }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{r.name} ({r.chatId})</span>
                      <button type="button" onClick={() => handleRemoveTelegramRecipient(r.id)} style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: `1px solid ${borderCol}`, paddingTop: '16px', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={handleSendTestTelegram} style={{ flex: 1, padding: '8px 12px', backgroundColor: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                    Send Test Telegram
                  </button>
                  <button type="button" onClick={handleSendTestEmail} style={{ flex: 1, padding: '8px 12px', backgroundColor: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                    Send Test Email
                  </button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setShowNotificationSettings(false)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '12.5px' }}>Cancel</button>
                  <button type="submit" className="btnPrimary" style={{ padding: '8px 18px', fontSize: '12.5px', backgroundColor: '#16A34A' }}>Save Settings</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owner Manage Clients Modal */}
      {showManageClients && user?.role === 'OWNER' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '460px', padding: '24px', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>👥 Manage Client Accounts</h3>
              <button onClick={() => setShowManageClients(false)} style={{ border: 'none', background: 'none', fontSize: '15px', cursor: 'pointer', color: subTextCol }}>❌</button>
            </div>

            {clientMsg && (
              <div style={{ padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '14px', backgroundColor: clientMsg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2', color: clientMsg.startsWith('✅') ? '#15803D' : '#991B1B' }}>
                {clientMsg}
              </div>
            )}

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: subTextCol }}>Create New Client Account</h4>
              <input type="text" placeholder="Client Full Name" value={clientName} onChange={(e) => setClientName(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              <input type="email" placeholder="Client Email Address" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              <input type="password" placeholder="Client Initial Password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowManageClients(false)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '12.5px' }}>Cancel</button>
                <button type="submit" className="btnPrimary" style={{ padding: '8px 16px', fontSize: '12.5px', backgroundColor: '#16A34A' }}>Create Client Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
