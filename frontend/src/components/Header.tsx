'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { Menu, Search, User, X, LogOut, Users, Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

interface HeaderProps {
  sidebarWidth: number;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobile?: boolean;
  toggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  sidebarWidth,
  isCollapsed,
  toggleSidebar,
  isMobile = false,
  toggleMobileSidebar,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mobile search state
  const [showMobileSearch, setShowMobileSearch] = useState(false);

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

  // Dropdowns
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  const bgCol = 'var(--glass-bg)'; 
  const borderCol = 'var(--color-border)';
  const textCol = 'var(--color-text-primary)';
  const subTextCol = 'var(--color-text-secondary)';

  return (
    <>
      {isMobile ? (
        <header
          style={{
            height: '74px',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: bgCol,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${borderCol}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 110,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {showMobileSearch ? (
            /* Mobile Search Overlay Mode */
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
              <button
                onClick={() => { setShowMobileSearch(false); setSearchTerm(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: subTextCol, fontSize: '18px', padding: '6px' }}
              >
                <X size={18} />
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-2)', border: `1px solid ${borderCol}`, borderRadius: '8px', padding: '6px 12px' }}>
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: subTextCol, fontSize: '13px' }}
                >
                  Clear
                </button>
              )}
              
              {/* Search results drawer */}
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '74px', left: 0, right: 0, backgroundColor: 'var(--color-surface-1)', borderBottom: `1px solid ${borderCol}`, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', maxHeight: 'calc(100vh - 74px)', overflowY: 'auto', zIndex: 50, padding: '8px' }}>
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
                    color: textCol,
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Menu size={20} />
                </button>
                
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                  <div className="lp-nav-logo-container" style={{ height: '48px', padding: '0 14px' }}>
                    <Image src="/shree_logo_full.png" alt="Shree Associates" width={220} height={48} style={{ objectFit: 'contain', height: '32px', width: 'auto' }} className="theme-logo" priority />
                  </div>
                </Link>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setShowMobileSearch(true)}
                  aria-label="Search"
                  style={{
                    padding: '8px',
                    background: 'none',
                    border: 'none',
                    color: textCol,
                    cursor: 'pointer',
                  }}
                >
                  <Search size={18} />
                </button>

                <button
                  onClick={toggleTheme}
                  aria-label="Toggle Theme"
                  style={{
                    padding: '8px',
                    background: 'none',
                    border: 'none',
                    color: textCol,
                    cursor: 'pointer',
                  }}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowProfileMenu(!showProfileMenu)} aria-label="Profile" style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: textCol, padding: '8px' }}>
                    <User size={18} />
                  </button>
                  {showProfileMenu && (
                    <div style={{ position: 'absolute', top: '42px', right: 0, width: '220px', backgroundColor: 'var(--color-surface-1)', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 50, padding: '6px 0' }}>
                      <div style={{ padding: '8px 16px', borderBottom: `1px solid ${borderCol}`, fontSize: '11.5px', color: subTextCol }}>
                        Logged in as <br />
                        <strong style={{ color: textCol, fontSize: '12.5px' }}>{user?.email}</strong>
                      </div>

                      {user?.role === 'OWNER' && (
                        <button onClick={() => { setShowProfileMenu(false); setShowManageClients(true); }} className="dropdown-menu-item"><Users size={14} /> Manage Clients</button>
                      )}

                      <button onClick={logout} className="dropdown-menu-item-danger"><LogOut size={14} /> Sign Out</button>
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
            height: '74px',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: bgCol,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${borderCol}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            zIndex: 110,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {/* LEFT SECTION */}
          <div style={{ display: 'flex', alignItems: 'center', width: '280px', gap: '20px' }}>
            <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <div className="lp-nav-logo-container" style={{ height: '48px', padding: '0 18px' }}>
                <Image src="/shree_logo_full.png" alt="Shree Associates" width={260} height={48} style={{ objectFit: 'contain', height: '36px', width: 'auto' }} className="theme-logo" priority />
              </div>
            </Link>
          </div>

          {/* MIDDLE SECTION: Centered Search Bar */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-2)', border: `1px solid ${borderCol}`, borderRadius: '8px', padding: '6px 12px', transition: 'border-color 0.2s' }}>
                <Search size={14} style={{ color: subTextCol, marginRight: '8px' }} />
                <input
                  type="text"
                  placeholder="Search Symbol or Company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm.trim() && setShowSearchResults(true)}
                  style={{ width: '100%', border: 'none', background: 'transparent', color: textCol, fontSize: '12.5px', outline: 'none' }}
                />
              </div>

              {showSearchResults && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '42px', left: 0, right: 0, backgroundColor: 'var(--color-surface-1)', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: 'var(--shadow-lg)', maxHeight: '300px', overflowY: 'auto', zIndex: 50, padding: '4px' }}>
                  {searchResults.map((res) => (
                    <div key={res.id} onClick={() => { setShowSearchResults(false); setSearchTerm(''); window.location.href = res.status === 'CLOSED' ? '/closed' : '/open'; }} className="hover-row" style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: textCol }}>
                      <div>
                        <span style={{ fontWeight: 800 }}>{res.symbol}</span>
                        <span style={{ marginLeft: '8px', color: subTextCol, fontSize: '11.5px' }}>{res.company}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION: Theme Toggle & Profile Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end' }}>
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: `1px solid ${borderCol}`,
                backgroundColor: 'var(--color-surface-2)',
                color: textCol,
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  height: '38px',
                  padding: '0 14px', 
                  borderRadius: '8px', 
                  border: `1px solid ${borderCol}`, 
                  backgroundColor: 'var(--color-surface-2)', 
                  color: textCol, 
                  cursor: 'pointer', 
                  fontSize: '12.5px', 
                  fontWeight: 600,
                  transition: 'border-color 0.2s ease'
                }}
              >
                <User size={15} style={{ color: 'var(--color-accent)' }} />
                <span>{user?.name || 'Analyst'}</span>
              </button>

              {showProfileMenu && (
                <div style={{ position: 'absolute', top: '44px', right: 0, width: '220px', backgroundColor: 'var(--color-surface-1)', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 50, padding: '6px 0' }}>
                  <div style={{ padding: '8px 16px', borderBottom: `1px solid ${borderCol}`, fontSize: '11.5px', color: subTextCol }}>
                    Logged in as <br />
                    <strong style={{ color: textCol, fontSize: '12.5px' }}>{user?.email}</strong>
                  </div>

                  {user?.role === 'OWNER' && (
                    <button onClick={() => { setShowProfileMenu(false); setShowManageClients(true); }} className="dropdown-menu-item"><Users size={14} /> Manage Clients</button>
                  )}

                  <button onClick={logout} className="dropdown-menu-item-danger"><LogOut size={14} /> Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Owner Manage Clients Modal */}
      {showManageClients && user?.role === 'OWNER' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '440px', padding: '24px', backgroundColor: 'var(--color-surface-1)', color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: textCol }}>
                <Users size={18} style={{ color: '#818cf8' }} /> Manage Client Accounts
              </h3>
              <button onClick={() => setShowManageClients(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: subTextCol }}><X size={18} /></button>
            </div>

            {clientMsg && (
              <div style={{ padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '14px', backgroundColor: clientMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: clientMsg.startsWith('✅') ? '#10b981' : '#ef4444', border: `1px solid ${clientMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
                {clientMsg}
              </div>
            )}

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: subTextCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create New Client Account</h4>
              <input type="text" placeholder="Client Full Name" value={clientName} onChange={(e) => setClientName(e.target.value)} required style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: 'var(--color-surface-2)', color: textCol }} />
              <input type="email" placeholder="Client Email Address" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: 'var(--color-surface-2)', color: textCol }} />
              <input type="password" placeholder="Client Initial Password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} required style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: 'var(--color-surface-2)', color: textCol }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowManageClients(false)} className="btnSecondary" style={{ padding: '8px 16px', fontSize: '12.5px' }}>Cancel</button>
                <button type="submit" className="btnPrimary" style={{ padding: '8px 16px', fontSize: '12.5px', backgroundColor: '#6366f1' }}>Create Client Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});
Header.displayName = 'Header';
