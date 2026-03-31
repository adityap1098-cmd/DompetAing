# DompetAing — Plan.md
## Aplikasi Pencatatan Keuangan Pribadi

> **Versi**: 1.0.0
> **Tanggal**: 29 Maret 2026
> **Author**: Adit
> **Status**: Ready for Implementation

---

## 1. OVERVIEW

### 1.1 Deskripsi
DompetAing adalah aplikasi pencatatan keuangan pribadi berbasis web (mobile-first PWA) dengan fitur auto-sync transaksi dari email bank via Gmail API. Target user: semua orang Indonesia yang ingin mencatat keuangan tanpa ribet.

### 1.2 Tech Stack
| Layer | Stack | Alasan |
|-------|-------|--------|
| Frontend | React 18 (Vite) + Tailwind CSS 3 + React Router 6 + Tanstack Query 5 | SPA mobile-first, PWA-ready, cepat |
| Backend | Hono (Node.js) + Prisma ORM | Ringan, type-safe, modern |
| Database | PostgreSQL 16 | Relational integrity, transactions, computed columns |
| Auth | Google OAuth 2.0 (via `arctic` library) | Satu auth untuk login + Gmail sync |
| Gmail Sync | Google Gmail API v1 | Baca email notifikasi bank |
| Deploy | VPS (Docker Compose: nginx + node + postgres) | Full control, satu server |
| Monorepo | Turborepo (`apps/web`, `apps/api`, `packages/shared`) | Shared types antara FE & BE |

### 1.3 Design System
| Token | Value |
|-------|-------|
| Font Primary | Plus Jakarta Sans (400, 500, 600, 700, 800) |
| Font Mono | DM Mono (400, 500) |
| Accent | `#2E7D5A` (light) / `#4CAF7A` (dark) |
| Income color | `#1E8A5A` (light) / `#4CAF7A` (dark) |
| Expense color | `#C94A1C` (light) / `#E87340` (dark) |
| Border radius | Cards: 14px, Buttons: 12px, Chips: 8px, Phone shell: 34px |

---

## 2. DATA MODEL (Prisma Schema)

### 2.1 Core Principle: Single Source of Truth
Semua nominal yang "tampil" di UI adalah **computed dari transaksi**. Tidak ada field saldo yang di-maintain manual. Ini menjamin konsistensi data.

- `Account.balance` → **COMPUTED**: SUM semua transaksi di akun tersebut + saldo awal
- `Budget.spent` → **COMPUTED**: SUM transaksi pengeluaran di kategori & periode tersebut
- `Debt.is_paid` → Saat ditandai lunas, otomatis buat transaksi pengeluaran/pemasukan

```prisma
// ══════════════════════════════════════
// prisma/schema.prisma
// ══════════════════════════════════════

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── USER ──
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  name           String
  avatar_url     String?
  google_id      String   @unique
  // Google OAuth tokens untuk Gmail API
  access_token   String?
  refresh_token  String?
  token_expiry   DateTime?
  // Preferences
  currency       String   @default("IDR")
  locale         String   @default("id")
  theme          String   @default("light") // "light" | "dark"
  color_scheme   String   @default("sage_green")
  pin_hash       String?  // untuk app lock
  hide_balance   Boolean  @default(false)
  // Notification preferences
  notif_budget_threshold  Int     @default(80) // alert saat x% terpakai
  notif_weekly_report     Boolean @default(true)
  notif_transaction       Boolean @default(false)
  notif_debt_reminder     Boolean @default(true)
  // Gmail sync preferences
  gmail_connected    Boolean @default(false)
  gmail_auto_sync    Boolean @default(true)
  gmail_sync_interval Int    @default(15) // menit
  gmail_auto_categorize Boolean @default(true)
  gmail_review_before_save Boolean @default(true)
  gmail_last_sync    DateTime?
  gmail_last_history_id String? // Gmail API history ID untuk incremental sync
  // Timestamps
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  // Relations
  accounts       Account[]
  categories     Category[]
  transactions   Transaction[]
  budgets        Budget[]
  debts          Debt[]
  recurring      RecurringTransaction[]
  gmail_sources  GmailSource[]
  pending_reviews PendingReview[]
  subscription   Subscription?
  payments       Payment[]

  @@map("users")
}

// ── SUBSCRIPTION ──
model Subscription {
  id             String   @id @default(cuid())
  user_id        String   @unique
  // Plan
  plan           String   @default("trial") // "trial" | "free" | "premium"
  // Trial
  trial_start    DateTime @default(now())
  trial_end      DateTime // trial_start + 30 days
  // Premium
  premium_start  DateTime?
  premium_end    DateTime? // null = lifetime / auto-renew active
  // Midtrans
  midtrans_subscription_id String?
  // Status
  is_active      Boolean  @default(true) // false = expired, belum bayar
  auto_renew     Boolean  @default(false)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  user           User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  payments       Payment[]

  @@map("subscriptions")
}

// ── PAYMENT (History pembayaran Midtrans) ──
model Payment {
  id                 String   @id @default(cuid())
  user_id            String
  subscription_id    String
  // Midtrans
  midtrans_order_id  String   @unique
  midtrans_transaction_id String?
  // Amount
  amount             Decimal  @db.Decimal(15, 2)
  currency           String   @default("IDR")
  // Status
  status             String   @default("pending") // "pending" | "paid" | "failed" | "expired" | "refunded"
  payment_method     String?  // "bank_transfer" | "gopay" | "qris" | etc
  paid_at            DateTime?
  // Period yang dibayar
  period_start       DateTime
  period_end         DateTime
  // Metadata
  midtrans_response  String?  @db.Text // JSON raw response
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  user               User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  subscription       Subscription @relation(fields: [subscription_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("payments")
}

// ── ACCOUNT (Rekening Bank / E-Wallet / Cash) ──
model Account {
  id             String   @id @default(cuid())
  user_id        String
  name           String   // "BCA Tabungan"
  type           String   // "bank" | "ewallet" | "cash"
  bank_name      String?  // "BCA", "Mandiri", etc
  account_type   String?  // "tabungan" | "giro" | "deposito"
  last_four      String?  // "8821"
  initial_balance Decimal @default(0) @db.Decimal(15, 2)
  color          String   @default("#2E7D5A")
  icon           String   @default("🏦")
  is_active      Boolean  @default(true)
  sort_order     Int      @default(0)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  user           User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  transactions_from Transaction[] @relation("FromAccount")
  transactions_to   Transaction[] @relation("ToAccount")

  @@map("accounts")
}

// ── CATEGORY ──
model Category {
  id             String   @id @default(cuid())
  user_id        String
  name           String   // "Makanan & Minuman"
  icon           String   // "🍜"
  color          String   // "#D4570B"
  type           String   // "expense" | "income" | "both"
  is_system      Boolean  @default(false) // kategori default, tidak bisa dihapus
  sort_order     Int      @default(0)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  user           User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  sub_categories SubCategory[]
  transactions   Transaction[]
  budgets        Budget[]

  @@unique([user_id, name])
  @@map("categories")
}

// ── SUB-CATEGORY ──
model SubCategory {
  id             String   @id @default(cuid())
  category_id    String
  name           String   // "Kopi", "Sarapan"
  sort_order     Int      @default(0)
  created_at     DateTime @default(now())

  category       Category @relation(fields: [category_id], references: [id], onDelete: Cascade)
  transactions   Transaction[]

  @@unique([category_id, name])
  @@map("sub_categories")
}

// ── TRANSACTION (Core — Single Source of Truth) ──
model Transaction {
  id              String   @id @default(cuid())
  user_id         String
  // Amount: selalu positif. Tipe menentukan arah.
  amount          Decimal  @db.Decimal(15, 2)
  // "expense" | "income" | "transfer"
  type            String
  // Kategorisasi
  category_id     String?
  sub_category_id String?
  // Akun
  account_id      String   // akun utama (sumber pengeluaran / tujuan pemasukan)
  to_account_id   String?  // hanya untuk transfer: akun tujuan
  // Metadata
  description     String   // "Kopi Manual Brew"
  notes           String?  // "V60 Aceh Gayo single origin"
  date            DateTime // tanggal transaksi (bisa beda dari created_at)
  // Source tracking
  source          String   @default("manual") // "manual" | "gmail" | "recurring"
  gmail_message_id String? // referensi ke email asli
  recurring_id    String?  // referensi ke recurring transaction
  // Debt linkage
  debt_id         String?  // jika transaksi ini adalah pelunasan hutang/piutang
  // Status
  is_verified     Boolean  @default(true) // false = dari Gmail, belum di-review
  // Timestamps
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  category        Category? @relation(fields: [category_id], references: [id], onDelete: SetNull)
  sub_category    SubCategory? @relation(fields: [sub_category_id], references: [id], onDelete: SetNull)
  account         Account  @relation("FromAccount", fields: [account_id], references: [id], onDelete: Cascade)
  to_account      Account? @relation("ToAccount", fields: [to_account_id], references: [id])
  debt            Debt?    @relation(fields: [debt_id], references: [id], onDelete: SetNull)

  @@index([user_id, date])
  @@index([user_id, type])
  @@index([user_id, category_id])
  @@index([account_id])
  @@map("transactions")
}

// ── BUDGET ──
model Budget {
  id             String   @id @default(cuid())
  user_id        String
  category_id    String
  amount         Decimal  @db.Decimal(15, 2) // limit budget
  period_type    String   // "monthly" | "weekly" | "custom"
  // Untuk monthly: hanya perlu bulan & tahun
  period_month   Int?     // 1-12
  period_year    Int?
  // Untuk custom
  start_date     DateTime?
  end_date       DateTime?
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  user           User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  category       Category @relation(fields: [category_id], references: [id], onDelete: Cascade)

  @@unique([user_id, category_id, period_type, period_month, period_year])
  @@map("budgets")
}

// ── DEBT (Hutang & Piutang) ──
model Debt {
  id             String   @id @default(cuid())
  user_id        String
  type           String   // "hutang" (gua pinjam) | "piutang" (orang pinjam ke gua)
  person_name    String   // "Andi"
  amount         Decimal  @db.Decimal(15, 2)
  description    String?  // "Pinjam modal stok"
  borrow_date    DateTime
  due_date       DateTime?
  is_paid        Boolean  @default(false)
  paid_at        DateTime?
  // Apakah saat lunas otomatis catat sebagai transaksi
  auto_record    Boolean  @default(true)
  // Reminder
  reminder_enabled Boolean @default(true)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  user           User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  transactions   Transaction[] // transaksi pelunasan

  @@index([user_id, is_paid])
  @@map("debts")
}

// ── RECURRING TRANSACTION ──
model RecurringTransaction {
  id              String   @id @default(cuid())
  user_id         String
  description     String   // "Kopi Harian"
  amount          Decimal  @db.Decimal(15, 2)
  type            String   // "expense" | "income"
  category_id     String?
  sub_category_id String?
  account_id      String
  // Schedule
  frequency       String   // "daily" | "weekly" | "monthly" | "yearly"
  day_of_week     Int?     // 0-6 (untuk weekly, 0=Minggu)
  day_of_month    Int?     // 1-31 (untuk monthly)
  // Active days (untuk daily, misal Senin-Jumat)
  active_days     String?  // JSON array: [1,2,3,4,5]
  // State
  is_active       Boolean  @default(true)
  next_run        DateTime
  last_run        DateTime?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("recurring_transactions")
}

// ── GMAIL SOURCE (Bank email yang terdeteksi) ──
model GmailSource {
  id             String   @id @default(cuid())
  user_id        String
  bank_name      String   // "BCA"
  sender_email   String   // "ebanking@bca.co.id"
  sender_pattern String?  // regex pattern untuk match
  is_active      Boolean  @default(true)
  total_detected Int      @default(0)
  created_at     DateTime @default(now())

  user           User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, sender_email])
  @@map("gmail_sources")
}

// ── PENDING REVIEW (Transaksi dari Gmail yang belum di-approve) ──
model PendingReview {
  id              String   @id @default(cuid())
  user_id         String
  gmail_message_id String
  raw_subject     String
  raw_body        String?
  // Parsed data (AI suggestion)
  parsed_amount   Decimal? @db.Decimal(15, 2)
  parsed_merchant String?
  parsed_date     DateTime?
  parsed_type     String?  // "expense" | "income"
  suggested_category_id String?
  suggested_sub_category_id String?
  suggested_account_id String?
  // Source
  bank_name       String?
  // Status
  status          String   @default("pending") // "pending" | "approved" | "skipped"
  created_at      DateTime @default(now())

  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, status])
  @@map("pending_reviews")
}
```

### 2.2 Default Categories (Seeder)
Saat user baru register, buat kategori default:

```
expense:
  🍜 Makanan & Minuman → [Sarapan, Kopi, Makan siang, Makan malam, Jajan]
  🛵 Transportasi → [BBM, Servis, Parkir, Tol]
  💻 Teknologi → [Hosting, Domain, SaaS, API]
  🛒 Belanja → [Online, Offline, Kebutuhan]
  🏠 Rumah → [Listrik, Air, Internet, Sewa]
  🎮 Hiburan → [Game, Streaming, Nongkrong]
  💊 Kesehatan → [Obat, Dokter, Gym]

income:
  💼 Bisnis → [Penjualan, Jasa, Komisi]
  💰 Gaji → [Gaji Pokok, Bonus, THR]
  📈 Investasi → [Dividen, Capital Gain]

both:
  🔄 Transfer → []
  📦 Lainnya → []
```

---

## 3. COMPUTED VALUES & CASCADE LOGIC

### 3.1 Account Balance (Saldo Akun)
```
account.balance = account.initial_balance
  + SUM(transactions WHERE account_id = X AND type = 'income')
  - SUM(transactions WHERE account_id = X AND type = 'expense')
  - SUM(transactions WHERE account_id = X AND type = 'transfer')  // keluar
  + SUM(transactions WHERE to_account_id = X AND type = 'transfer')  // masuk
```

**Implementasi**: Database VIEW atau computed di application layer via Prisma query.

```sql
CREATE VIEW account_balances AS
SELECT
  a.id,
  a.user_id,
  a.initial_balance + COALESCE(
    (SELECT SUM(
      CASE
        WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount
        WHEN t.type = 'expense' AND t.account_id = a.id THEN -t.amount
        WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
        WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount
        ELSE 0
      END
    ) FROM transactions t
    WHERE (t.account_id = a.id OR t.to_account_id = a.id)
      AND t.is_verified = true
    ), 0
  ) AS balance
FROM accounts a;
```

### 3.2 Net Worth (Kekayaan Bersih)
```
user.net_worth = SUM(account_balances WHERE user_id = X AND is_active = true)
```

### 3.3 Budget Spent (Terpakai)
```
budget.spent = SUM(transactions
  WHERE user_id = X
    AND category_id = budget.category_id
    AND type = 'expense'
    AND date >= budget.period_start
    AND date <= budget.period_end
    AND is_verified = true
)
budget.remaining = budget.amount - budget.spent
budget.percentage = (budget.spent / budget.amount) * 100
```

### 3.4 Cascade Effects — Apa yang Terjadi Saat:

#### CREATE Transaction (expense)
1. ✅ Insert transaction record
2. 🔄 Account balance berkurang (otomatis via computed)
3. 🔄 Net worth berkurang (otomatis via computed)
4. 🔄 Budget spent bertambah (otomatis via computed)
5. ⚠️ Cek budget threshold → trigger notifikasi jika >= notif_budget_threshold%
6. 🔄 Laporan bulanan ter-update (otomatis via computed)

#### CREATE Transaction (income)
1. ✅ Insert transaction record
2. 🔄 Account balance bertambah
3. 🔄 Net worth bertambah
4. 🔄 Laporan bulanan ter-update

#### CREATE Transaction (transfer)
1. ✅ Insert transaction record (account_id = asal, to_account_id = tujuan)
2. 🔄 Account asal balance berkurang
3. 🔄 Account tujuan balance bertambah
4. 🔄 Net worth TIDAK berubah (transfer antar akun sendiri)

#### UPDATE Transaction (ubah amount/category/account)
1. ✅ Update transaction record
2. 🔄 Semua computed values otomatis recalculate
3. ⚠️ Jika category berubah → budget lama & baru recalculate
4. ⚠️ Jika account berubah → saldo akun lama & baru recalculate

#### DELETE Transaction
1. ✅ Soft delete atau hard delete
2. 🔄 Semua computed values otomatis recalculate
3. ⚠️ Jika linked ke debt → update debt status

#### MARK Debt as Paid (Hutang lunas)
1. ✅ Update debt.is_paid = true, debt.paid_at = now()
2. 🔔 Jika debt.auto_record = true:
   - Hutang (gua pinjam): Buat transaction expense (uang keluar buat bayar)
   - Piutang (orang bayar ke gua): Buat transaction income (uang masuk)
3. 🔄 Account balance berubah via transaksi baru
4. 🔄 Net worth berubah via transaksi baru

#### MARK Debt as Unpaid (Batal lunas)
1. ✅ Update debt.is_paid = false, debt.paid_at = null
2. 🔔 Hapus transaksi linked (debt_id = X)
3. 🔄 Account balance revert

---

## 3.5 SUBSCRIPTION & FEATURE GATING

### Plan Tiers
| | **Trial** (30 hari) | **Free** (setelah trial habis) | **Premium** |
|---|---|---|---|
| Catat transaksi | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Kategori & sub-kategori | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Hutang & Piutang | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Akun bank/e-wallet | ✅ Unlimited | ⚠️ Max 2 | ✅ Unlimited |
| Budget categories | ✅ Unlimited | ⚠️ Max 3 | ✅ Unlimited |
| Gmail Sync | ✅ Full | ❌ Locked | ✅ Full |
| Export (Excel/PDF/CSV) | ✅ Full | ❌ Locked | ✅ Full |
| Laporan & Analitik | ✅ Full | ⚠️ Basic (bulan ini saja) | ✅ Full (trend, tahunan, custom) |
| Recurring transactions | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Theme & warna | ✅ Full | ✅ Full | ✅ Full |

### User Lifecycle
```
Register → plan="trial", trial_end = now + 30 days
  ↓
Trial aktif (30 hari) → semua fitur premium unlocked
  ↓
Trial habis + belum bayar → plan="free", fitur premium locked
  ↓
Bayar via Midtrans → plan="premium", premium_start = now, premium_end = now + 30 days
  ↓
Premium habis + auto_renew OFF → plan="free"
Premium habis + auto_renew ON → Midtrans auto-charge → extend premium_end
```

### Feature Gate Middleware (Backend)
```typescript
// middleware/subscription.ts
type Feature = 
  | "gmail_sync" 
  | "export" 
  | "unlimited_accounts" 
  | "unlimited_budgets" 
  | "full_reports";

function requireFeature(feature: Feature) {
  return async (c, next) => {
    const user = c.get("user");
    const sub = await getSubscription(user.id);
    
    const plan = getEffectivePlan(sub);
    // plan = "trial" (aktif) | "free" | "premium"
    
    if (plan === "trial" || plan === "premium") {
      return next(); // semua fitur unlocked
    }
    
    // plan === "free" → cek per fitur
    if (feature === "gmail_sync" || feature === "export") {
      return c.json({ error: "premium_required", feature }, 403);
    }
    
    if (feature === "unlimited_accounts") {
      const count = await countAccounts(user.id);
      if (count >= 2) return c.json({ error: "limit_reached", limit: 2, feature }, 403);
    }
    
    if (feature === "unlimited_budgets") {
      const count = await countActiveBudgets(user.id);
      if (count >= 3) return c.json({ error: "limit_reached", limit: 3, feature }, 403);
    }
    
    if (feature === "full_reports") {
      // Free user hanya bisa lihat bulan ini
      // Enforce di query: date range max = current month
    }
    
    return next();
  };
}

function getEffectivePlan(sub: Subscription): "trial" | "free" | "premium" {
  if (!sub) return "free";
  
  const now = new Date();
  
  // Trial masih aktif?
  if (sub.plan === "trial" && now <= sub.trial_end) return "trial";
  
  // Premium masih aktif?
  if (sub.plan === "premium" && sub.premium_end && now <= sub.premium_end) return "premium";
  
  // Default: free
  return "free";
}
```

### Frontend Feature Gate
```typescript
// hooks/useSubscription.ts
function useSubscription() {
  const { data } = useQuery(["subscription"], fetchSubscription);
  
  return {
    plan: data?.effective_plan,  // "trial" | "free" | "premium"
    isTrialActive: data?.is_trial_active,
    trialDaysLeft: data?.trial_days_left,
    isPremium: data?.effective_plan === "premium" || data?.effective_plan === "trial",
    canUse: (feature: Feature) => {
      if (data?.effective_plan !== "free") return true;
      // per-feature check
      return FREE_FEATURES.includes(feature);
    },
    limits: {
      maxAccounts: data?.effective_plan === "free" ? 2 : Infinity,
      maxBudgets: data?.effective_plan === "free" ? 3 : Infinity,
    }
  };
}

// Component usage:
// <PremiumGate feature="gmail_sync" fallback={<UpgradePrompt />}>
//   <GmailSyncPage />
// </PremiumGate>
```

### Pricing (Midtrans)
| Plan | Harga | Billing |
|------|-------|---------|
| Premium Bulanan | Rp 29.900/bulan | Auto-renew optional |
| Premium Tahunan | Rp 249.000/tahun (hemat 30%) | Auto-renew optional |

> Harga final bisa di-adjust. Ini placeholder yang masuk akal buat pasar Indonesia.

### Midtrans Integration Flow
```
1. User klik "Upgrade ke Premium"
2. Frontend POST /subscription/checkout
   Body: { plan_type: "monthly" | "yearly" }
3. Backend create Midtrans Snap token
4. Frontend redirect ke Midtrans payment page
5. User bayar (transfer bank, QRIS, GoPay, dll)
6. Midtrans POST webhook ke /subscription/webhook
7. Backend verify signature, update subscription + payment record
8. User redirect back → plan = "premium"
```

---

## 4. API ENDPOINTS

### 4.1 Base URL
```
Production: https://api.dompetaing.{domain}/v1
Development: http://localhost:3001/v1
```

### 4.2 Auth
```
POST   /auth/google           # Initiate Google OAuth
GET    /auth/google/callback   # OAuth callback → set session cookie
POST   /auth/logout            # Clear session
GET    /auth/me                # Get current user + preferences
```

### 4.3 Dashboard (Computed / Aggregated)
```
GET    /dashboard/summary
  Response: {
    net_worth: number,
    net_worth_change: number,        // perubahan bulan ini
    total_income_month: number,      // pemasukan bulan ini
    total_expense_month: number,     // pengeluaran bulan ini
    savings_month: number,           // income - expense bulan ini
    accounts: [{ id, name, type, balance, icon, color }],
    budget_overview: {
      total_budget: number,
      total_spent: number,
      percentage: number
    },
    debt_summary: {
      total_hutang: number,
      total_piutang: number,
      hutang_active: number,
      piutang_active: number,
      nearest_due: { person_name, amount, due_date, type } | null
    },
    recent_transactions: Transaction[5],
    trend_chart: {
      labels: string[],            // ["Jan", "Feb", "Mar"]
      income: number[],
      expense: number[]
    }
  }
```

### 4.4 Accounts
```
GET    /accounts                    # List semua akun + balance
GET    /accounts/:id                # Detail akun + balance + recent txn
POST   /accounts                    # Tambah akun
  Body: { name, type, bank_name?, account_type?, last_four?, initial_balance, color, icon }
PUT    /accounts/:id                # Edit akun
DELETE /accounts/:id                # Hapus akun (cascade: hapus semua transaksi di akun)
PATCH  /accounts/:id/reorder        # Update sort_order
  Body: { sort_order: number }

GET    /accounts/:id/transactions   # Transaksi per akun
  Query: ?page=1&limit=20&month=3&year=2026

GET    /accounts/:id/stats          # Statistik per akun
  Query: ?months=6
  Response: { monthly_flow: [{ month, income, expense }], top_categories: [...] }
```

### 4.5 Transactions
```
GET    /transactions                # List + filter + search + pagination
  Query: ?page=1&limit=20&type=expense&category_id=X&sub_category_id=X
         &account_id=X&search=kopi&date_from=2026-03-01&date_to=2026-03-31
         &amount_min=0&amount_max=1000000&sort=date_desc

GET    /transactions/:id            # Detail transaksi
POST   /transactions                # Tambah transaksi
  Body: {
    amount: number,
    type: "expense" | "income" | "transfer",
    category_id?: string,
    sub_category_id?: string,
    account_id: string,
    to_account_id?: string,        // required jika type = "transfer"
    description: string,
    notes?: string,
    date: string (ISO),
    debt_id?: string               // jika ini pelunasan hutang
  }
  Response: {
    transaction: Transaction,
    effects: {
      account_balance: number,     // saldo akun setelah transaksi
      to_account_balance?: number, // saldo akun tujuan (transfer)
      budget_impact?: {            // jika kena budget
        budget_id: string,
        spent: number,
        limit: number,
        percentage: number,
        alert: boolean             // true jika >= threshold
      }
    }
  }

PUT    /transactions/:id            # Edit transaksi
  Body: (same as POST)
  Response: (same as POST, dengan effects sebelum & sesudah)

DELETE /transactions/:id            # Hapus transaksi
  Response: {
    deleted: true,
    effects: {
      account_balance: number,
      budget_impact?: { ... }
    }
  }

GET    /transactions/search-total   # Total dari filter tertentu
  Query: (same filters as GET /transactions)
  Response: { count: number, total_amount: number }
```

### 4.6 Categories
```
GET    /categories                  # List semua + sub-categories
GET    /categories/:id              # Detail + sub-categories
POST   /categories                  # Tambah kategori
  Body: { name, icon, color, type }
PUT    /categories/:id              # Edit kategori
DELETE /categories/:id              # Hapus (fail jika ada transaksi, kecuali force=true → set null)
  Query: ?force=true

POST   /categories/:id/sub          # Tambah sub-kategori
  Body: { name }
PUT    /categories/:id/sub/:subId   # Edit sub-kategori
DELETE /categories/:id/sub/:subId   # Hapus sub-kategori
PATCH  /categories/reorder          # Reorder categories
  Body: { orders: [{ id, sort_order }] }
```

### 4.7 Budgets
```
GET    /budgets                     # List budget + spent (computed)
  Query: ?month=3&year=2026&period_type=monthly
  Response: {
    total_budget: number,
    total_spent: number,
    percentage: number,
    budgets: [{
      id, category: { id, name, icon, color },
      amount: number,
      spent: number,           // COMPUTED dari transaksi
      remaining: number,       // amount - spent
      percentage: number,      // (spent / amount) * 100
      sub_categories_breakdown: [{
        sub_category: { id, name },
        spent: number,
        transaction_count: number,
        percentage: number
      }]
    }]
  }

GET    /budgets/:id                 # Detail budget + transaksi terkait
  Query: ?month=3&year=2026
  Response: {
    ...budget,
    spent, remaining, percentage,
    sub_breakdown: [...],
    recent_transactions: Transaction[]
  }

POST   /budgets                     # Tambah budget
  Body: { category_id, amount, period_type, period_month?, period_year? }

PUT    /budgets/:id                 # Edit budget (ubah amount)
  Body: { amount }

DELETE /budgets/:id                 # Hapus budget

POST   /budgets/copy-previous       # Copy budget bulan lalu ke bulan ini
  Body: { from_month, from_year, to_month, to_year }
```

### 4.8 Debts (Hutang & Piutang)
```
GET    /debts                       # List semua hutang/piutang
  Query: ?type=hutang|piutang&status=active|paid|all&sort=due_date_asc
  Response: {
    summary: {
      total_hutang: number,
      total_piutang: number,
      hutang_active_count: number,
      piutang_active_count: number,
      overdue_count: number
    },
    debts: [{
      id, type, person_name, amount, description,
      borrow_date, due_date, is_paid, paid_at,
      is_overdue: boolean,      // COMPUTED: due_date < now() && !is_paid
      days_remaining: number    // COMPUTED: due_date - now()
    }]
  }

GET    /debts/:id                   # Detail hutang/piutang
POST   /debts                       # Tambah
  Body: { type, person_name, amount, description?, borrow_date, due_date?, reminder_enabled, auto_record }

PUT    /debts/:id                   # Edit
PATCH  /debts/:id/pay               # Tandai lunas
  Body: {
    auto_record: boolean,          // catat sebagai transaksi?
    account_id?: string            // dari/ke akun mana (jika auto_record)
  }
  Response: {
    debt: Debt,
    transaction?: Transaction      // transaksi yang otomatis dibuat
  }

PATCH  /debts/:id/unpay             # Batal lunas
  Response: {
    debt: Debt,
    deleted_transaction_id?: string
  }

DELETE /debts/:id                   # Hapus
```

### 4.9 Recurring Transactions
```
GET    /recurring                   # List semua recurring
  Response: {
    items: [{
      id, description, amount, type, frequency,
      category: { id, name, icon },
      account: { id, name },
      is_active, next_run, last_run,
      monthly_total: number        // COMPUTED: estimasi per bulan
    }],
    summary: {
      total_expense_monthly: number,
      total_income_monthly: number
    }
  }

POST   /recurring                   # Tambah
  Body: {
    description, amount, type, category_id?, sub_category_id?,
    account_id, frequency, day_of_week?, day_of_month?, active_days?
  }

PUT    /recurring/:id               # Edit
PATCH  /recurring/:id/toggle        # Aktifkan/nonaktifkan
DELETE /recurring/:id               # Hapus
```

### 4.10 Reports & Analytics
```
GET    /reports/monthly             # Laporan bulanan
  Query: ?month=3&year=2026
  Response: {
    period: { month, year },
    income: number,
    expense: number,
    savings: number,
    expense_by_category: [{
      category: { id, name, icon, color },
      amount: number,
      percentage: number,
      transaction_count: number
    }],
    income_by_category: [...],
    daily_breakdown: [{
      date: string,
      income: number,
      expense: number
    }]
  }

GET    /reports/trend               # Tren multi-bulan
  Query: ?months=6
  Response: {
    labels: string[],
    income: number[],
    expense: number[],
    savings: number[]
  }

GET    /reports/yearly              # Laporan tahunan
  Query: ?year=2026
```

### 4.11 Gmail Sync
```
POST   /gmail/connect               # Initiate Gmail OAuth scope
GET    /gmail/callback               # Gmail OAuth callback
POST   /gmail/sync                   # Trigger manual sync
  Response: {
    emails_processed: number,
    transactions_found: number,
    pending_review: number,
    banks_detected: [{ bank_name, sender_email, count }]
  }

GET    /gmail/sources                # List bank email sources
PATCH  /gmail/sources/:id/toggle     # Enable/disable source

GET    /gmail/pending                # List pending reviews
PATCH  /gmail/pending/:id/approve    # Approve → create transaction
  Body: {
    amount: number,                 // bisa di-edit user
    type: string,
    category_id: string,
    sub_category_id?: string,
    account_id: string,
    description: string,
    date: string
  }
PATCH  /gmail/pending/:id/skip       # Skip / dismiss
POST   /gmail/pending/approve-all    # Approve semua yang pending

POST   /gmail/disconnect             # Putuskan koneksi Gmail
GET    /gmail/status                  # Status koneksi + stats
  Response: {
    connected: boolean,
    email: string,
    emails_processed: number,
    transactions_detected: number,
    accuracy: number,
    last_sync: string,
    sources: [...]
  }
```

### 4.12 Settings & Export
```
PUT    /settings/profile             # Update nama, avatar
PUT    /settings/preferences         # Update theme, currency, locale
PUT    /settings/notifications       # Update notif preferences
PUT    /settings/security            # Set/change PIN
  Body: { old_pin?, new_pin }

POST   /export/excel                 # Generate Excel
  Body: { date_from, date_to, include_transactions, include_budgets, include_charts }
  Response: { download_url: string, file_size: number }

POST   /export/pdf                   # Generate PDF
  Body: (same as excel)

POST   /export/csv                   # Generate CSV
  Body: { date_from, date_to }

POST   /import/csv                   # Import dari CSV
  Body: FormData (file)
  Response: { imported: number, skipped: number, errors: [...] }
```

### 4.13 Subscription & Billing
```
GET    /subscription                  # Get current subscription status
  Response: {
    plan: "trial" | "free" | "premium",
    effective_plan: "trial" | "free" | "premium",  // computed
    is_trial_active: boolean,
    trial_start: string,
    trial_end: string,
    trial_days_left: number,          // COMPUTED
    premium_start?: string,
    premium_end?: string,
    premium_days_left?: number,       // COMPUTED
    auto_renew: boolean,
    limits: {
      max_accounts: number | null,    // null = unlimited
      max_budgets: number | null,
      current_accounts: number,
      current_budgets: number
    },
    locked_features: string[]         // ["gmail_sync", "export", "full_reports"] jika free
  }

POST   /subscription/checkout         # Create Midtrans payment
  Body: {
    plan_type: "monthly" | "yearly"
  }
  Response: {
    snap_token: string,               // Midtrans Snap token
    order_id: string,
    amount: number,
    redirect_url: string              // Midtrans payment URL
  }

POST   /subscription/webhook          # Midtrans notification webhook
  Body: (Midtrans notification payload)
  Headers: (Midtrans signature verification)
  → Verify signature
  → Update payment status
  → If paid: activate premium, set premium_end
  → If expired/failed: mark payment failed

GET    /subscription/payments          # Payment history
  Response: {
    payments: [{
      id, order_id, amount, status, payment_method,
      period_start, period_end, paid_at, created_at
    }]
  }

PATCH  /subscription/auto-renew        # Toggle auto-renew
  Body: { auto_renew: boolean }

POST   /subscription/cancel            # Cancel premium (akan expire di premium_end)
```

---

## 5. FOLDER STRUCTURE

```
dompetaing/
├── docker-compose.yml
├── package.json (workspace root)
├── turbo.json
│
├── apps/
│   ├── web/                         # React (Vite) Frontend
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   │   ├── manifest.json        # PWA manifest
│   │   │   ├── sw.js                # Service worker
│   │   │   └── icons/
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx              # Router setup
│   │       ├── lib/
│   │       │   ├── api.ts           # API client (fetch wrapper)
│   │       │   ├── auth.ts          # Auth helpers
│   │       │   ├── format.ts        # Rp formatter, date formatter
│   │       │   └── constants.ts
│   │       ├── hooks/
│   │       │   ├── useAuth.ts
│   │       │   ├── useSubscription.ts     # Plan status, feature gates
│   │       │   ├── useDashboard.ts
│   │       │   ├── useTransactions.ts
│   │       │   ├── useAccounts.ts
│   │       │   ├── useBudgets.ts
│   │       │   ├── useDebts.ts
│   │       │   ├── useRecurring.ts
│   │       │   └── useGmail.ts
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   ├── AppShell.tsx        # Mobile shell + bottom nav
│   │       │   │   ├── BottomNav.tsx
│   │       │   │   ├── Header.tsx
│   │       │   │   ├── PageTransition.tsx
│   │       │   │   └── PremiumGate.tsx     # Feature gate wrapper
│   │       │   ├── ui/
│   │       │   │   ├── Button.tsx
│   │       │   │   ├── Card.tsx
│   │       │   │   ├── Modal.tsx          # Bottom sheet modal
│   │       │   │   ├── Toast.tsx
│   │       │   │   ├── Toggle.tsx
│   │       │   │   ├── Chip.tsx
│   │       │   │   ├── AmountInput.tsx    # Input Rp dengan numpad
│   │       │   │   ├── DatePicker.tsx
│   │       │   │   ├── SearchBar.tsx
│   │       │   │   ├── ConfirmDialog.tsx
│   │       │   │   ├── EmptyState.tsx
│   │       │   │   └── LoadingSkeleton.tsx
│   │       │   ├── transaction/
│   │       │   │   ├── TransactionItem.tsx
│   │       │   │   ├── TransactionList.tsx
│   │       │   │   ├── TransactionForm.tsx  # Tambah + Edit (reuse)
│   │       │   │   ├── TransactionDetail.tsx
│   │       │   │   └── FilterPanel.tsx
│   │       │   ├── budget/
│   │       │   │   ├── BudgetCard.tsx
│   │       │   │   ├── BudgetForm.tsx
│   │       │   │   ├── BudgetProgress.tsx
│   │       │   │   └── DonutChart.tsx
│   │       │   ├── account/
│   │       │   │   ├── AccountCard.tsx
│   │       │   │   ├── AccountForm.tsx
│   │       │   │   └── BalanceCard.tsx
│   │       │   ├── debt/
│   │       │   │   ├── DebtItem.tsx
│   │       │   │   ├── DebtForm.tsx
│   │       │   │   ├── DebtDetail.tsx
│   │       │   │   └── PayConfirmDialog.tsx
│   │       │   ├── gmail/
│   │       │   │   ├── GmailConnect.tsx
│   │       │   │   ├── ScanProgress.tsx
│   │       │   │   ├── ReviewCard.tsx
│   │       │   │   └── GmailStatus.tsx
│   │       │   ├── report/
│   │       │   │   ├── MonthlyReport.tsx
│   │       │   │   ├── TrendChart.tsx
│   │       │   │   ├── CategoryPieChart.tsx
│   │       │   │   └── BarChart.tsx
│   │       │   ├── onboarding/
│   │       │       ├── Slide.tsx
│   │       │       └── SetupChoice.tsx
│   │       │   └── subscription/
│   │       │       ├── UpgradePrompt.tsx     # "Upgrade ke Premium" CTA
│   │       │       ├── PricingCard.tsx
│   │       │       ├── TrialBanner.tsx       # "Trial sisa X hari"
│   │       │       └── PaymentHistory.tsx
│   │       ├── pages/
│   │       │   ├── Onboarding.tsx
│   │       │   ├── Dashboard.tsx
│   │       │   ├── Transactions.tsx
│   │       │   ├── TransactionDetail.tsx
│   │       │   ├── Budget.tsx
│   │       │   ├── BudgetDetail.tsx
│   │       │   ├── BudgetForm.tsx
│   │       │   ├── Accounts.tsx
│   │       │   ├── AccountDetail.tsx
│   │       │   ├── AccountForm.tsx
│   │       │   ├── Debts.tsx
│   │       │   ├── DebtDetail.tsx
│   │       │   ├── Recurring.tsx
│   │       │   ├── Report.tsx
│   │       │   ├── Categories.tsx
│   │       │   ├── Notifications.tsx
│   │       │   ├── GmailSync.tsx
│   │       │   ├── GmailReview.tsx
│   │       │   ├── Settings.tsx
│   │       │   ├── Subscription.tsx       # Pricing + upgrade page
│   │       │   ├── PaymentSuccess.tsx     # After Midtrans redirect
│   │       │   ├── Export.tsx
│   │       │   └── Login.tsx
│   │       ├── store/
│   │       │   └── theme.ts           # Zustand: theme state
│   │       └── styles/
│   │           └── globals.css        # Tailwind + custom
│   │
│   └── api/                          # Hono Backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts              # Hono app entry
│       │   ├── env.ts                # Environment validation
│       │   ├── middleware/
│       │   │   ├── auth.ts           # Session validation
│       │   │   ├── error.ts          # Error handler
│       │   │   └── logger.ts
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── dashboard.ts
│       │   │   ├── accounts.ts
│       │   │   ├── transactions.ts
│       │   │   ├── categories.ts
│       │   │   ├── budgets.ts
│       │   │   ├── debts.ts
│       │   │   ├── recurring.ts
│       │   │   ├── reports.ts
│       │   │   ├── gmail.ts
│       │   │   ├── settings.ts
│       │   │   ├── subscription.ts
│       │   │   └── export.ts
│       │   ├── services/
│       │   │   ├── transaction.service.ts  # Business logic + cascade
│       │   │   ├── budget.service.ts
│       │   │   ├── debt.service.ts
│       │   │   ├── recurring.service.ts
│       │   │   ├── gmail.service.ts        # Gmail API integration
│       │   │   ├── gmail-parser.service.ts # Parse email → transaction
│       │   │   ├── subscription.service.ts # Plan logic + feature gates
│       │   │   ├── midtrans.service.ts     # Midtrans Snap API
│       │   │   ├── export.service.ts
│       │   │   └── notification.service.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts           # Session validation
│       │   │   ├── subscription.ts   # Feature gate: requireFeature()
│       │   │   ├── error.ts          # Error handler
│       │   │   └── logger.ts
│       │   │   ├── db.ts             # Prisma client
│       │   │   ├── google.ts         # Google OAuth + Gmail API
│       │   │   └── computed.ts       # Balance, budget spent calculations
│       │   └── cron/
│       │       ├── gmail-sync.ts     # Periodic Gmail sync
│       │       ├── recurring.ts      # Execute recurring transactions
│       │       ├── reminders.ts      # Debt due date reminders
│       │       └── subscription.ts   # Check expiry, downgrade plans
│       └── prisma/
│           ├── schema.prisma
│           ├── seed.ts               # Default categories
│           └── migrations/
│
└── packages/
    └── shared/
        ├── package.json
        └── src/
            ├── types.ts              # Shared TypeScript types
            ├── constants.ts          # Shared constants
            └── validators.ts         # Zod schemas (shared validation)
```

---

## 6. MILESTONES

### M001 — Foundation & Auth
**Goal**: User bisa register/login via Google, landing di dashboard kosong. Subscription trial otomatis aktif.
**Deliverables**:
- [x] Monorepo setup (Turborepo)
- [x] Database + Prisma schema + migration + seed (termasuk Subscription + Payment model)
- [x] Hono API server boilerplate
- [x] Google OAuth flow (login + session)
- [x] Auto-create Subscription (plan="trial", trial_end = +30 days) saat register
- [x] React app + Router + Tailwind
- [x] AppShell (mobile layout + bottom nav)
- [x] Login page
- [x] Onboarding slides (4 slides)
- [x] Dashboard empty state
- [x] Theme toggle (light/dark)
- [x] Trial banner component ("Trial Premium — sisa X hari")
- [x] PremiumGate component (wrapper buat feature gating)

**API**: `POST /auth/google`, `GET /auth/google/callback`, `GET /auth/me`, `POST /auth/logout`, `GET /subscription`
**Acceptance Criteria**:
- User bisa login via Google
- Subscription otomatis dibuat: plan="trial", trial_end = 30 hari dari sekarang
- Redirect ke onboarding (first time) atau dashboard (returning)
- Trial banner muncul di dashboard: "Trial Premium — sisa 30 hari"
- Session persist across refresh
- Bottom nav visible, semua tab accessible (empty states)
- Light/dark mode switch works

---

### M002 — Accounts CRUD
**Goal**: User bisa tambah/edit/hapus akun bank, e-wallet, cash.
**Deliverables**:
- [x] Account API (CRUD + balance computation)
- [x] Account list page (Akun Overview)
- [x] Account form (Tambah/Edit)
- [x] Account detail + transaksi per akun
- [x] Balance card di dashboard
- [x] Net worth computation
- [x] Delete confirmation dialog

**API**: All `/accounts` endpoints
**Acceptance Criteria**:
- Tambah akun BCA, Mandiri, GoPay
- Saldo awal tampil benar
- Net worth = sum semua saldo akun aktif
- Delete akun → confirm dialog → hapus + recompute net worth
- **Feature gate**: Free user max 2 akun → tampil UpgradePrompt saat tambah akun ke-3

---

### M003 — Categories & Sub-categories
**Goal**: User bisa kelola kategori kustom.
**Deliverables**:
- [x] Category API (CRUD + sub-categories)
- [x] Default categories seeder
- [x] Kelola Kategori page
- [x] Add/edit/delete category + sub-category
- [x] Search kategori

**API**: All `/categories` endpoints
**Acceptance Criteria**:
- Default categories muncul setelah register
- Tambah kategori baru + sub-kategori
- Edit icon, nama, warna
- Delete kategori yang tidak punya transaksi
- Delete kategori yang punya transaksi → confirm force delete → transaksi jadi uncategorized

---

### M004 — Transactions CRUD + Search
**Goal**: User bisa catat pengeluaran, pemasukan, transfer. Search & filter.
**Deliverables**:
- [x] Transaction API (CRUD + filter + search + pagination)
- [x] Transaction list page + filter chips
- [x] Tambah transaksi (bottom sheet modal)
- [x] Edit transaksi (reuse modal, pre-filled)
- [x] Detail transaksi page
- [x] Transfer antar akun
- [x] Search + filter panel (bottom sheet)
- [x] Delete + confirmation
- [x] Toast feedback (saved, deleted, with undo)
- [x] Amount input component (Rp formatter)

**API**: All `/transactions` endpoints
**Acceptance Criteria**:
- Tambah expense → saldo akun berkurang
- Tambah income → saldo akun bertambah
- Transfer BCA → Mandiri → saldo BCA turun, Mandiri naik, net worth tetap
- Edit amount → saldo akun recompute
- Delete → saldo akun recompute
- Search "kopi" → filter results + total
- Filter by type, category, account, date range, amount range
- Toast muncul 3 detik dengan opsi Undo

---

### M005 — Budget System
**Goal**: User bisa set budget per kategori, lihat progress real-time.
**Deliverables**:
- [x] Budget API (CRUD + spent computation)
- [x] Budget overview page (donut chart + per-category progress)
- [x] Budget form (tambah/edit)
- [x] Budget drill-down (per sub-kategori + transaksi)
- [x] Budget alert (notifikasi saat >= threshold)
- [x] Copy budget bulan lalu

**API**: All `/budgets` endpoints
**Acceptance Criteria**:
- Set budget Makanan Rp 2.500.000
- Tambah transaksi Makan → budget spent bertambah real-time
- Progress bar update
- Alert muncul saat 80% terpakai
- Drill-down menunjukkan breakdown per sub-kategori
- Copy budget lalu → semua kategori & amount ter-copy

---

### M006 — Hutang & Piutang
**Goal**: Catat, kelola, lunasi hutang/piutang.
**Deliverables**:
- [x] Debt API (CRUD + pay/unpay + auto-record)
- [x] Debt list page (tabs: semua/hutang/piutang/lunas)
- [x] Debt form (tambah/edit)
- [x] Debt detail page
- [x] Konfirmasi lunas dialog (+ toggle auto-record)
- [x] Hutang card di dashboard (summary + nearest due)
- [x] Empty state
- [x] Overdue visual indicator

**API**: All `/debts` endpoints
**Acceptance Criteria**:
- Tambah hutang ke Andi Rp 1.500.000, jatuh tempo 31 Mar
- Dashboard card menunjukkan total + nearest due
- Tandai lunas + auto-record ON → transaksi expense otomatis dibuat → saldo akun berkurang
- Batal lunas → transaksi auto-record dihapus → saldo akun revert
- Overdue → visual merah + "Lewat X hari"

---

### M007 — Recurring Transactions
**Goal**: Transaksi berulang otomatis tercatat.
**Deliverables**:
- [x] Recurring API (CRUD + toggle + cron execution)
- [x] Recurring list page
- [x] Recurring form
- [x] Cron job: auto-create transactions
- [x] Link dari Settings
- [x] Monthly summary (total recurring expense/income)

**API**: All `/recurring` endpoints
**Acceptance Criteria**:
- Set recurring "BBM XMAX" Rp 120.000 setiap Jumat
- Setiap Jumat, transaksi otomatis dibuat
- Toggle off → recurring pause, next_run nggak jalan
- Monthly summary akurat

---

### M008 — Reports & Export
**Goal**: Laporan visual + export data.
**Deliverables**:
- [x] Reports API (monthly, trend, yearly)
- [x] Laporan bulanan page (pie chart, bar chart, breakdown)
- [x] Tren 6 bulan
- [x] Export API (Excel, PDF, CSV)
- [x] Export page (format selection, date range, preview)
- [x] Download file

**API**: All `/reports` + `/export` endpoints
**Acceptance Criteria**:
- Laporan Maret 2026: income, expense, savings, category breakdown
- Pie chart pengeluaran per kategori
- Bar chart tren 6 bulan
- Export Excel → file .xlsx download → data benar
- Export PDF → formatted report

---

### M009 — Gmail Sync
**Goal**: Auto-sync transaksi dari email bank.
**Deliverables**:
- [x] Gmail OAuth scope (readonly)
- [x] Gmail API integration
- [x] Email parser (BCA, Mandiri, GoPay, OVO, BNI)
- [x] Gmail connect page
- [x] Scanning progress page
- [x] Review page (AI suggested category)
- [x] Gmail settings page
- [x] Approve/skip/edit pending reviews
- [x] Auto-sync cron (setiap 15 menit)
- [x] Bank source management

**API**: All `/gmail` endpoints
**Acceptance Criteria**:
- Connect Gmail → scan 6 bulan email
- Detect BCA, Mandiri, GoPay, OVO
- Pending review muncul dengan suggested category
- Approve → transaksi dibuat → saldo berubah → budget ter-update
- Auto-sync background setiap 15 menit
- Disconnect → stop sync, data tetap

---

### M010 — Settings, Notifications & Polish
**Goal**: Settings lengkap, notifikasi, PWA.
**Deliverables**:
- [x] Settings page (profile, security, notifications, preferences)
- [x] PIN lock
- [x] Hide balance toggle
- [x] Notification system (budget alerts, debt reminders, weekly report)
- [x] Template warna
- [x] PWA manifest + service worker
- [x] Offline support (read-only)
- [x] Import CSV
- [x] Performance optimization
- [x] Notifikasi page (inbox)

**API**: All `/settings` endpoints + notification cron
**Acceptance Criteria**:
- Set PIN → app locked saat reopen
- Hide balance → semua nominal blur/hidden
- Budget >= 80% → push notification
- Hutang H-1 due date → notification
- Weekly report notification setiap Senin
- PWA installable di Android/iOS
- Template warna applied globally

---

### M011 — Subscription & Billing (Midtrans)
**Goal**: User bisa upgrade ke Premium via Midtrans. Trial → Free → Premium lifecycle berjalan.
**Deliverables**:
- [x] Subscription API (status, checkout, webhook, cancel)
- [x] Midtrans Snap integration (server-side token generation)
- [x] Midtrans webhook handler (verify signature, update status)
- [x] Subscription page (pricing cards, current plan info)
- [x] Checkout flow (pilih plan → Midtrans payment → redirect back)
- [x] Payment success page
- [x] Payment history page
- [x] Trial banner di dashboard ("Sisa X hari trial")
- [x] Upgrade prompt di fitur yang locked (Gmail, Export, dll)
- [x] Auto-downgrade: cron check trial/premium expiry → set plan="free"
- [x] Auto-renew flow (Midtrans recurring)
- [x] Feature gate enforcement di semua endpoint yang relevant:
  - POST /accounts → max 2 (free)
  - POST /budgets → max 3 (free)
  - All /gmail/* → blocked (free)
  - All /export/* → blocked (free)
  - GET /reports/trend, /reports/yearly → blocked (free, hanya bulan ini)

**API**: All `/subscription` endpoints
**Acceptance Criteria**:
- User baru register → trial 30 hari, semua fitur unlocked
- Trial habis → plan downgrade ke free, fitur premium locked
- Klik "Upgrade" → pilih bulanan/tahunan → Midtrans payment page
- Bayar sukses → webhook update → plan="premium" → fitur unlocked
- Free user coba akses Gmail Sync → UpgradePrompt muncul
- Free user tambah akun ke-3 → UpgradePrompt muncul
- Payment history visible di settings
- Cancel premium → tetap aktif sampai premium_end, lalu downgrade

---

## 7. ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dompetaing

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://api.dompetaing.xxx/v1/auth/google/callback

# Session
SESSION_SECRET=xxx
COOKIE_DOMAIN=.dompetaing.xxx

# App
API_URL=https://api.dompetaing.xxx
WEB_URL=https://dompetaing.xxx
NODE_ENV=production
PORT=3001

# Gmail
GMAIL_REDIRECT_URI=https://api.dompetaing.xxx/v1/gmail/callback

# Midtrans
MIDTRANS_SERVER_KEY=xxx
MIDTRANS_CLIENT_KEY=xxx
MIDTRANS_IS_PRODUCTION=false  # true untuk production
MIDTRANS_WEBHOOK_URL=https://api.dompetaing.xxx/v1/subscription/webhook

# Subscription
TRIAL_DAYS=30
PREMIUM_MONTHLY_PRICE=29900
PREMIUM_YEARLY_PRICE=249000
```

---

## 8. DEPLOYMENT (Docker Compose)

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dompetaing
      POSTGRES_USER: dompetaing
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://dompetaing:${DB_PASSWORD}@postgres:5432/dompetaing
    depends_on:
      - postgres
    restart: always

  web:
    build: ./apps/web
    ports:
      - "3000:80"
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - api
      - web
    restart: always

volumes:
  pgdata:
```

---

## 9. SECURITY CHECKLIST

- [ ] All API routes behind auth middleware (except /auth/*)
- [ ] CSRF protection on mutation endpoints
- [ ] Rate limiting (100 req/min per user)
- [ ] Input validation (Zod schemas on all endpoints)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (React default escaping + CSP headers)
- [ ] CORS restricted to WEB_URL only
- [ ] Sensitive data encrypted at rest (Google tokens)
- [ ] PIN stored as bcrypt hash
- [ ] Session cookie: httpOnly, secure, sameSite=strict
- [ ] Gmail scopes minimal (gmail.readonly)
- [ ] Audit log for financial mutations (optional v2)

---

## 10. IMPLEMENTATION NOTES FOR CLAUDE CLI

### Cascade Integrity Rules (CRITICAL)
Setiap kali Claude CLI implement endpoint yang mutate transaksi, WAJIB handle:

1. **POST/PUT/DELETE transaction** → Recalculate account balance, check budget threshold
2. **PATCH debt pay** → Create linked transaction if auto_record, recalculate account
3. **DELETE account** → Cascade delete all transactions in account, recalculate net worth
4. **POST/PUT budget** → Validate no duplicate (same category + period)
5. **Recurring cron** → Create transaction with source="recurring", set recurring_id

### Response Pattern
Semua mutation endpoint HARUS return `effects` object:
```typescript
{
  data: T,
  effects: {
    account_balances?: Record<string, number>,  // { accountId: newBalance }
    net_worth?: number,
    budget_impacts?: Array<{
      budget_id: string,
      spent: number,
      limit: number,
      percentage: number,
      alert: boolean
    }>,
    debt_status?: { debt_id: string, is_paid: boolean }
  }
}
```

Frontend Tanstack Query invalidation pattern:
- Mutate transaction → invalidate: `["transactions"]`, `["accounts"]`, `["dashboard"]`, `["budgets"]`
- Mutate account → invalidate: `["accounts"]`, `["dashboard"]`
- Mutate debt + pay → invalidate: `["debts"]`, `["transactions"]`, `["accounts"]`, `["dashboard"]`
- Mutate budget → invalidate: `["budgets"]`, `["dashboard"]`
- Payment success → invalidate: `["subscription"]` (semua PremiumGate re-evaluate)

### Subscription Enforcement Rules (CRITICAL)
Setiap endpoint yang kena feature gate WAJIB pakai middleware `requireFeature()`:

```typescript
// Contoh di routes/accounts.ts
app.post("/accounts", auth(), requireFeature("unlimited_accounts"), async (c) => { ... });

// Contoh di routes/gmail.ts  
app.post("/gmail/sync", auth(), requireFeature("gmail_sync"), async (c) => { ... });

// Contoh di routes/export.ts
app.post("/export/excel", auth(), requireFeature("export"), async (c) => { ... });

// Contoh di routes/reports.ts (partial gate)
app.get("/reports/trend", auth(), requireFeature("full_reports"), async (c) => { ... });
app.get("/reports/monthly", auth(), async (c) => {
  // Free user: enforce current month only
  const sub = await getSubscription(user.id);
  if (getEffectivePlan(sub) === "free") {
    // Override month/year params to current month
  }
});
```

Frontend error handling untuk 403 premium_required:
```typescript
// Di api.ts (fetch wrapper)
if (response.status === 403) {
  const data = await response.json();
  if (data.error === "premium_required" || data.error === "limit_reached") {
    // Trigger UpgradePrompt modal
    showUpgradeModal(data.feature, data.limit);
    return;
  }
}
```

### Cron Jobs
| Job | Schedule | Action |
|-----|----------|--------|
| Gmail sync | Setiap 15 menit | Sync email baru untuk premium users |
| Recurring transactions | Setiap hari 00:01 | Create transactions untuk recurring yang next_run <= today |
| Debt reminders | Setiap hari 08:00 | Kirim notif untuk hutang H-1 due date |
| Weekly report | Setiap Senin 07:00 | Generate & kirim weekly summary |
| Subscription expiry | Setiap hari 00:05 | Check trial_end & premium_end, downgrade expired plans |
| Midtrans check | Setiap jam | Check pending payments, update status via Midtrans API |

