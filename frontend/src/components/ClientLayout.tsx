'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { usePathname } from 'next/navigation';

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { token, loading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Collapsible Sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60); // 60s default
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('shree_sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('shree_sidebar_collapsed', String(next));
  };

  const handleManualRefresh = () => {
    setLastUpdatedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    window.dispatchEvent(new CustomEvent('shree_manual_refresh'));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B0F17' : '#F8FAFC', color: isDark ? '#F8FAFC' : '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>▲</div>
          <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.05em' }}>Connecting to Shree Associates Terminal...</div>
        </div>
      </div>
    );
  }

  // Login page layout (no Sidebar / Header)
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const sidebarWidth = isCollapsed ? 80 : 260;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: isDark ? '#0B0F17' : '#F8FAFC', color: isDark ? '#F8FAFC' : '#0F172A' }}>
      <Sidebar isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
      <Header
        sidebarWidth={sidebarWidth}
        isCollapsed={isCollapsed}
        toggleSidebar={toggleCollapse}
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
        onManualRefresh={handleManualRefresh}
        lastUpdatedTime={lastUpdatedTime}
      />
      <main
        style={{
          marginLeft: `${sidebarWidth}px`,
          marginTop: '70px',
          padding: '28px 32px',
          minHeight: 'calc(100vh - 70px)',
          transition: 'margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
    </div>
  );
};

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LayoutContent>{children}</LayoutContent>
      </ThemeProvider>
    </AuthProvider>
  );
};
