# SHREE ASSOCIATES – Professional Trade Management & Portfolio Analytics Platform

An institutional-grade trade management and portfolio analytics platform designed for high-precision portfolio tracking, Excel-like inline trade management, real-time market data failover, and executive analytics without visual clutter.

![SHREE ASSOCIATES Banner](frontend/public/logo.svg)

## 🌟 Key Features

- **Executive Summary Dashboard (`/dashboard`)**: High-level Bloomberg Terminal style executive homepage with 4 card clusters (Portfolio, Trading, Risk, Market) and summary tables.
- **Excel-like Open Positions Management (`/open`)**: Single-click select, double-click inline cell editing, Tab key navigation, Enter save, Escape cancel, and target/stop proximity metrics (`Target Rem.`, `Stop Rem.`).
- **Closed Positions History (`/closed`)**: Trade duration badges (`⏱️ X Days`), realized P&L, win rate analytics, CSV export, and deletion controls.
- **Valuation & Analytics Portfolio (`/portfolio`)**: 14 valuation KPI cards + breakdown cards (Movers, Top Gainers, Top Losers, Largest Positions).
- **Market Provider Abstraction Layer**: Resilient failover cascade across Twelve Data (Primary), Alpha Vantage, and Yahoo Finance providers with robust symbol normalization.
- **Header Market Ticker & Instant Global Search**: Real-time NIFTY 50 and SENSEX tickers, live digital clock, configurable auto-refresh interval (OFF, 30s, 60s, 5m), and instant search.
- **Collapsible Sidebar & Dark/Light System**: 260px ↔ 80px smooth sidebar collapse with `localStorage` memory and Theme Provider.
- **Owner & Client Role Guards**: Role-based access control where Client accounts have read-only protection.

---

## 🏗️ Repository Structure

```
trade-management-platform/
├── frontend/     # Next.js 14 + React 18 + TailwindCSS + Theme System
└── backend/      # NestJS 10 + TypeScript + Prisma ORM + Market Engine
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js >= 18.x
- npm / yarn / pnpm

### 2. Backend Setup (`backend`)
```bash
cd backend
npm install
npx prisma db push
npm run start:dev
```
Backend server runs on `http://localhost:3001`.

### 3. Frontend Setup (`frontend`)
```bash
cd frontend
npm install
npm run dev
```
Frontend application runs on `http://localhost:3000`.

---

## 🔐 Credentials

- **Default Owner Account**: `owner@shree.com` / `shree123`

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for details.
