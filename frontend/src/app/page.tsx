'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  Activity,
  ArrowRight,
  Briefcase,
  SlidersHorizontal,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  LandingPortfolioPerformance,
  LandingSectorAllocation,
  LandingTopHoldingsVisual,
} from '@/components/LandingVisualizations';
import './landing.css';

const tickerItems = [
  ['RELIANCE.NS', '₹1,313.20', '+1.42%', 'up'],
  ['HDFCBANK.NS', '₹725.05', '+0.85%', 'up'],
  ['TCS.NS', '₹2,298.00', '-0.42%', 'down'],
  ['INFY.NS', '₹1,130.00', '+1.15%', 'up'],
  ['NIFTY 50', '24,850.10', '+0.64%', 'up'],
];

/* ─────────────────────────────────────────────
   SHREE ASSOCIATES Interactive Product Terminal Preview
───────────────────────────────────────────── */
const TerminalPreview: React.FC = () => {
  return (
    <div className="terminal-frame">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="terminal-dot" style={{ background: '#ef4444' }} />
          <span className="terminal-dot" style={{ background: '#f59e0b' }} />
          <span className="terminal-dot" style={{ background: '#10b981' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#64748b' }}>
          shree_terminal_v2.1 <span style={{ color: '#334155' }}>•</span> LIVE MARKET FEED
        </span>
        <span style={{
          borderRadius: '100px', border: '1px solid rgba(16,185,129,0.3)',
          background: 'rgba(16,185,129,0.1)', padding: '2px 8px',
          fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#10b981'
        }}>
          SYSTEM NOMINAL
        </span>
      </div>

      <div style={{ background: '#0d121f' }}>
        <LandingPortfolioPerformance isTerminal={true} />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Scroll reveal hook
───────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

/* ─────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────── */
export default function IndexPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useScrollReveal();

  useEffect(() => {
    if (!loading && token) {
      router.replace('/open');
    }
  }, [token, loading, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#07090e' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="lp-nav-logo-container">
            <img src="/shree_logo_full.png" alt="Shree Associates" className="lp-logo-img" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginTop: 16 }}>Loading terminal...</div>
        </div>
      </div>
    );
  }

  if (token) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ overflowX: 'hidden', background: '#07090e', color: '#f8fafc' }}>
      {/* NAVBAR */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="lp-nav-logo-container">
            <img src="/shree_logo_full.png" alt="Shree Associates" className="lp-logo-img" />
          </div>
        </div>
        <div className="lp-nav-actions">
          <Link href="/login" className="lp-btn-ghost">Login</Link>
          <Link href="/login" className="lp-btn-primary lp-nav-btn">
            Enter Terminal <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* LIVE MARKET TICKER BAR */}
      <div className="ticker-bar">
        <div className="section-shell flex items-center justify-between">
          <div className="ticker-track">
            {[...tickerItems, ...tickerItems].map(([symbol, price, change, dir], i) => (
              <span key={`${symbol}-${i}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#64748b' }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{symbol}</span> {price}{' '}
                <span style={{ color: dir === 'up' ? '#10b981' : '#ef4444' }}>{change}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="eyebrow" style={{ margin: '0 auto 16px auto' }}>
            <Sparkles size={12} /> TRADE &amp; PORTFOLIO MANAGEMENT WORKSPACE
          </div>
          
          <h1 className="lp-hero-headline">
            Precision portfolio management.<br />
            <span>Institutional clarity.</span>
          </h1>
          
          <p className="lp-hero-subtitle">
            Track portfolios, open positions, closed trades, and live market valuations from one professional client-ready terminal.
          </p>
          
          <div className="lp-hero-ctas">
            <Link href="/login" className="lp-btn-primary lp-btn-primary-lg">
              Enter Terminal <ArrowRight size={16} />
            </Link>
            <a href="#analytics-showcase" className="lp-btn-outline">
              Explore Visualizations
            </a>
          </div>

          <div style={{ marginTop: '32px' }}>
            <TerminalPreview />
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES */}
      <section id="capabilities" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="eyebrow" style={{ margin: '0 auto 12px auto' }}>CORE CAPABILITIES</div>
            <h2 className="lp-section-title">Designed for modern investment workflows</h2>
            <p className="lp-section-desc">Clean numerical visibility, structured position tracking, and real-time market data integrated into one platform.</p>
          </div>

          <div className="lp-cap-grid">
            {[
              {
                icon: Briefcase,
                title: 'Portfolio Management',
                desc: 'Complete overview of capital deployed, available cash, and overall portfolio performance.'
              },
              {
                icon: SlidersHorizontal,
                title: 'Position Tracking',
                desc: 'Monitor active and closed positions with precise buy price, target, stop loss, and live P&L.'
              },
              {
                icon: Activity,
                title: 'Live Market Updates',
                desc: 'Real-time market price integration providing accurate live valuation across all positions.'
              }
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="lp-cap-card">
                <div className="lp-cap-icon">
                  <Icon size={20} />
                </div>
                <h3 className="lp-cap-title">{title}</h3>
                <p className="lp-cap-text">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINANCIAL VISUALIZATIONS SHOWCASE */}
      <section id="analytics-showcase" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="eyebrow" style={{ margin: '0 auto 12px auto' }}>VISUAL INTELLIGENCE PREVIEW</div>
            <h2 className="lp-section-title">Portfolio analytics &amp; asset weighting</h2>
            <p className="lp-section-desc">Institutional-grade charts adapted for portfolio performance monitoring and capital allocation overview.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <LandingSectorAllocation />
            <LandingTopHoldingsVisual />
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION */}
      <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-showcase-split">
            <div className="lp-showcase-visual">
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
                ACTIVE HOLDINGS PREVIEW
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid #1f2937', marginBottom: '10px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                <div>Instrument</div>
                <div style={{ textAlign: 'right' }}>Qty</div>
                <div style={{ textAlign: 'right' }}>Value</div>
                <div style={{ textAlign: 'right' }}>Return</div>
              </div>

              {[
                { ticker: 'RELIANCE', qty: '1,200', value: '₹34,12,240', pct: '+8.4%', pos: true },
                { ticker: 'TCS', qty: '450', value: '₹18,89,900', pct: '+5.2%', pos: true },
                { ticker: 'HDFCBANK', qty: '2,000', value: '₹30,04,400', pct: '+2.9%', pos: true },
                { ticker: 'INFY', qty: '800', value: '₹14,47,520', pct: '-1.3%', pos: false },
              ].map((row) => (
                <div key={row.ticker} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{row.ticker}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{row.qty}</div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.value}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: row.pos ? '#10b981' : '#ef4444', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{row.pct}</div>
                </div>
              ))}
            </div>

            <div className="lp-showcase-content">
              <h3>See your portfolio clearly.</h3>
              <p>Every position, every investor account, every trade — organized into one precise view designed for professional management.</p>
              
              <div className="lp-feature-list">
                <div className="lp-feature-item">
                  <div className="lp-feature-icon"><CheckCircle size={18} /></div>
                  <div>
                    <div className="lp-feature-title">Real-time Visibility</div>
                    <div className="lp-feature-desc">Monitor portfolio changes instantly from one central dashboard.</div>
                  </div>
                </div>
                <div className="lp-feature-item">
                  <div className="lp-feature-icon"><CheckCircle size={18} /></div>
                  <div>
                    <div className="lp-feature-title">Role-Based Access</div>
                    <div className="lp-feature-desc">Secure access control ensuring clients view read-only portfolio updates while owners retain management control.</div>
                  </div>
                </div>
                <div className="lp-feature-item">
                  <div className="lp-feature-icon"><CheckCircle size={18} /></div>
                  <div>
                    <div className="lp-feature-title">Centralized Control</div>
                    <div className="lp-feature-desc">Keep open and closed positions structured with search, filtering, and export tools.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="lp-cta-section">
        <div className="lp-container">
          <div className="eyebrow" style={{ margin: '0 auto 16px auto' }}>GET STARTED</div>
          <h2 className="lp-cta-title">Your portfolio.<br />One clear terminal.</h2>
          <p className="lp-cta-desc">Bring portfolio monitoring, position management, and live market insights together in one organized workspace.</p>
          <Link href="/login" className="lp-btn-primary lp-btn-primary-lg">
            Enter Terminal <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-content">
            <div>
              <div className="lp-nav-logo-container" style={{ marginBottom: '12px' }}>
                <img src="/shree_logo_full.png" alt="Shree Associates" className="lp-logo-img" />
              </div>
              <div className="lp-footer-copy">
                &copy; {currentYear} Shree Associates. Trade &amp; Portfolio Management.
              </div>
            </div>
            
            <div className="lp-footer-links">
              <Link href="/dashboard" className="lp-footer-link">Dashboard</Link>
              <Link href="/portfolio" className="lp-footer-link">Portfolio</Link>
              <Link href="/open" className="lp-footer-link">Open Positions</Link>
              <Link href="/closed" className="lp-footer-link">Closed Positions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
