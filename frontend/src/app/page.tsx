'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart2,
  TrendingUp,
  Users,
  Activity,
  ArrowRight,
  ChevronRight,
  Briefcase,
  LineChart,
  LayoutDashboard,
  SlidersHorizontal,
  CheckCircle,
} from 'lucide-react';
import './landing.css';

/* ─────────────────────────────────────────────
   Inline Dashboard Preview (terminal)
───────────────────────────────────────────── */
const DashboardPreview: React.FC = () => {
  const positions = [
    { ticker: 'RELIANCE', pct: '+8.4%', pos: true },
    { ticker: 'TCS', pct: '+5.2%', pos: true },
    { ticker: 'HDFCBANK', pct: '+2.9%', pos: true },
    { ticker: 'INFY', pct: '-1.3%', pos: false },
    { ticker: 'WIPRO', pct: '-3.1%', pos: false },
  ];

  const linePoints = '0,52 40,44 80,38 120,42 160,28 200,24 240,30 280,18 320,22';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div className="lp-preview-header">
        <div className="lp-preview-dots">
          <div className="lp-preview-dot" style={{ background: '#EF4444' }} />
          <div className="lp-preview-dot" style={{ background: '#F59E0B' }} />
          <div className="lp-preview-dot" style={{ background: '#10B981' }} />
        </div>
        <div className="lp-preview-url">
          <span>shreeassociates.in/terminal</span>
        </div>
      </div>

      <div className="lp-preview-body">
        <div className="lp-preview-sidebar">
          <div className="lp-preview-sidebar-item active">
            <LayoutDashboard size={16} /> Dashboard
          </div>
          <div className="lp-preview-sidebar-item">
            <Briefcase size={16} /> Portfolio
          </div>
          <div className="lp-preview-sidebar-item">
            <Activity size={16} /> Positions
          </div>
          <div className="lp-preview-sidebar-item">
            <Users size={16} /> Investors
          </div>
        </div>

        <div className="lp-preview-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>Total Portfolio Value</div>
              <div style={{ fontSize: '32px', color: '#0F172A', fontWeight: 800 }}>₹1.24 Cr</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#DCFCE7', color: '#166534', padding: '6px 12px', borderRadius: '100px', fontSize: '14px', fontWeight: 600 }}>
              <TrendingUp size={16} /> +12.4%
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Chart Area */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>Performance (YTD)</div>
              <svg viewBox="0 0 320 60" preserveAspectRatio="none" style={{ width: '100%', height: '140px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="lp-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`0,60 ${linePoints} 320,60`} fill="url(#lp-grad)" />
                <polyline points={linePoints} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="320" cy="22" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>

            {/* Positions */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>Top Movers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {positions.slice(0,4).map((p) => (
                  <div key={p.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{p.ticker}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: p.pos ? '#10B981' : '#EF4444' }}>{p.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
   MAIN PAGE
───────────────────────────────────────────── */
export default function IndexPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useScrollReveal();

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && token) {
      router.replace('/open');
    }
  }, [token, loading, router]);

  // Navbar scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // While loading auth, show minimal splash
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/shree_logo_full.png" alt="Shree Associates" width="160" style={{ objectFit: 'contain' }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginTop: 12 }}>Loading...</div>
        </div>
      </div>
    );
  }

  // If authenticated, show nothing (redirect happens above)
  if (token) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* Navbar */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/shree_logo_full.png" alt="Shree Associates" width="180" style={{ objectFit: 'contain' }} />
        </div>
        <div className="lp-nav-actions">
          <Link href="/login" className="lp-btn-ghost">Login</Link>
          <Link href="/login" className="lp-btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Enter Terminal <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-container">
          <h1 className="lp-hero-headline lp-reveal lp-delay-1">
            Manage Your Portfolio.<br />
            <span>With Clarity.</span>
          </h1>
          <p className="lp-hero-subtitle lp-reveal lp-delay-2">
            Track portfolios, positions, investors, and performance from one intelligent workspace.
          </p>
          <div className="lp-hero-ctas lp-reveal lp-delay-3">
            <Link href="/login" className="lp-btn-primary lp-btn-primary-lg">
              Enter Terminal <ArrowRight size={16} />
            </Link>
            <a href="#capabilities" className="lp-btn-outline" style={{ padding: '14px 28px', fontSize: '15px' }}>
              Explore Platform
            </a>
          </div>

          <div className="lp-preview-wrapper lp-reveal lp-delay-4">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="capabilities" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <h2 className="lp-section-title">Core Capabilities</h2>
            <p className="lp-section-desc">Designed for precision and clarity across your entire investment workflow.</p>
          </div>

          <div className="lp-cap-grid">
            {[
              {
                icon: Briefcase,
                title: 'Portfolio Management',
                desc: 'See portfolio value, allocation, and performance in one clear view.'
              },
              {
                icon: SlidersHorizontal,
                title: 'Position Management',
                desc: 'Track active and closed positions with entry, value, and P&L.'
              },
              {
                icon: LineChart,
                title: 'Performance Tracking',
                desc: 'Understand how your portfolio is performing over time.'
              },
              {
                icon: Users,
                title: 'Investor Management',
                desc: 'Keep investor-level activity and portfolio information organized.'
              }
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`lp-cap-card lp-reveal lp-delay-${i + 1}`}>
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

      {/* Product Showcase */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-showcase-split">
            <div className="lp-showcase-visual lp-reveal">
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Open Positions</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0', marginBottom: '12px', fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>
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
                <div key={row.ticker} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{row.ticker}</div>
                  <div style={{ fontSize: '14px', color: '#475569', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.qty}</div>
                  <div style={{ fontSize: '14px', color: '#1E293B', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{row.value}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: row.pos ? '#10B981' : '#EF4444', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.pct}</div>
                </div>
              ))}
            </div>

            <div className="lp-showcase-content lp-reveal lp-delay-2">
              <h3>See the portfolio clearly.</h3>
              <p>Every position, every investor, every trade — organized into one precise view designed for professional management.</p>
              
              <div className="lp-feature-list">
                <div className="lp-feature-item">
                  <div className="lp-feature-icon"><CheckCircle size={18} /></div>
                  <div>
                    <div className="lp-feature-title">Real-time visibility</div>
                    <div className="lp-feature-desc">Monitor important portfolio changes from one place without switching between spreadsheets.</div>
                  </div>
                </div>
                <div className="lp-feature-item">
                  <div className="lp-feature-icon"><CheckCircle size={18} /></div>
                  <div>
                    <div className="lp-feature-title">Clear performance</div>
                    <div className="lp-feature-desc">Understand gains, losses, and active positions quickly with clean numerical presentation.</div>
                  </div>
                </div>
                <div className="lp-feature-item">
                  <div className="lp-feature-icon"><CheckCircle size={18} /></div>
                  <div>
                    <div className="lp-feature-title">Centralized management</div>
                    <div className="lp-feature-desc">Keep portfolio and investor activity organized with structured, filtered views across all accounts.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="lp-cta-section lp-section-alt">
        <div className="lp-container lp-reveal">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>
            Get Started <ChevronRight size={14} />
          </div>
          <h2 className="lp-cta-title">Your portfolio.<br />One clear terminal.</h2>
          <p className="lp-cta-desc">Bring portfolio monitoring, position management, and performance insights together in one organized workspace.</p>
          <Link href="/login" className="lp-btn-primary lp-btn-primary-lg">
            Enter Terminal <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-content">
            <div>
              <img src="/shree_logo_full.png" alt="Shree Associates" width="160" style={{ objectFit: 'contain', filter: 'grayscale(100%) opacity(70%)', marginBottom: '12px' }} />
              <div className="lp-footer-copy">
                &copy; {currentYear} Shree Associates. Trade & Portfolio Management.
              </div>
            </div>
            
            <div className="lp-footer-links">
              <Link href="/dashboard" className="lp-footer-link">Dashboard</Link>
              <Link href="/portfolio" className="lp-footer-link">Portfolio</Link>
              <Link href="/open" className="lp-footer-link">Open Positions</Link>
              <Link href="/closed" className="lp-footer-link">Closed Positions</Link>
              <Link href="/investors" className="lp-footer-link">Investors</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
