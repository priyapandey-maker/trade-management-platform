'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { usePathname } from 'next/navigation';

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { token, loading } = useAuth();
  

  // Collapsible Sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60); // 60s default
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('shree_sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }

    // Set initial sizes
    setIsMobile(window.innerWidth < 768);
    setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    window.addEventListener('resize', handleResize);
    
    const handleSetInterval = (e: any) => {
      if (e.detail && typeof e.detail.interval === 'number') {
        setRefreshInterval(e.detail.interval);
      }
    };
    window.addEventListener('shree_set_refresh_interval', handleSetInterval);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('shree_set_refresh_interval', handleSetInterval);
    };
  }, []);

  const toggleCollapse = () => {
    if (isTablet) return; // Tablet is locked to collapsed (icons-only)
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
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

  const sidebarWidth = isMobile ? 0 : (isTablet || isCollapsed ? 80 : 260);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A' }}>
      <Sidebar 
        isCollapsed={isTablet || isCollapsed} 
        toggleCollapse={toggleCollapse} 
        isMobile={isMobile}
        showMobile={showMobileSidebar}
        onClose={() => setShowMobileSidebar(false)}
      />
      <Header
        sidebarWidth={sidebarWidth}
        isCollapsed={isTablet || isCollapsed}
        toggleSidebar={toggleCollapse}
        isMobile={isMobile}
        toggleMobileSidebar={() => setShowMobileSidebar(!showMobileSidebar)}
      />
      <main
        style={{
          marginLeft: `${sidebarWidth}px`,
          marginTop: '70px',
          padding: isMobile ? '16px' : '28px 32px',
          minHeight: 'calc(100vh - 70px)',
          transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
    </div>
  );
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 10000, // 10s default caching duration
    },
  },
});

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <LayoutContent>{children}</LayoutContent>
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};
