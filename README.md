# Trade Management & Portfolio Analytics Platform
*Prepared for Shree Associates*

An institutional-grade trade management and portfolio analytics platform designed for high-precision portfolio tracking, Excel-like inline trade management, real-time market data failover, and executive analytics without visual clutter.

![Trade Management Platform Banner](frontend/public/logo.svg)

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

### 1. Environment Configuration

Copy the provided template `.env.example` files to create local `.env` configuration files for both backend and frontend:

```bash
# Backend environment setup
cp backend/.env.example backend/.env

# Frontend environment setup
cp frontend/.env.example frontend/.env
```

### 2. Backend Setup (`backend`)
```bash
cd backend
npm install
npx prisma db push
npm run start:dev
```
Backend server runs on `http://localhost:3001`.

### 3. Initial Account Initialization
Initial Owner account email and password can be configured securely in `backend/.env` using `OWNER_EMAIL` and `OWNER_PASSWORD`. If not explicitly set, default sandbox credentials will be seeded automatically for initial local development.

### 4. Frontend Setup (`frontend`)
```bash
cd frontend
npm install
npm run dev
```
Frontend application runs on `http://localhost:3000`.

---

## 🔒 Security Best Practices

- Real credentials, passwords, database connections, and API keys are stored exclusively in environment variables (`.env`) and are excluded from git tracking.
- Use `.env.example` as a template for local environment configuration.

---

## ⚠️ Database Migration Warning

**Do not delete dev.db before migration. Existing data must be preserved. Inspect the current SQLite database, migrate required existing data to PostgreSQL, verify the migration, and only then remove SQLite dependency.**

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for details.
