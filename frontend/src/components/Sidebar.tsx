'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobile?: boolean;
  showMobile?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  toggleCollapse,
  isMobile = false,
  showMobile = false,
  onClose,
}) => {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navItems = [
    { name: 'Open Positions', href: '/open', icon: '💼' },
    { name: 'Closed Positions', href: '/closed', icon: '✅' },
    { name: 'Portfolio', href: '/portfolio', icon: '👛' },
    { name: 'Dashboard', href: '/dashboard', icon: '🎛️' },
    { name: 'Investors', href: '/investors', icon: '👥' },
  ];

  const bgCol = isDark ? '#0F172A' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const subTextCol = isDark ? '#94A3B8' : '#64748B';

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
          {/* Brand Header */}
          <div
            style={{
              padding: '24px 20px',
              borderBottom: `1px solid ${borderCol}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '70px',
              boxSizing: 'border-box',
            }}
          >
            <Link href="/open" onClick={onClose} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', position: 'relative' }}>
                  <Image src="/logo-monogram.svg" alt="SA" width={36} height={36} priority />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: textCol, letterSpacing: '0.04em' }}>
                  SHREE ASSOCIATES
                </div>
              </div>
            </Link>
            <button onClick={onClose} aria-label="Close menu" style={{ border: 'none', background: 'none', fontSize: '16px', cursor: 'pointer', color: subTextCol, padding: '4px' }}>
              ❌
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
                    color: isActive ? '#16A34A' : subTextCol,
                    backgroundColor: isActive ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4') : 'transparent',
                    border: isActive ? (isDark ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid #DCFCE7') : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
      </>
    );
  }

  return (
    <aside
      style={{
        width: isCollapsed ? '80px' : '260px',
        height: '100vh',
        position: 'fixed',
        top: 0,
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
      {/* Brand Header: Logo Emblem + SHREE ASSOCIATES (No Tagline) */}
      <div
        style={{
          padding: isCollapsed ? '20px 12px' : '24px 20px',
          borderBottom: `1px solid ${borderCol}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          height: '70px',
          boxSizing: 'border-box',
        }}
      >
        <Link href="/open" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isCollapsed ? (
            <div style={{ width: '38px', height: '38px', position: 'relative' }}>
              <Image src="/logo-monogram.svg" alt="SA" width={38} height={38} priority />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', position: 'relative' }}>
                <Image src="/logo-monogram.svg" alt="SA" width={36} height={36} priority />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: textCol, letterSpacing: '0.04em' }}>
                SHREE ASSOCIATES
              </div>
            </div>
          )}
        </Link>
      </div>

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
                color: isActive ? '#16A34A' : subTextCol,
                backgroundColor: isActive ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4') : 'transparent',
                border: isActive ? (isDark ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid #DCFCE7') : '1px solid transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {!isCollapsed && (
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Status */}
      {!isCollapsed && (
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${borderCol}`, backgroundColor: isDark ? '#0B0F17' : '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: textCol, fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block', boxShadow: '0 0 8px #16A34A' }} />
            <span>Twelve Data Primary Engine</span>
          </div>
          <div style={{ fontSize: '12px', color: subTextCol, marginTop: '3px', fontWeight: 600 }}>
            SHREE ASSOCIATES
          </div>
        </div>
      )}
    </aside>
  );
};
