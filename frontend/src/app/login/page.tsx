'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEyeHovered, setIsEyeHovered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#07090e',
      backgroundImage: 'linear-gradient(rgba(99,102,241,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.03) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
      fontFamily: 'var(--font-sans)',
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.15), transparent 60%)'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#0d121f',
        borderRadius: '16px',
        border: '1px solid #1f2937',
        boxShadow: '0 24px 90px rgba(0, 0, 0, 0.6)',
        padding: '40px 32px',
        position: 'relative',
        zIndex: 10
      }}>
        
        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            height: '52px',
            padding: '0 20px',
            borderRadius: '10px',
            backgroundColor: '#07090e',
            border: '1px solid #1f2937',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src="/shree_logo_full.png" alt="Shree Associates" style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </div>
          <p style={{
            fontSize: '12.5px',
            color: '#94a3b8',
            fontWeight: 500,
            margin: '14px 0 0 0'
          }}>
            Trade Management & Portfolio Analytics Terminal
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
            lineHeight: 1.4
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
              fontFamily: 'var(--font-mono)'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: '8px',
                  border: '1px solid #1f2937',
                  backgroundColor: '#07090e',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontWeight: 500,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
              fontFamily: 'var(--font-mono)'
            }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <LockKeyhole size={16} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 48px 12px 42px',
                  borderRadius: '8px',
                  border: '1px solid #1f2937',
                  backgroundColor: '#07090e',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setIsEyeHovered(true)}
                onMouseLeave={() => setIsEyeHovered(false)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isEyeHovered ? '#f8fafc' : '#64748b',
                  padding: '4px',
                  outline: 'none',
                  transition: 'color 0.2s ease'
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              marginTop: '10px',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

      </div>
    </div>
  );
}
