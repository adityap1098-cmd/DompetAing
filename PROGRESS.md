# DompetAing — Progress

## M001 — Foundation & Auth ✅ DONE
**Date:** 2026-03-29

### Apa yang sudah dibuat
- Monorepo Turborepo (`apps/api`, `apps/web`, `packages/shared`)
- Prisma schema — 12 model + migration `20260329115735_init`
- Hono API + Google OAuth (`arctic`), session cookie signed (httpOnly, 7 hari)
- React 18 + Vite + Tailwind, Router 6, TanStack Query 5, Zustand
- AppShell + BottomNav (5 tab, `max-w-md` constrained)
- Login, Onboarding (4 slide), Dashboard empty state
- Theme toggle light/dark persist, TrialBanner, PremiumGate

### Environment Notes
- PostgreSQL native Windows di port 5432 → Docker pakai port **5434**
- `.env` di root project, sync ke `apps/api/.env` dan `apps/web/.env`
- Google OAuth credentials sudah di `.env` (jangan commit)
- Cara dev: `docker-compose up postgres -d` → API: `npx tsx --env-file=.env src/index.ts` → Web: `npx vite`

### Known Issues Fixed
- BottomNav: tambah `max-w-md mx-auto` pada inner div agar sejajar konten

---

## M002 — Accounts CRUD ✅ DONE (tested)
**Date:** 2026-03-29

### Apa yang sudah dibuat
- `apps/api/src/routes/accounts.ts` — full CRUD + balance computation + stats + reorder
- `apps/web/src/hooks/useAccounts.ts`
- `apps/web/src/components/account/` — AccountCard, AccountForm, BalanceCard, ConfirmDeleteDialog
- `apps/web/src/components/ui/Modal.tsx`, `ConfirmDialog.tsx`
- `apps/web/src/pages/Accounts.tsx` — list + net worth
- `apps/web/src/pages/AccountDetail.tsx` — detail + recent txn placeholder
- Dashboard diupdate: net worth & account list dari API real
- Feature gate: Free user max 2 akun → UpgradePrompt

### Bug Fixes (post-testing)
- **BUG 1**: Trial user kena batas 2 akun — `null ?? 2` di `useSubscription.ts` diganti `null ?? Infinity`
- **BUG 2**: Form tidak reset setelah submit — pakai `key` prop pada `AccountForm` untuk force remount
- **BUG 3**: Tombol Edit navigasi ke detail page — sekarang buka Modal edit dengan form pre-filled
- **BUG 4**: Tombol Hapus navigasi ke detail page — sekarang tampil `ConfirmDialog` lalu DELETE + toast
- Toast system: `Toast.tsx` (module-level event emitter) + `<Toaster />` di `AppShell`

### Catatan untuk M003+
- `computeAccountBalance()` di `apps/api/src/lib/computed.ts` — reuse di semua endpoint yang butuh saldo
- Account balance = `initial_balance + SUM(txn)` computed real-time
- Route `/accounts/:id/transactions` sudah ada → dipakai penuh di M004
- Sort order (`sort_order` field) sudah di schema, PATCH `/accounts/:id/reorder` tersedia
- Toast system sudah ada di `components/ui/Toast.tsx` → pakai `showToast()` di milestone berikutnya

---

---

## M003 — Categories & Sub-categories ✅ DONE
**Date:** 2026-03-29

### Apa yang sudah dibuat
- `apps/api/src/routes/categories.ts` — full CRUD: GET list/detail, POST, PUT, DELETE (+ `?force=true`), sub-category CRUD, PATCH reorder
- `apps/web/src/hooks/useCategories.ts` — TanStack Query hooks: useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useCreateSubCategory, useUpdateSubCategory, useDeleteSubCategory
- `apps/web/src/components/category/CategoryForm.tsx` — form dengan icon picker (32 emoji), color picker, type selector
- `apps/web/src/pages/Categories.tsx` — list + search + filter chips, inline sub-category management, force delete flow
- Route `/categories` terdaftar di `apps/api/src/index.ts`
- `App.tsx` → `/categories` mengarah ke `CategoriesPage` (bukan placeholder lagi)

### Bug Fixes (post-testing)
- **BUG 1**: System categories tidak bisa dihapus — dihapus validasi `is_system` di backend dan frontend
- **BUG 2**: Search tidak mencari sub-kategori — ditambah `OR: [name, sub_categories.some.name]` di Prisma query

### Force Delete Flow
- DELETE tanpa transaksi → langsung hapus
- DELETE dengan transaksi → API 409 + `transaction_count` → frontend tampil second ConfirmDialog "Hapus Paksa?"
- Confirm force → DELETE `?force=true` → transaksi jadi uncategorized

---

## M004 — Transactions CRUD + Search ✅ DONE
**Date:** 2026-03-29

### Apa yang sudah dibuat
- `apps/api/src/routes/transactions.ts` — GET list (pagination + filter + search), GET detail, POST, PUT, DELETE, GET search-total
- `apps/web/src/hooks/useTransactions.ts` — TanStack Query hooks: useTransactions, useTransaction, useCreateTransaction, useUpdateTransaction, useDeleteTransaction
- `apps/web/src/components/ui/AmountInput.tsx` — styled Rp input
- `apps/web/src/components/ui/Toast.tsx` — updated dengan action button support (undo delete)
- `apps/web/src/components/transaction/TransactionItem.tsx` — list item row
- `apps/web/src/components/transaction/TransactionForm.tsx` — full form: type tabs, amount, account, category, date
- `apps/web/src/pages/Transactions.tsx` — list + search + filter chips + date grouping + FAB + undo delete
- `apps/web/src/pages/TransactionDetail.tsx` — detail + edit/delete
- `App.tsx` → tambah route `/transactions/:id`
- Dashboard diupdate: income/expense bulan ini real + recent transactions

### Undo Delete Flow
- User tap hapus → item hilang optimistically
- Toast muncul dengan tombol "Batalkan" (3.5 detik)
- Jika tidak dibatalkan → API DELETE dipanggil
- Jika dibatalkan → item kembali tampil, timer dibatalkan

### Catatan untuk M005+
- Effects dari POST/PUT/DELETE sudah ada di response: `{ transaction, effects: { account_balance, to_account_balance? } }`
- Filter `?type=expense|income|transfer&category_id=X&account_id=X&search=X&date_from=X&date_to=X` tersedia
- Dashboard income/expense menggunakan query `useTransactions` dengan date_from/date_to bulan ini

---

## Verifikasi M001–M004 ✅ SEMUA PASS
**Date:** 2026-03-29

### M001 — Foundation & Auth
- [x] Google OAuth login — `/auth/google` redirect ✅, callback set session cookie ✅
- [x] Subscription auto-created — DB: plan=trial, trial_end=2026-04-28 ✅
- [x] Redirect: new user → `/onboarding`, returning → `/dashboard` — auth.ts:124 ✅
- [x] Trial banner di Dashboard — TrialBanner component, shows "sisa X hari" ✅
- [x] Session persist — httpOnly signed cookie, 7 hari ✅
- [x] Bottom nav + semua tab — AppShell + BottomNav + semua route terdaftar ✅
- [x] Light/dark mode toggle — Zustand theme store, persisted ✅

### M002 — Accounts CRUD
- [x] Tambah akun — 3 akun di DB (BCA Utama, Mandiri Bisnis, Mandiri Tabungan) ✅
- [x] Saldo awal benar — computeAccountBalance raw SQL ✅
- [x] Net worth = sum active accounts — BCA(17,415,000) + Mandiri Tab(20,000,000) = 37,415,000 ✅
- [x] Delete + ConfirmDialog — konfirmasi sebelum hapus ✅
- [x] Feature gate max 2 akun (free) — UpgradePrompt saat atFreeLimit ✅

### M003 — Categories & Sub-categories
- [x] Default categories muncul — 12 kategori seeded ✅
- [x] Tambah kategori + sub-kategori — POST /categories, POST /categories/:id/sub ✅
- [x] Edit icon/nama/warna — PUT /categories/:id ✅
- [x] Delete tanpa transaksi — langsung hapus ✅
- [x] Force delete → transaksi jadi uncategorized — 409 + ?force=true + Prisma SetNull ✅

### M004 — Transactions CRUD + Search
- [x] Expense → saldo akun berkurang — BCA: 18M - 85K (expense) - 5M (transfer out) + 4.5M (income) = 17,415,000 ✅
- [x] Income → saldo akun bertambah — income 4.5M terhitung ✅
- [x] Transfer BCA → Mandiri → net worth tetap — Mandiri Tab +5M, BCA -5M ✅
- [x] Edit → recompute — computeAccountBalance dipanggil di PUT ✅
- [x] Delete → recompute — computeAccountBalance dipanggil di DELETE ✅
- [x] Search + total — /transactions/search-total endpoint, buildWhere dengan search ✅
- [x] Filter: type/category/account/date/amount — FilterPanel + queryFilters ✅
- [x] Toast + Undo (3.5 detik) — showToast dengan action button "Batalkan" ✅

---

---

## M005 — Budget System ✅ DONE
**Date:** 2026-03-29

### Apa yang sudah dibuat
- `apps/api/src/routes/budgets.ts` — GET list (month/year), GET detail (drill-down), POST (feature-gated), PUT (amount only), DELETE, POST copy-previous
- `apps/web/src/hooks/useBudgets.ts` — TanStack Query hooks: useBudgets, useBudgetDetail, useCreateBudget, useUpdateBudget, useDeleteBudget, useCopyBudget
- `apps/web/src/components/budget/BudgetForm.tsx` — kategori select (expense only, skip already-budgeted), AmountInput, edit mode
- `apps/web/src/pages/Budget.tsx` — full budget overview page

### Fitur
- **Month navigation** — < > arrows di header, navigasi antar bulan
- **SVG donut chart** — overall progress (spent/total) tanpa library eksternal
- **Per-category progress bars** — warna berdasarkan status (normal/amber/red)
- **Alert threshold 80%** — ⚠️ banner + warna amber di progress bar, 🔴 jika melewati 100%
- **Expandable drill-down** — tap budget item → sub-category breakdown + 10 recent transactions (lazy fetch)
- **Edit/Delete** — via modal, konfirmasi sebelum hapus
- **Feature gate** — free user max 3 budget → UpgradePrompt + FAB disembunyikan
- **Copy previous month** — salin semua budget bulan lalu ke bulan ini

### Bug Fix
- `useSubscription.ts`: `maxBudgets ?? 3` → `maxBudgets ?? Infinity` (trial/premium user tidak terkena batas)
- **BUG 1**: Budget tidak tampil setelah dibuat — `useCreateBudget` ganti `invalidateQueries` → `resetQueries` agar cache langsung clear sehingga `isLoading = true` muncul spinner, bukan stale empty state
- **BUG 2**: Copy bulan lalu error saat tidak ada budget bulan sebelumnya — tambah `useBudgets(prevMonth, prevYear)` query, tombol disabled + label deskriptif bila tidak ada data
- **Dashboard bug**: "Budget Bulan Ini" hardcoded empty state → sekarang pakai `useBudgets(month, year)`, tampil progress bar per kategori (top 3) + empty state + "Buat Budget Baru" link

### Catatan untuk M006+
- `computeBudgetSpent()` & `getBudgetPeriodDates()` sudah ada di `computed.ts` — digunakan di budget route
- Spent selalu dicompute real-time dari transaksi
- Feature gate backend: `requireFeature("unlimited_budgets")` cek total active budgets

---

## M006 — Hutang & Piutang ✅ DONE
**Date:** 2026-03-29

### Apa yang sudah dibuat
- `apps/api/src/routes/debts.ts` — GET list (+ summary), GET detail, POST, PUT, PATCH pay (+ auto-record transaksi), PATCH unpay (hapus transaksi auto-record), DELETE
- `apps/web/src/hooks/useDebts.ts` — TanStack Query hooks: useDebts, useDebt, useCreateDebt, useUpdateDebt, useDeleteDebt, usePayDebt, useUnpayDebt
- `apps/web/src/components/debt/DebtForm.tsx` — form tambah/edit: type radio, person name, amount, description, borrow_date, due_date, reminder toggle, auto_record toggle
- `apps/web/src/components/debt/DebtItem.tsx` — list row dengan overdue indicator (merah + "Lewat X hari"), days_remaining badge
- `apps/web/src/pages/Debts.tsx` — list page: tabs (Semua/Hutang/Piutang/Lunas), summary card, FAB, konfirmasi lunas dialog (+ auto-record toggle + pilih akun)
- Dashboard Hutang & Piutang card: real data dari useDebts — tampil total hutang/piutang + nearest due debt

### Fitur
- **Tabs**: Semua / Hutang (gua pinjam) / Piutang (orang pinjam) / Lunas
- **Summary card**: total hutang aktif, total piutang aktif, jumlah overdue
- **Overdue indicator**: visual merah + label "Lewat X hari"
- **Tandai lunas**: dialog konfirmasi + toggle auto_record + pilih akun (jika auto_record ON)
- **Auto-record**: saat lunas hutang → expense otomatis; saat lunas piutang → income otomatis → saldo akun berubah
- **Batal lunas**: hapus transaksi auto-record → saldo revert
- **Dashboard card**: tampil total + item hutang/piutang terdekat jatuh tempo

### Bug Fix (post-implementation)
- **BUG**: Tambah hutang gagal (404) — API server belum direstart setelah route `/debts` ditambahkan. Fix: kill process lama (PID via `netstat -ano`) → restart `npx tsx --env-file=../../.env src/index.ts`

### Catatan untuk M007+
- `debt_id` di Transaction sudah di schema — dipakai untuk linking transaksi pelunasan
- PATCH `/debts/:id/pay` invalidate: `["debts"]`, `["transactions"]`, `["accounts"]`
- PATCH `/debts/:id/unpay` invalidate: sama

---

## M007 — Recurring Transactions ✅ DONE
**Date:** 2026-03-29

### Apa yang sudah dibuat
- `apps/api/src/lib/recurring.ts` — `computeNextRun()` (daily/weekly/monthly/yearly + active_days), `computeMonthlyTotal()`, `runDueRecurring()`
- `apps/api/src/cron/recurring.ts` — `startRecurringCron()` dengan recursive setTimeout, fires daily 00:01
- `apps/api/src/routes/recurring.ts` — GET list (+summary), POST, PUT, PATCH toggle, DELETE, POST execute-now (dev-only)
- `apps/api/src/index.ts` — route terdaftar + `startRecurringCron()` (bukan setInterval lagi)
- `apps/web/src/hooks/useRecurring.ts` — TanStack Query hooks: useRecurring, useCreateRecurring, useUpdateRecurring, useDeleteRecurring, useToggleRecurring, useExecuteNow
- `apps/web/src/components/recurring/RecurringForm.tsx` — form: description, amount, type, category, account, frequency, daily checkboxes (active_days), weekly day, monthly date, yearly month+day
- `apps/web/src/components/recurring/RecurringItem.tsx` — list row: frekuensi label (daily: "Setiap Sen, Sel...", yearly: "Setiap 1 Mar")
- `apps/web/src/pages/Recurring.tsx` — list page + summary card + FAB + edit/delete + expand row
- `apps/web/src/pages/Transactions.tsx` — tambah link "Transaksi Berulang →"

### Bug Fixes (post-implementation)
- **BUG 1 — Estimasi bulanan**: rumus `amount × dayCount × 4.33` untuk daily dengan hari aktif; `amount × 4.33` untuk weekly. `WEEKS_PER_MONTH = 4.33` sebagai konstanta.
- **BUG 2 — Edit tidak tersimpan**: PUT route Prisma update tidak menyertakan `active_days` → ditambahkan.
- **BUG 3 — Cron**: `setInterval(60s)` diganti `startRecurringCron()` (recursive setTimeout, daily 00:01). Endpoint `run-due` → `execute-now` dengan dev-only guard.

### Catatan untuk M008+
- Transaksi dari cron punya `source: "recurring"` dan `recurring_id` — bisa filter di laporan
- `active_days` dual-purpose: daily = "1,2,3,4,5" (hari aktif), yearly = "3" (bulan Maret)

---

## M008 — Reports & Export ✅ DONE
**Date:** 2026-03-29

### Apa yang sudah dibuat
- `apps/api/src/routes/reports.ts` — GET monthly (all users, free = current month only), GET trend + yearly (requireFeature "full_reports")
- `apps/api/src/routes/export.ts` — POST csv/excel/pdf (requireFeature "export"); xlsx library untuk Excel, HTML untuk PDF
- `apps/web/src/hooks/useReports.ts` — useMonthlyReport, useTrendReport, useYearlyReport + downloadExport util
- `apps/web/src/pages/Reports.tsx` — tabs Bulanan/Tren/Tahunan, SVG pie chart, SVG bar chart, category breakdown
- `apps/web/src/pages/Export.tsx` — format selector, date range, download button, feature gate

### Fitur
- **Laporan Bulanan**: income/expense/savings, pie chart per kategori, bar chart harian, breakdown list. Free user: hanya bulan ini.
- **Tren 6 bulan**: multi-bar chart income vs expense per bulan (premium only)
- **Laporan Tahunan**: 12 bulan dalam setahun, navigasi tahun (premium only)
- **Export CSV**: download .csv semua transaksi dalam range
- **Export Excel**: download .xlsx dengan 2 sheet (Transaksi + Ringkasan)
- **Export PDF**: HTML dengan print CSS, download dan print sebagai PDF
- **Feature gate**: free user → upgrade prompt pada Tren, Tahunan, dan semua export

### Bug Fixes (post-implementation)
- **BUG 1 — Navigasi bulan tidak berfungsi**: `MonthNav` pakai satu prop `canNav` untuk kedua tombol → split jadi `canPrev` (selalu `true`) dan `canNext` (`!isCurrentMonth`).
- **BUG 2 — Bar chart harian berantakan**: `DailyBarChart` baru dengan `viewBox="0 0 ${n*10} 58"` — setiap hari = 10 unit slot, income bar `x+0.5 w=4`, expense bar `x+5 w=4`, label sumbu X tiap 5 hari, `preserveAspectRatio="xMidYMax meet"`.
- **IMPROVEMENT — Layout**: legend pie di bawah donut chart, jumlah ringkasan `text-[18px] font-bold font-mono`, label `text-[10px]`, semua angka pakai DM Mono.

### Catatan untuk M009+
- `/reports/monthly` terbuka untuk semua user → bisa di-embed di Dashboard
- Export menggunakan POST dengan body `{ date_from, date_to }` → blob download di frontend

---

## M009 — Gmail Sync ✅ DONE
**Date:** 2026-03-30

### Apa yang sudah dibuat
- `apps/api/src/lib/gmail.ts` — Gmail REST API utilities: `refreshGmailToken()`, `getValidToken()`, `fetchGmailProfile()`, `searchGmailMessages()`, `fetchGmailMessage()`, `extractEmailContent()`
- `apps/api/src/lib/emailParsers.ts` — Bank email parsers: BCA, Mandiri, GoPay, OVO, BNI. Deteksi bank dari sender/subject, parsing amount (format Rp1.000.000), tipe transaksi (expense/income dari keywords), merchant extraction
- `apps/api/src/lib/gmailSync.ts` — Core sync engine: `syncGmailForUser()` (fetch emails → detect bank → parse → dedup → create PendingReview), category suggestion rule-based, account matching by bank name
- `apps/api/src/routes/gmail.ts` — Semua Gmail endpoints:
  - `POST /gmail/connect` — Initiate Gmail OAuth (returns URL)
  - `GET /gmail/callback` — OAuth callback, simpan tokens, set `gmail_connected=true`
  - `POST /gmail/sync` — Trigger manual sync
  - `GET /gmail/status` — Status koneksi + stats
  - `GET /gmail/sources` — List bank email sources
  - `PATCH /gmail/sources/:id/toggle` — Enable/disable source
  - `GET /gmail/pending` — List pending reviews
  - `PATCH /gmail/pending/:id/approve` — Approve → create Transaction
  - `PATCH /gmail/pending/:id/skip` — Skip
  - `POST /gmail/pending/approve-all` — Approve semua pending
  - `PATCH /gmail/settings` — Update gmail preferences
  - `POST /gmail/disconnect` — Putuskan koneksi
- `apps/api/src/cron/gmail.ts` — `startGmailCron()`: sync semua user `gmail_connected=true && gmail_auto_sync=true` setiap 15 menit (recursive setTimeout)
- `apps/api/src/env.ts` — tambah `GMAIL_REDIRECT_URI`
- `apps/api/src/lib/google.ts` — tambah `googleGmail` instance (redirect URI berbeda)
- `apps/api/src/index.ts` — register `/gmail` route + `startGmailCron()`
- `apps/web/src/hooks/useGmail.ts` — TanStack Query hooks: `useGmailStatus`, `usePendingReviews`, `useGmailConnect`, `useGmailDisconnect`, `useGmailSync`, `useToggleSource`, `useApproveReview`, `useSkipReview`, `useApproveAll`, `useUpdateGmailSettings`
- `apps/web/src/pages/GmailSync.tsx` — Full feature page:
  - If not connected: CTA dengan bank list + cara kerja
  - If connected: status card (stats + last sync + manual sync), 3 tabs
  - Tab Review: list pending reviews dengan Setujui/Lewati, ApproveModal untuk edit sebelum simpan, Setujui Semua
  - Tab Sumber: list detected bank sources + toggle active/inactive
  - Tab Pengaturan: auto-sync, auto-kategorisasi, review before save toggle, disconnect

### Fitur
- **Bank support**: BCA, Mandiri, GoPay, OVO, BNI — deteksi dari sender email
- **Gmail OAuth**: Scope readonly, re-consent untuk refresh_token
- **Deduplication**: Skip email yang sudah diproses (cek `gmail_message_id`)
- **Category suggestion**: Rule-based matching — merchant keyword → kategori
- **Account suggestion**: Match nama bank ke akun user
- **Approve modal**: Edit amount, type, description, account, category, date sebelum simpan
- **Approve All**: Batch approve semua pending dengan auto-skip yang kurang data
- **Privacy card**: Tampilkan ke user bahwa hanya read access
- **Auto-sync cron**: Setiap 15 menit, hanya user dengan `gmail_auto_sync=true`
- **Feature gate**: `requireFeature("gmail_sync")` — free user dapat UpgradePrompt

### Bug Fixes (post-implementation)
- **BUG 1 — Sync return 0 transaksi (Jago tidak terdeteksi)**: Parser hanya support BCA/Mandiri/GoPay/OVO/BNI — tambah parser **Bank Jago** (`noreply@jago.com`). Merchant diekstrak dari subject: `"Kamu telah membayar ke MERCHANT💸"`.
- **BUG 2 — Jago email HTML-only, body kosong**: `extractEmailContent()` hanya ambil `text/plain` → amount tidak ketemu. Fix: tambah HTML stripping (`stripHtml()`) sebagai fallback jika tidak ada plain text part.
- **BUG 3 — Manual sync hanya scan email menit-menit terakhir**: `gmail_last_sync` sudah di-set saat first connect → `afterDate = gmail_last_sync` → query `after: hari ini` → 0 email. Fix: `syncGmailForUser(userId, forceFullScan=true)` — manual sync selalu scan 6 bulan ke belakang, dedup via `gmail_message_id` mencegah duplikat.
- **BUG 4 — GoPay label salah pada email Jago**: `detectBank()` match pertama yang cocok (sender OR subject) — Jago email yang subject-nya mengandung "gopay" (payment ke GoPay merchant) terdeteksi sebagai GoPay. Fix: prioritaskan sender match dulu, baru subject sebagai fallback.

### Hasil setelah fix
- `emails_processed: 145`, `transactions_found: 130`, semua berlabel `bank_name: "Jago"` ✅

### Catatan untuk M010+
- `GMAIL_REDIRECT_URI` perlu ditambah ke `.env` dan Google Cloud Console (Authorized redirect URIs)
- `syncGmailForUser(userId, forceFullScan)` — `true` untuk manual, `false` untuk cron
- PendingReview `status`: `"pending"` | `"approved"` | `"skipped"`
- Transaction dari Gmail punya `source: "gmail"` + `gmail_message_id` — bisa filter di Reports
- Bank yang aktif di akun ini: **Jago** — BCA/Mandiri/GoPay/OVO/BNI siap jika user punya email dari bank tersebut

---

### Bug Fixes (post-M009, 2026-03-30)
- **BUG 1 — Review: edit dulu, baru simpan**: PendingItem didesain ulang — 3 tombol: "Edit" | "Lewati" | "Simpan". "Simpan" langsung approve data as-is. "Edit" membuka inline editable fields di dalam card (tidak perlu modal terpisah). ApproveModal dihapus.
- **BUG 2 — Urutan terbalik**: `/gmail/pending` ganti order ke `parsed_date DESC NULLS LAST`, fallback `created_at DESC` — transaksi terbaru paling atas.
- **BUG 3 — Bank source terlalu sedikit**: Tambah 4 parser baru: BRI (`bri.co.id`), DANA (`dana.id`), ShopeePay (`shopee.co.id`), SeaBank (`seabank.co.id`). `buildBankEmailQuery` diupdate. NotConnected bank list jadi 10 bank.
- **BUG 4 — Mandiri "Pembayaran Berhasil" ke Shopee terdeteksi income**: Parser Mandiri sebelumnya menggunakan `detectType()` yang menganggap kata "top up" sebagai income. Faktanya "Top Up Shopee" = uang keluar dari rekening = expense. Fix: Mandiri type logic direset ke DEFAULT expense; hanya income jika body secara eksplisit mengandung "transfer masuk" | "terima transfer" | "dana masuk" | "refund" | "pengembalian". `detectType()` tidak dipanggil sama sekali untuk Mandiri.
- **Parser Mandiri disempurnakan**: Sender `noreply.livin@bankmandiri.co.id` ditambah ke `buildBankEmailQuery`. Amount diekstrak dari "Total Transaksi: Rp X". Merchant dari baris "Penerima: X". Tanggal dari baris "Tanggal: DD Mmm YYYY" + "Jam: HH:MM:SS".

---

---

## M010 — Settings, Notifications & Polish ✅ DONE
**Date:** 2026-03-30

### Apa yang sudah dibuat

**Backend:**
- `apps/api/prisma/schema.prisma` — tambah model `Notification` (id, user_id, type, title, body, is_read, meta JSON, created_at)
- `apps/api/src/routes/settings.ts` — `PUT /settings/profile`, `PUT /settings/preferences`, `PUT /settings/notifications`, `PUT /settings/security` (set/remove/verify PIN)
- `apps/api/src/routes/notifications.ts` — `GET /notifications`, `PATCH /:id/read`, `PATCH /read-all`, `DELETE /:id`, `DELETE /`
- `apps/api/src/routes/import.ts` — `POST /import/preview` (validate CSV + return preview), `POST /import/csv` (batch import)
- `apps/api/src/cron/notifications.ts` — `startNotificationCron()`: budget alerts (threshold %), debt reminders (H-1), weekly report (Senin)
- `apps/api/src/routes/auth.ts` — `GET /auth/me` sekarang mengembalikan `pin_set: !!user.pin_hash`
- bcryptjs dipasang untuk PIN hashing

**Frontend hooks:**
- `apps/web/src/hooks/useSettings.ts` — `useUpdateProfile`, `useUpdatePreferences`, `useUpdateNotifications`, `useSecurityAction`
- `apps/web/src/hooks/useNotifications.ts` — `useNotifications`, `useMarkRead`, `useMarkAllRead`, `useDeleteNotification`, `useClearAllNotifications`
- `apps/web/src/hooks/useHideBalance.ts` — `useHideBalance()` → `{ hideBalance, formatAmount }` — masks amounts as "Rp ****" when enabled
- `apps/web/src/hooks/useColorScheme.ts` — sync `user.color_scheme` ke `data-scheme` attribute pada `<html>`

**Frontend pages:**
- `apps/web/src/pages/Settings.tsx` — full rewrite: profile card, subscription status, tampilan (dark mode + hide balance + color picker), notifikasi toggles + threshold slider, keamanan (PIN), nav links (+ Import, Notifikasi), logout
- `apps/web/src/pages/Notifications.tsx` — inbox page: daftar notifikasi, tandai dibaca, hapus, mark-all-read, clear-all
- `apps/web/src/pages/Import.tsx` — upload CSV, preview, import batch

**Color scheme:**
- `apps/web/src/styles/globals.css` — 5 color schemes via CSS variables (`--accent-500` RGB channels): sage_green, ocean_blue, sunset_orange, purple_rain, cherry_blossom
- `apps/web/tailwind.config.ts` — accent colors pakai `rgb(var(--accent-500) / <alpha-value>)` — semua komponen yang pakai `accent-*` otomatis mengikuti scheme
- `apps/web/src/App.tsx` — `useColorScheme()` dipanggil di `ProtectedLayout`, set `data-scheme` pada `<html>`

**PWA / Offline:**
- `apps/web/vite.config.ts` — workbox config: cache fonts (CacheFirst), cache API reads (StaleWhileRevalidate 5 menit)

**Hide balance:**
- `BalanceCard`, `AccountCard`, `TransactionItem` — pakai `useHideBalance().formatAmount()` — saldo tampil "Rp ****" jika `hide_balance=true`

**PIN Lock:**
- `App.tsx` — `PinLockScreen` component: fullscreen overlay jika `user.pin_set && !sessionStorage.pin_unlocked`
- Unlock via `POST /settings/security { action: "verify_pin", pin }` → simpan `da_pin_unlocked=1` di sessionStorage

### Fitur
- **Settings page**: profile, tampilan (dark/color scheme/hide balance), notifikasi preferences, PIN keamanan, nav links
- **5 template warna**: Sage Green (default), Ocean Blue, Sunset Orange, Purple Rain, Cherry Blossom — applied globally via CSS vars
- **Hide balance**: semua nominal di BalanceCard, AccountCard, TransactionItem tampil "Rp ****"
- **PIN lock**: pasang/ubah/hapus PIN 4-6 digit; app terkunci saat reopen sampai PIN dimasukkan
- **Notifications inbox**: budget alert, debt reminder H-1, laporan mingguan Senin — semua via cron per jam
- **Import CSV**: upload → preview (valid/invalid row) → batch import → invalidate cache
- **PWA**: offline cache untuk fonts + API reads

### Routes baru
- `/notifications` → NotificationsPage
- `/import` → ImportPage

### Catatan untuk M011+
- `Notification` model: type = budget_alert | debt_reminder | weekly_report | transaction
- NotifCron berjalan setiap jam via recursive setTimeout
- Import CSV: kolom required `date, description, amount, type`; `category, account` opsional (match by name)
- PIN hash tersimpan di DB, tidak pernah dikirim ke frontend (hanya `pin_set: boolean`)

---

## M011 — Subscription & Billing (Midtrans) ✅ DONE
**Date:** 2026-03-31

### Apa yang sudah dibuat

**Backend:**
- `apps/api/src/lib/midtrans.ts` — Midtrans Snap REST API integration: `createSnapTransaction()` (create Snap token via fetch), `verifySignature()` (SHA-512 webhook verification), `isPaymentSuccess()`, `isPaymentPending()`, `isPaymentFailed()`, `generateOrderId()`
- `apps/api/src/routes/subscription.ts` — full rewrite, semua endpoint:
  - `GET /subscription` — status + effective plan + limits + locked features (authenticated)
  - `POST /subscription/checkout` — create Midtrans Snap payment token (authenticated). Validates plan type, checks existing premium, computes period, creates Payment record, calls Snap API, returns `{ snap_token, redirect_url, order_id, amount }`
  - `POST /subscription/webhook` — Midtrans notification handler (NO AUTH — uses signature verification). Handles settlement/capture → activate premium, pending → keep pending, deny/cancel/expire → mark failed
  - `GET /subscription/payments` — payment history (authenticated)
  - `PATCH /subscription/auto-renew` — toggle auto-renew (authenticated)
  - `POST /subscription/cancel` — cancel premium (turns off auto-renew, premium stays until premium_end)
- `apps/api/src/cron/subscription.ts` — `startSubscriptionCron()`: daily at 00:05, checks expired trials → downgrade to free, expired premiums (no auto-renew) → downgrade to free, expired premiums (auto-renew) → log warning + downgrade (production would trigger Midtrans charge)
- `apps/api/src/env.ts` — tambah `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`
- `apps/api/src/index.ts` — register `startSubscriptionCron()`

**Frontend:**
- `apps/web/src/hooks/useSubscription.ts` — full rewrite: `useSubscription()` (status + helpers), `useCheckout()` (mutasi checkout → redirect ke Midtrans), `usePaymentHistory()`, `useToggleAutoRenew()`, `useCancelSubscription()`
- `apps/web/src/pages/Subscription.tsx` — full rewrite:
  - Current plan card (trial/free/premium dengan info sisa hari)
  - Tabs: Plan | Riwayat Bayar
  - Feature comparison table (Free vs Premium)
  - Pricing cards: Premium Tahunan (recommended, hemat 30%) + Premium Bulanan → klik "Pilih" → checkout → redirect Midtrans
  - Premium management: auto-renew toggle, extend (saat ≤7 hari tersisa), cancel subscription
  - Payment history: list semua pembayaran + status badge (Berhasil/Menunggu/Gagal/Kedaluwarsa)
  - Cancel confirmation dialog
- `apps/web/src/pages/PaymentSuccess.tsx` — halaman redirect setelah bayar dari Midtrans:
  - Success state: 🎉 + daftar fitur unlocked + link ke dashboard
  - Pending state: ⏳ + info menunggu konfirmasi
  - Failed state: 😔 + link coba lagi
  - Auto-invalidate subscription cache saat load
- `apps/web/src/App.tsx` — tambah route `/payment-success` → PaymentSuccessPage (di dalam ProtectedLayout)

**Environment:**
- `.env` — tambah `FRONTEND_URL`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`
- Keys sandbox Midtrans kosong (perlu diisi dari Midtrans Dashboard)

### Feature Gate Enforcement (sudah ada dari M001–M010)
- ✅ `POST /accounts` → `requireFeature("unlimited_accounts")` — free max 2
- ✅ `POST /budgets` → `requireFeature("unlimited_budgets")` — free max 3
- ✅ `POST /gmail/connect`, `POST /gmail/sync` → `requireFeature("gmail_sync")` — free blocked
- ✅ `/export/*` → `requireFeature("export")` — free blocked
- ✅ `GET /reports/trend`, `GET /reports/yearly` → `requireFeature("full_reports")` — free blocked
- ✅ `GET /reports/monthly` — free user: hanya bulan ini (enforce di query)
- ✅ Frontend: `PremiumGate` component, `useSubscription().canUse()`, UpgradePrompt di semua fitur locked

### Checkout Flow
```
User klik "Pilih" (bulanan/tahunan)
  → POST /subscription/checkout { plan_type }
  → Backend: create Payment record + Midtrans Snap token
  → Frontend: redirect ke snap.redirect_url (halaman bayar Midtrans)
  → User bayar via transfer/QRIS/GoPay/dll
  → Midtrans POST webhook → /subscription/webhook
  → Backend: verify signature → update Payment status → activate premium
  → User redirect back → /payment-success?transaction_status=settlement
  → Frontend: invalidate cache → tampil success screen
```

### Subscription Lifecycle
```
Register → plan="trial", trial_end = now + 30 days
Trial habis → cron downgrade → plan="free"
Bayar → plan="premium", premium_end = now + 30/365 days
Premium habis + auto_renew OFF → cron downgrade → plan="free"
Cancel → auto_renew = false, premium stays until premium_end
```

### Type-Check
- ✅ `apps/api` — `npx tsc --noEmit` — 0 errors
- ✅ `apps/web` — `npx tsc --noEmit` — 0 errors

### Catatan untuk Production
- Isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` dari dashboard.midtrans.com
- Set `MIDTRANS_IS_PRODUCTION=true` untuk production
- Tambahkan URL webhook (`https://api.domain.com/v1/subscription/webhook`) di Midtrans Dashboard → Settings → Notification URL
- Auto-renew saat ini hanya flag — production butuh Midtrans Recurring/Subscription API untuk charge otomatis
- `FRONTEND_URL` harus di-set ke domain production untuk callback redirect

---

## M012 — Marketplace Email Parser ✅ DONE
**Date:** 2026-04-01

### Apa yang sudah dibuat

**Backend — Marketplace Parsers:**
- `apps/api/src/lib/marketplaceParsers.ts` — 5 marketplace parsers:
  - **Shopee**: sender `noreply@shopee.co.id`, `notification@shopee.co.id`. Extract produk, toko, total bayar. Filter hanya email pesanan/pembayaran (skip promo).
  - **Tokopedia**: sender `noreply@tokopedia.com`, `info@tokopedia.com`. Extract produk, toko, invoice number, total. Filter email invoice/pesanan.
  - **Grab**: sender `noreply@grab.com`, `receipt@grab.com`. Deteksi tipe layanan (GrabFood/GrabCar/GrabBike), extract resto/tujuan, total.
  - **Gojek**: sender `noreply@gojek.com`. Deteksi tipe layanan (GoFood/GoRide/GoCar), extract resto/tujuan, total. Filter hanya receipt (bukan GoPay payment notif).
  - **Traveloka**: sender `noreply@traveloka.com`. Deteksi tipe booking (Flight/Hotel/Activity), extract detail, total. Filter hanya booking confirmation.
- `detectMarketplace(sender, subject)` — deteksi marketplace dari sender email
- `buildMarketplaceEmailQuery(afterDate)` — Gmail search query untuk marketplace senders
- `suggestCategoryFromKeywords(text)` — Smart keyword → category mapping (9 kategori: Makanan & Minuman, Teknologi, Fashion, Kesehatan, Hiburan, Kecantikan, Rumah, dll)

**Backend — Anti-Duplikat Logic (CRITICAL):**
- `apps/api/src/lib/gmailSync.ts` — Full rewrite sync engine dengan 2-phase approach:
  - **Phase 1**: Fetch bank emails (same as before) → create PendingReview
  - **Phase 2**: Fetch marketplace emails → anti-duplikat check before creating
  - `findMatchingBankTransaction(userId, amount, date)` — cari transaksi bank dengan:
    - Amount tolerance: `±Rp 5.000` (untuk biaya admin marketplace)
    - Date tolerance: `±1 hari`
    - Source filter: hanya match `"gmail"` atau `"manual"` (bukan marketplace)
  - **Jika match transaksi**: ENRICH transaksi yang ada → update `description` + `category_id` + set `source = "gmail_enriched"`
  - **Jika match pending review bank**: ENRICH pending review → update `parsed_merchant` + `suggested_category_id` + gabung `bank_name`
  - **Jika tidak match**: Buat pending review baru seperti biasa
  - `suggestCategoryByName(userId, categoryName)` — match category by name (exact → partial → fallback to Belanja/Lainnya)
  - `SyncResult` sekarang include field `enriched` dan `marketplaces_detected`
  - `getGmailStats()` sekarang track `enriched` count (transactions with `source = "gmail_enriched"`)

**Backend — Routes Update:**
- `apps/api/src/routes/gmail.ts`:
  - `GET /gmail/status` — sekarang return `sources` (bank only) + `marketplace_sources` (marketplace only) + `enriched_count`
  - `POST /gmail/sync` — return `summary` string termasuk enriched count

**Frontend — Hooks:**
- `apps/web/src/hooks/useGmail.ts`:
  - Tambah type `MarketplaceSource` (id, marketplace_name, sender_email, is_active, total_detected)
  - `GmailStatus` sekarang include `marketplace_sources: MarketplaceSource[]` + `enriched_count: number`
  - `SyncResult` include `enriched`, `marketplaces_detected`, `summary`

**Frontend — GmailSync Page:**
- `apps/web/src/pages/GmailSync.tsx`:
  - **NotConnected page**: Tambah section "Marketplace & layanan yang didukung" (Shopee, Tokopedia, Grab, Gojek, Traveloka) di bawah bank list
  - **Status card**: Grid 4 kolom (Terdeteksi, Pending, Diperkaya, Akurasi) — kolom "Diperkaya" baru untuk enriched count
  - **Sync toast**: Tampil "X transaksi ditemukan, Y diperkaya" jika ada enrichment
  - **Tab Sumber**:
    - Section "Bank & Dompet Digital" (10 bank)
    - Section "Marketplace & Layanan" (5 marketplace) dengan icon & toggle
    - Info card "Anti-duplikat aktif" menjelaskan mekanisme enrichment
  - **PendingItem**: Marketplace bank_name (Shopee, Tokopedia, dll) tampil dengan warna yang sesuai
  - `SUPPORTED_MARKETPLACE_LIST` — 5 marketplace dengan icon + colorClass
  - `BANK_COLORS` — extended dengan marketplace colors

### Anti-Duplikat Flow
```
1. Sync bank email → buat PendingReview "Pembayaran ke Shopee Rp 178.000"
   (kategori generic: Belanja)
2. Sync marketplace email Shopee → cek amount ±Rp 5.000 & date ±1 hari
3a. Jika match approved transaction:
    → UPDATE description: "Shopee: Charger USB-C Fast Charging"
    → UPDATE category: Teknologi (lebih spesifik)
    → SET source: "gmail_enriched"
3b. Jika match pending review:
    → UPDATE pending review dengan detail marketplace
    → Skip create duplicate
4. Jika tidak match → buat PendingReview baru
```

### Smart Category Mapping
```
"makanan|food|resto|makan" → Makanan & Minuman
"elektronik|gadget|phone|laptop|charger" → Teknologi
"baju|celana|sepatu|fashion|pakaian" → Fashion
"obat|vitamin|kesehatan" → Kesehatan
"pulsa|internet|data" → Teknologi
"hotel|flight|pesawat|tiket" → Hiburan
"kecantikan|skincare|makeup|kosmetik" → Kecantikan
"rumah|furniture|dapur|kasur" → Rumah
fallback → Belanja
```

### Feature Gate
- Marketplace parsing ikut feature gate `gmail_sync` (Premium only) — tidak perlu gate terpisah
- Semua endpoint yang sudah di-gate (`POST /gmail/connect`, `POST /gmail/sync`) otomatis berlaku

### Type-Check
- ✅ `apps/api` — `npx tsc --noEmit` — 0 errors
- ✅ `apps/web` — `npx tsc --noEmit` — 0 errors

### Files Created
- `apps/api/src/lib/marketplaceParsers.ts` — marketplace parsers + category mapping + detection

### Files Modified
- `apps/api/src/lib/gmailSync.ts` — full rewrite: 2-phase sync, anti-duplikat, enrichment
- `apps/api/src/routes/gmail.ts` — marketplace_sources in status, enrichment stats
- `apps/web/src/hooks/useGmail.ts` — MarketplaceSource type, enriched fields
- `apps/web/src/pages/GmailSync.tsx` — marketplace sources UI, enriched stats, anti-duplikat info

### Catatan
- Marketplace parser menggunakan `bank_name` field di `GmailSource` untuk marketplace name (reuse existing schema — no migration needed)
- `source = "gmail_enriched"` pada Transaction menandakan transaksi bank yang sudah diperkaya dengan detail marketplace
- Gojek sender overlap dengan GoPay — marketplace parser memfilter berdasarkan content (receipt vs payment notif)
- Amount tolerance Rp 5.000 mengakomodasi biaya admin/ongkir yang mungkin berbeda antara email bank dan marketplace

---

## PWA Cache Fix + PIN Redesign + Push Notifications ✅ DONE
**Date:** 2026-04-01

### TASK 1 — PWA Cache Stale Fix

**Problem:** Service worker cache stale — PIN redesign dari session sebelumnya tidak muncul karena user masih serve versi lama.

**Fix di `apps/web/vite.config.ts`:**
- Tambah `cleanupOutdatedCaches: true` — hapus cache lama otomatis
- Tambah `navigateFallback: "/index.html"` — SPA routing via SW
- Tambah `additionalManifestEntries` dengan `revision: Date.now()` — force precache manifest berubah setiap build
- `skipWaiting: true` + `clientsClaim: true` sudah ada — SW baru langsung aktif

**Efek:** Setiap build menghasilkan SW baru dengan revision berbeda → browser auto-update tanpa perlu clear cache manual.

---

### TASK 2 — Push Notifications (Firebase Cloud Messaging)

**Backend — Prisma:**
- Model `PushSubscription` — id, user_id, fcm_token, device, is_active, created_at
- Field `notif_push` (Boolean, default true) di User model
- Migration `20260401_push_subscriptions` — applied di VPS

**Backend — Push Service:**
- `apps/api/src/services/push.service.ts`:
  - `sendPush(payload)` — core: buat in-app notification + kirim FCM push
  - `pushBudgetAlert()` — "⚠️ Budget Makanan hampir habis" + sisa Rp
  - `pushDebtReminder()` — "⏰ Hutang jatuh tempo besok" + nama + jumlah
  - `pushGmailSync()` — "📧 transaksi baru terdeteksi" + jumlah
  - `pushWeeklyReport()` — "📊 Laporan minggu ini" + total pengeluaran
  - `pushRecurring()` — "🔁 Transaksi berulang tercatat" + deskripsi + jumlah
  - Lazy-init Firebase Admin SDK — skip jika env vars kosong
  - Auto-cleanup stale FCM tokens (invalid/unregistered → `is_active = false`)

**Backend — Routes:**
- `apps/api/src/routes/push.ts`:
  - `POST /push/register` — upsert FCM token (reactivate jika sudah ada)
  - `POST /push/unregister` — deactivate FCM token
- `apps/api/src/routes/settings.ts` — `PUT /settings/notifications` support `notif_push` field
- `apps/api/src/routes/auth.ts` — `GET /auth/me` return `notif_push`

**Backend — Push Integration Points:**
1. **Budget threshold** — `cron/notifications.ts` → `pushBudgetAlert()` (menggantikan `createNotif` lama)
2. **Debt reminder H-1** — `cron/notifications.ts` → `pushDebtReminder()`
3. **Weekly report Senin** — `cron/notifications.ts` → `pushWeeklyReport()`
4. **Recurring transaction** — `cron/recurring.ts` → `pushRecurring()` setelah transaksi dibuat
5. **Gmail sync** — `routes/gmail.ts` → `pushGmailSync()` saat sync menemukan transaksi baru

**Backend — env.ts:**
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (optional — push disabled jika kosong)

**Frontend — Firebase:**
- `apps/web/public/firebase-messaging-sw.js` — service worker untuk receive background push
  - `onBackgroundMessage` → `showNotification` dengan icon DompetAing
  - `notificationclick` → focus/open app ke URL yang relevan
- `apps/web/src/lib/push.ts`:
  - `isPushSupported()` — cek browser support
  - `getPushPermission()` — cek permission state
  - `requestPushPermission()` — minta izin → get FCM token → POST /push/register
  - `onForegroundMessage()` — listener untuk push saat app terbuka → tampil toast
- `apps/web/src/hooks/usePush.ts` — hook: `supported`, `isEnabled`, `isBlocked`, `requestPermission()`

**Frontend — Settings:**
- Toggle "Notifikasi Push" di section Notifikasi
  - Jika belum aktif → tap toggle → `Notification.requestPermission()` → register token
  - Jika sudah granted → toggle terkunci di "Aktif"
  - Jika browser blokir → badge "Diblokir" + pesan "Aktifkan di pengaturan browser"
- `vite.config.ts` manifest: `gcm_sender_id: "103953800507"` untuk FCM

### Push Flow
```
1. User buka Settings → tap toggle "Notifikasi Push"
2. Browser minta izin → user tap "Allow"
3. Firebase SDK generate FCM token
4. Frontend POST /push/register { fcm_token, device: "web" }
5. Backend simpan di PushSubscription table

Saat event terjadi (misal budget 80%):
6. Backend: pushBudgetAlert(userId, ...)
   → INSERT Notification (in-app)
   → SELECT FCM tokens WHERE user_id AND is_active
   → Firebase Admin SDK messaging.send({ token, notification, data })
7. Browser receive push:
   - Jika app fokus → onForegroundMessage → showToast
   - Jika background → firebase-messaging-sw.js → showNotification
8. User tap notifikasi → open app ke /budget
```

### Type-Check
- ✅ `apps/api` — `npx tsc --noEmit` — 0 errors
- ✅ `apps/web` — `npx tsc --noEmit` — 0 errors

### Deploy
- ✅ `git push origin main` — commit dc87c0b
- ✅ VPS: `docker compose build --parallel` — both images built
- ✅ VPS: `prisma migrate deploy` — migration 20260401_push_subscriptions applied
- ✅ VPS: `docker compose up -d` — 3 containers healthy
- ✅ API health: `{"status":"ok"}`

### Catatan
- Firebase Admin SDK lazy-init — jika env vars kosong, push silently skipped tapi in-app notif tetap dibuat
- `sendPush()` selalu buat in-app notification terlebih dahulu, lalu coba kirim FCM (best-effort)
- Stale FCM tokens auto-deactivated saat Firebase return `messaging/registration-token-not-registered`
- `firebase-messaging-sw.js` di `/public` agar served di root path — required by FCM
- Untuk mengaktifkan push di production, isi env: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, dan frontend VITE vars: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`

