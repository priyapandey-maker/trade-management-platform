'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Briefcase, CheckCircle, PieChart, LayoutDashboard, Users, Settings, X, LogOut } from 'lucide-react';

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

  const navItems = [
    { name: 'Open Positions', href: '/open', icon: <Briefcase size={18} /> },
    { name: 'Closed Positions', href: '/closed', icon: <CheckCircle size={18} /> },
    { name: 'Portfolio', href: '/portfolio', icon: <PieChart size={18} /> },
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Investors', href: '/investors', icon: <Users size={18} /> },
    { name: 'Settings', href: '/settings', icon: <Settings size={18} /> },
  ];

  const bgCol = '#FFFFFF';
  const borderCol = '#E2E8F0';
  const textCol = '#0F172A';
  const subTextCol = '#64748B';

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
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 90,
            opacity: showMobile ? 1 : 0,
            pointerEvents: showMobile ? 'auto' : 'none',
            transition: 'opacity 0.2s ease-in-out',
          }}
        />
        {/* Drawer Aside */}
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
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Mobile Drawer Aside */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${borderCol}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 800, color: textCol, fontSize: '14px' }}>Menu</span>
            <button onClick={onClose} aria-label="Close menu" style={{ border: 'none', background: 'none', cursor: 'pointer', color: subTextCol, padding: '4px' }}>
              <X size={20} />
            </button>
          </div>

          {/* Navigation Group */}
          <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
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
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2563EB' : subTextCol,
                    backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                    border: '1px solid transparent',
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
          <div style={{ padding: '16px 12px', borderTop: `1px solid ${borderCol}` }}>
            <button
              onClick={() => {
                onClose?.();
                logout();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '14px',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#EF4444',
                backgroundColor: 'transparent',
                border: 'none',
                width: '100%',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={18} />
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
        height: 'calc(100vh - 70px)',
        position: 'fixed',
        top: '70px',
        left: 0,
        backgroundColor: bgCol,
        borderRight: `1px solid ${borderCol}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Navigation Group with Enterprise Financial Icons */}
      <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
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
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563EB' : subTextCol,
                backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                border: '1px solid transparent',
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

      {/* Footer Status & Logout */}
      <div style={{ padding: '16px 12px', borderTop: `1px solid ${borderCol}`, marginTop: 'auto' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '14px',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#EF4444',
            backgroundColor: 'transparent',
            border: 'none',
            width: '100%',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
});
Sidebar.displayName = 'Sidebar';
