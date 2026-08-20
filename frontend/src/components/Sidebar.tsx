'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Briefcase, CheckCircle, PieChart, LayoutDashboard, X, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobile?: boolean;
  showMobile?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ 
  isCollapsed, 
  toggleCollapse,
  isMobile = false,
  showMobile = false,
  onClose,
}) => {
  const pathname = usePathname();
  const { logout } = useAuth();

  // STRICT REQUIREMENT: ONLY 4 core pages in navigation
  const navItems = [
    { name: 'Portfolio', href: '/portfolio', icon: <PieChart size={18} /> },
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Open Positions', href: '/open', icon: <Briefcase size={18} /> },
    { name: 'Closed Positions', href: '/closed', icon: <CheckCircle size={18} /> },
  ];

  const bgCol = 'var(--color-surface-1)';
  const borderCol = 'var(--color-border)';
  const textCol = 'var(--color-text-primary)';
  const subTextCol = 'var(--color-text-secondary)';

  if (isMobile) {
    return (
      <>
        {/* Overlay Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(7, 9, 14, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            opacity: showMobile ? 1 : 0,
            pointerEvents: showMobile ? 'auto' : 'none',
            transition: 'opacity 0.2s ease-in-out',
          }}
        />
        {/* Mobile Drawer */}
        <aside
          style={{
            width: '260px',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            backgroundColor: bgCol,
            borderRight: `1px solid ${borderCol}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            transform: showMobile ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${borderCol}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 800, color: textCol, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Navigation Menu</span>
            <button onClick={onClose} aria-label="Close menu" style={{ border: 'none', background: 'none', cursor: 'pointer', color: subTextCol, padding: '4px' }}>
              <X size={20} />
            </button>
          </div>

          <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#818cf8' : subTextCol,
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          <div style={{ padding: '16px', borderTop: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={() => {
                onClose?.();
                logout();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </>
    );
  }

  return (
    <aside
      style={{
        width: isCollapsed ? '80px' : '260px',
        height: 'calc(100vh - 74px)',
        position: 'fixed',
        top: '74px',
        left: 0,
        backgroundColor: bgCol,
        borderRight: `1px solid ${borderCol}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <button
        onClick={toggleCollapse}
        className="sidebar-toggle-btn"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '14px',
                padding: isCollapsed ? '12px' : '12px 16px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#818cf8' : subTextCol,
                backgroundColor: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              {!isCollapsed && (
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Logout */}
      <div style={{ padding: '16px 12px', borderTop: `1px solid ${borderCol}`, marginTop: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {!isCollapsed && (
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={logout}
            title="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
});
Sidebar.displayName = 'Sidebar';
