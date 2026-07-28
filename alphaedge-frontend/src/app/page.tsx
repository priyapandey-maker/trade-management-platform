'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function IndexPage() {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (token) {
        router.replace('/open');
      } else {
        router.replace('/login');
      }
    }
  }, [token, loading, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', color: '#64748B', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px', animation: 'spin 2s linear infinite' }}>⏳</div>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading Shree Associates Terminal...</div>
      </div>
    </div>
  );
}
