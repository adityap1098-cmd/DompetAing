# DompetAing

Aplikasi pencatatan keuangan pribadi berbasis web (mobile-first PWA) dengan auto-sync Gmail.

## Quick Start

### 1. Copy env
```bash
cp .env.example .env
# Edit .env dengan Google OAuth credentials & session secret
```

### 2. Start database
```bash
docker-compose up postgres -d
```

### 3. Run migration + generate Prisma
```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start dev servers
```bash
# Dari root monorepo
npm run dev
```

API: http://localhost:3001/v1
Web: http://localhost:5173

## Google OAuth Setup

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable "Google+ API" dan "Gmail API"
3. OAuth 2.0 Credentials → Web application
4. Authorized redirect URIs: `http://localhost:3001/v1/auth/google/callback`
5. Copy Client ID & Secret ke `.env`

## M001 Acceptance Criteria — Status

- [x] Monorepo Turborepo setup
- [x] Prisma schema (semua models) + migration-ready
- [x] Hono API server + Google OAuth flow (arctic)
- [x] Auto-create Subscription trial=30 hari saat register
- [x] Default categories seeded saat register
- [x] Session cookie (signed, httpOnly)
- [x] React app + React Router 6 + Tanstack Query 5
- [x] AppShell (mobile layout + bottom nav 5 tab)
- [x] Login page (Google OAuth button)
- [x] Onboarding slides (4 slides + dots + skip)
- [x] Dashboard empty state (net worth, income/expense, budget, transactions, debt)
- [x] Theme toggle light/dark (Zustand persist)
- [x] TrialBanner component ("Trial Premium — sisa X hari")
- [x] PremiumGate component (wrapper feature gating)
- [x] Docker Compose (postgres + api + web)
- [x] PWA manifest + service worker

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18 (Vite) + Tailwind CSS 3 + React Router 6 + Tanstack Query 5 |
| Backend | Hono (Node.js) + Prisma ORM |
| Database | PostgreSQL 16 |
| Auth | Google OAuth 2.0 (arctic) |
| Deploy | Docker Compose |
| Monorepo | Turborepo |
