'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { Menu, Search, User, X, LogOut, Users, Settings } from 'lucide-react';

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

  const bgCol = '#FFFFFF';
  const borderCol = '#E2E8F0';
  const textCol = '#0F172A';
  const subTextCol = '#64748B';

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
                <X size={18} />
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', border: `1px solid ${borderCol}`, borderRadius: '8px', padding: '8px 12px' }}>
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
                <div style={{ position: 'absolute', top: '70px', left: 0, right: 0, backgroundColor: '#FFFFFF', borderBottom: `1px solid ${borderCol}`, boxShadow: '0 12px 30px rgba(0,0,0,0.15)', maxHeight: 'calc(100vh - 70px)', overflowY: 'auto', zIndex: 50, padding: '8px' }}>
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
                  <Menu size={22} />
                </button>
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
                  <Search size={18} />
                </button>

                {/* Profile dropdown */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowProfileMenu(!showProfileMenu)} aria-label="Profile" style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: textCol, fontSize: '16px', padding: '8px' }}>
                    <User size={18} />
                  </button>
                  {showProfileMenu && (
                    <div style={{ position: 'absolute', top: '42px', right: 0, width: '210px', backgroundColor: '#FFFFFF', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, padding: '6px 0' }}>
                      <div style={{ padding: '8px 16px', borderBottom: `1px solid ${borderCol}`, fontSize: '11.5px', color: subTextCol }}>
                        Logged in as <br />
                        <strong style={{ color: textCol, fontSize: '12.5px' }}>{user?.email}</strong>
                      </div>

                      {user?.role === 'OWNER' && (
                        <>
                          <button onClick={() => { setShowProfileMenu(false); setShowManageClients(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: textCol }}><Users size={14} /> Manage Clients</button>
                          <Link href="/settings" onClick={() => setShowProfileMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '12.5px', fontWeight: 600, color: textCol, boxSizing: 'border-box' }}><Settings size={14} /> Settings</Link>
                        </>
                      )}

                      <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: '#EF4444' }}><LogOut size={14} /> Sign Out</button>
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
          <div style={{ display: 'flex', alignItems: 'center', width: '120px' }}>
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
              <Menu size={20} />
            </button>
          </div>

          {/* MIDDLE SECTION: Centered Search Bar */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 12px' }}>
                <Search size={14} style={{ color: subTextCol, marginRight: '8px' }} />
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
                <div style={{ position: 'absolute', top: '42px', left: 0, right: 0, backgroundColor: '#FFFFFF', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', maxHeight: '300px', overflowY: 'auto', zIndex: 50, padding: '4px' }}>
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
          </div>

          {/* RIGHT SECTION: Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-end' }}>
            
            {/* PROFILE MENU */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: textCol, cursor: 'pointer', fontSize: '12.5px', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16} /> {user?.name || 'Analyst'}</span>
              </button>
              {showProfileMenu && (
                <div style={{ position: 'absolute', top: '42px', right: 0, width: '210px', backgroundColor: '#FFFFFF', border: `1px solid ${borderCol}`, borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, padding: '6px 0' }}>
                  <div style={{ padding: '8px 16px', borderBottom: `1px solid ${borderCol}`, fontSize: '11.5px', color: subTextCol }}>
                    Logged in as <br />
                    <strong style={{ color: textCol, fontSize: '12.5px' }}>{user?.email}</strong>
                  </div>

                  {user?.role === 'OWNER' && (
                    <>
                      <button onClick={() => { setShowProfileMenu(false); setShowManageClients(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: textCol }}><Users size={14} /> Manage Clients</button>
                      <Link href="/settings" onClick={() => setShowProfileMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '12.5px', fontWeight: 600, color: textCol, boxSizing: 'border-box' }}><Settings size={14} /> Settings</Link>
                    </>
                  )}

                  <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: '#EF4444' }}><LogOut size={14} /> Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Owner Manage Clients Modal */}
      {showManageClients && user?.role === 'OWNER' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '460px', padding: '24px', backgroundColor: '#FFFFFF', color: textCol, borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} /> Manage Client Accounts</h3>
              <button onClick={() => setShowManageClients(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: subTextCol }}><X size={18} /></button>
            </div>

            {clientMsg && (
              <div style={{ padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '14px', backgroundColor: clientMsg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2', color: clientMsg.startsWith('✅') ? '#15803D' : '#991B1B' }}>
                {clientMsg}
              </div>
            )}

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: subTextCol }}>Create New Client Account</h4>
              <input type="text" placeholder="Client Full Name" value={clientName} onChange={(e) => setClientName(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
              <input type="email" placeholder="Client Email Address" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
              <input type="password" placeholder="Client Initial Password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderCol}`, fontSize: '13px', backgroundColor: '#FFFFFF', color: textCol }} />
              
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
});
Header.displayName = 'Header';
