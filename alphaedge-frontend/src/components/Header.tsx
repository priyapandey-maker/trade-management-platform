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
}

export const Header: React.FC<HeaderProps> = ({
  sidebarWidth,
  isCollapsed,
  toggleSidebar,
  refreshInterval,
  setRefreshInterval,
  onManualRefresh,
  lastUpdatedTime,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Live Compact Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Global Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Manage Clients Modal state (Owner only)
  const [showManageClients, setShowManageClients] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientMsg, setClientMsg] = useState<string | null>(null);

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

  // Global Instant Search
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

  const bgCol = isDark ? '#0F172A' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

  return (
    <>
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
          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
            <div style={{ fontSize: '15px', fontWeight: 900, color: textCol, letterSpacing: '0.03em', lineHeight: 1.1 }}>
              SHREE ASSOCIATES
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: subTextCol, marginTop: '2px' }}>
              Professional Trade Management Platform
            </div>
          </div>
        </div>

        {/* CENTER SECTION - ONE LARGE GLOBAL SEARCH BAR */}
        <div style={{ flex: 1, maxWidth: '520px', margin: '0 28px', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              borderRadius: '10px',
              padding: '8px 14px',
            }}
          >
            <span style={{ fontSize: '14px', color: subTextCol, marginRight: '10px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search Symbol, Company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm.trim() && setShowSearchResults(true)}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                color: textCol,
                fontSize: '13.5px',
                fontWeight: 500,
                outline: 'none',
              }}
            />
          </div>

          {/* Instant Search Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                left: 0,
                right: 0,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                border: `1px solid ${borderCol}`,
                borderRadius: '10px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                maxHeight: '320px',
                overflowY: 'auto',
                zIndex: 50,
                padding: '6px',
              }}
            >
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => {
                    setShowSearchResults(false);
                    setSearchTerm('');
                    window.location.href = res.status === 'CLOSED' ? '/closed' : '/open';
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    color: textCol,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 800 }}>{res.symbol}</span>
                    <span style={{ marginLeft: '10px', color: subTextCol, fontSize: '12px' }}>{res.company}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '5px',
                      backgroundColor: res.status === 'OPEN' ? '#DCFCE7' : '#F1F5F9',
                      color: res.status === 'OPEN' ? '#15803D' : '#475569',
                    }}
                  >
                    {res.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COMPACT TYPOGRAPHY-ONLY MARKET STRIP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block', boxShadow: '0 0 6px #16A34A' }} />
            <span style={{ color: textCol, letterSpacing: '0.04em' }}>NSE LIVE</span>
          </div>

          <div style={{ color: subTextCol }}>
            <strong style={{ color: textCol, marginRight: '4px' }}>NIFTY 50</strong>
            <span style={{ color: textCol, fontWeight: 700 }}>24,812.40</span>
            <span style={{ color: '#16A34A', marginLeft: '4px', fontWeight: 800 }}>+0.74%</span>
          </div>

          <div style={{ color: subTextCol }}>
            <strong style={{ color: textCol, marginRight: '4px' }}>SENSEX</strong>
            <span style={{ color: textCol, fontWeight: 700 }}>81,350.20</span>
            <span style={{ color: '#16A34A', marginLeft: '4px', fontWeight: 800 }}>+0.67%</span>
          </div>
        </div>

        {/* RIGHT SECTION - CLOCK, MERGED REFRESH, THEME, PROFILE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '20px' }}>
          {/* Compact Clock */}
          <div style={{ textAlign: 'right', fontSize: '12px', color: subTextCol, fontWeight: 600 }}>
            <div style={{ color: textCol, fontWeight: 800, fontSize: '12.5px' }}>{currentTime}</div>
            <div style={{ fontSize: '11px' }}>{currentDate}</div>
          </div>

          {/* Merged Refresh Menu Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRefreshMenu(!showRefreshMenu)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                color: textCol,
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🔄 Refresh</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>

            {showRefreshMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '42px',
                  right: 0,
                  width: '180px',
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${borderCol}`,
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 50,
                  padding: '6px',
                }}
              >
                <button
                  onClick={() => {
                    onManualRefresh();
                    setShowRefreshMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: textCol,
                  }}
                >
                  ⚡ Instant Refresh
                </button>
                <div style={{ borderTop: `1px solid ${borderCol}`, margin: '4px 0' }} />
                {[
                  { label: 'Auto: OFF', val: 0 },
                  { label: 'Auto: 30 sec', val: 30 },
                  { label: 'Auto: 60 sec', val: 60 },
                  { label: 'Auto: 5 min', val: 300 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => {
                      setRefreshInterval(item.val);
                      setShowRefreshMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: refreshInterval === item.val ? (isDark ? '#334155' : '#F1F5F9') : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: refreshInterval === item.val ? 800 : 500,
                      color: textCol,
                      borderRadius: '6px',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle Switch */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              color: textCol,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Owner Profile Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                color: textCol,
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            >
              <span>👤 {user?.name || 'Analyst'}</span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: user?.role === 'OWNER' ? '#16A34A' : '#64748B',
                  color: '#FFFFFF',
                }}
              >
                {user?.role || 'CLIENT'}
              </span>
            </button>

            {showProfileMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '42px',
                  right: 0,
                  width: '220px',
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${borderCol}`,
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 50,
                  padding: '8px 0',
                }}
              >
                <div style={{ padding: '8px 16px', borderBottom: `1px solid ${borderCol}`, fontSize: '11.5px', color: subTextCol }}>
                  Logged in as <br />
                  <strong style={{ color: textCol, fontSize: '12.5px' }}>{user?.email}</strong>
                </div>

                {user?.role === 'OWNER' && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowManageClients(true);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: textCol,
                    }}
                  >
                    👥 Manage Clients
                  </button>
                )}

                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#EF4444',
                  }}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Owner Manage Clients Modal */}
      {showManageClients && user?.role === 'OWNER' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '480px', padding: '24px', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>👥 Manage Client Accounts</h3>
              <button onClick={() => setShowManageClients(false)} style={{ border: 'none', background: 'none', fontSize: '16px', cursor: 'pointer', color: subTextCol }}>❌</button>
            </div>

            {clientMsg && (
              <div style={{ padding: '10px', borderRadius: '6px', fontSize: '12.5px', marginBottom: '16px', backgroundColor: clientMsg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2', color: clientMsg.startsWith('✅') ? '#15803D' : '#991B1B' }}>
                {clientMsg}
              </div>
            )}

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: subTextCol }}>Create New Client Account</h4>
              <input type="text" placeholder="Client Full Name" value={clientName} onChange={(e) => setClientName(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              <input type="email" placeholder="Client Email Address" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              <input type="password" placeholder="Client Initial Password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: textCol }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowManageClients(false)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
                <button type="submit" className="btnPrimary" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#16A34A' }}>Create Client Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
