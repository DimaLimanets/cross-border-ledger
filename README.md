# 🌐 Cross-Border Fintech Ledger
> High-performance multi-currency ledger streaming engine with automated document compilation, native vector visualizations, and immutable database audit logs.

An enterprise-grade, full-stack monorepo workspace architecture combining a highly efficient **Go (Golang)** financial analytics routing engine with a reactive **Next.js 14 (App Router)** client dashboard panel. Operates on real-time market data across open network channels.

---

## 🏗️ Core Architecture Overview

```text
cross-border-ledger/ (Monorepo Workspace)
├── backend/                  # Golang 1.26.5 Gin Microservice 
│   ├── src/
│   │   ├── services/         # FX Market Ingestion, FPDF Worker Engines
│   │   └── workers/          # Automated Compliance Cron Tasks
│   ├── .env                  # Remote Neon Cloud DB Secret Routing Targets
│   └── main.go               # Token Gateways, Gorilla Socket Broadcasters
└── frontend/                 # Next.js 14 Enterprise Portal Engine
    ├── src/
    │   ├── app/
    │   │   └── analytics/    # Server Components fetching from Port 8080
    │   └── components/       # Persistent Theme Swappers, Optimistic UI Grids
    └── tailwind.config.js    # Specialized 'class' darkMode variant overrides
```

### 🛠️ Production Tech Stack
*   **Backend Infrastructure**: Go 1.26.5, Gin-Gonic Router, Viper Config Engine, Gorilla WebSockets, `lib/pq` PostgreSQL Driver, `go-pdf/fpdf` compilation engine.
*   **Frontend Core**: Next.js 14 (App Router, Server Components), TypeScript, Tailwind CSS, PostCSS, Lucide-React.
*   **Cloud Persistence**: Neon Cloud Serverless PostgreSQL Engine (Active multi-tenant schema with composite performance indexing).
*   **External Integration**: ExchangeRate-API (v6) secure live FX spot market router.

---

## 📊 13-Week Engineering Sprint Progress Rollout

### 📈 Phase 1: Core Document Compilation (Weeks 1 - 4)
*   Initialized high-performance Go backend structures.
*   Implemented automated itemized accounting calculations with exact float precision constraints.
*   Built real-time PDF generation engine utilizing `fpdf` streaming binary headers securely over raw HTTP.

### 💻 Phase 2: Client Interface Routing & CORS Gateways (Weeks 5 - 6)
*   Scaffolded Next.js 14 App Router portal layout inside multi-root Windows workspace partitions.
*   Injected native Tailwind CSS utility borders for smooth dark/light mode responsive transitions.
*   Authored secure Go `CORSMiddleware` intercept rule blocks to handle cross-origin pipeline transactions safely across ports 3000 and 8080.

### ☁️ Phase 3: Live Cloud Integrations & State Hydration (Weeks 7 - 9)
*   Linked pipeline configurations directly to remote Serverless Neon Cloud PostgreSQL data instances.
*   Upgraded `GET /api/invoices/download` to match tracking query string parameters, pull database snapshots, and calculate spot rate values.
*   Swapped out hardcoded FX fallbacks for live, external multi-currency API queries.
*   Created interactive Next.js overlay Form Modals executing parameterized database writes.

### 📉 Phase 4: Analytics Tickers & Dynamic Chart Processing (Weeks 10 - 12)
*   Engineered optimized, single-pass database CTE grouping query calculations in Go.
*   Installed composite time-series indexing criteria (`created_at DESC`, `status`, `currency`, `amount`) to drop table sweep query intervals under 10ms.
*   Replaced heavy Canvas graphing libraries with lightweight, ultra-performant dynamic HTML5 SVG area trend charts.
*   Implemented client-side optimistic array list injection combined with background server `router.refresh()` cycles to bypass text network layout latency.

### 🛡️ Phase 5: Gated Security, Live WebSockets, & Auditing (Week 13)
*   Hardened the backend cluster via a cryptographic Token Gateway Authorization Middleware intercepting secure database changes.
*   Built a continuous **Gorilla WebSocket broadcast stream** broadcasting live real-time currency tick updates to the client window every 4 seconds.
*   Deployed an **Immutable Write-Through Audit Logging system** powered by Neon `uuid-ossp` extensions, recording lifecycle histories for every database transaction.

---

## 🛡️ Enterprise Performance & Compliance Seals

### ⚡ 1. Single-Pass High-Speed Aggregations
To prevent computing multi-currency totals through slow loops on the server layer, the platform pushes work to the PostgreSQL engine using single-pass Common Table Expressions (CTEs):
```sql
CREATE INDEX idx_invoices_analytics_composite 
ON invoices (created_at DESC, status, currency, amount);
```
This multi-column arrangement minimizes CPU search cycles by grouping transaction rows directly on the database disk prior to scanning data.

### 🧪 2. Cryptographic Security Token Verification Gateway
Routes that perform alterations on the financial ledger lines are securely gated behind a cryptographic Bearer verification gate, intercepting malicious or anonymous connection injections:
```text
Inbound Client Request ──► [Bearer Token Gate] ──► [Write-Through Audit] ──► Neon PostgreSQL DB
```

### 🔒 3. Idempotent Data Persistence Layout
Baseline table records are initialized using conditional constraints (`ON CONFLICT DO NOTHING`) ensuring that wake-up scripts can verify database access blocks without wiping out user invoices.

---

## 🚀 Setup & Execution Protocol

### 1. Configure Local Environment File (`backend/.env`)
```env
PORT=8080
DATABASE_URL=postgres://[user]:[password]@[host]/neondb?sslmode=require
FX_API_KEY=your_exchangerate_api_v6_key_here
```

### 2. Boot up the Go Microservice
```bash
cd backend
go get ://github.com
go run main.go
```

### 3. Launch the Next.js Client Interface Portal
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000/analytics`** inside your web browser.

---
*Document compiled and verified successfully on July 28, 2026.*
