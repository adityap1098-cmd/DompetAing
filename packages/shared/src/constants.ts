// ═══════════════════════════════════════
// Shared Constants — DompetAing
// ═══════════════════════════════════════

export const PLAN_LIMITS = {
  free: {
    max_accounts: 2,
    max_budgets: 3,
  },
  trial: {
    max_accounts: null, // unlimited
    max_budgets: null,
  },
  premium: {
    max_accounts: null,
    max_budgets: null,
  },
} as const;

export const TRIAL_DAYS = 30;

export const PREMIUM_PRICES = {
  monthly: {
    amount: 29900,
    label: "Rp 29.900/bulan",
    period_days: 30,
  },
  yearly: {
    amount: 249000,
    label: "Rp 249.000/tahun",
    period_days: 365,
  },
} as const;

export const FREE_FEATURES = ["unlimited_transactions", "unlimited_categories", "unlimited_debts", "unlimited_recurring", "themes"] as const;

export const PREMIUM_FEATURES = ["gmail_sync", "export", "unlimited_accounts", "unlimited_budgets", "full_reports"] as const;

export const DEFAULT_CURRENCY = "IDR";
export const DEFAULT_LOCALE = "id";

export const BUDGET_ALERT_THRESHOLD_DEFAULT = 80; // percent

export const SESSION_COOKIE_NAME = "dompetaing_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export const DEFAULT_CATEGORIES = [
  // EXPENSE
  { name: "Makanan & Minuman", icon: "🍜", color: "#D4570B", type: "expense" as const, is_system: true, sub_categories: ["Sarapan", "Kopi", "Makan siang", "Makan malam", "Jajan"] },
  { name: "Transportasi", icon: "🛵", color: "#1A6BB5", type: "expense" as const, is_system: true, sub_categories: ["BBM", "Servis", "Parkir", "Tol"] },
  { name: "Teknologi", icon: "💻", color: "#6C3FC5", type: "expense" as const, is_system: true, sub_categories: ["Hosting", "Domain", "SaaS", "API"] },
  { name: "Belanja", icon: "🛒", color: "#C94A1C", type: "expense" as const, is_system: true, sub_categories: ["Online", "Offline", "Kebutuhan"] },
  { name: "Rumah", icon: "🏠", color: "#0E7490", type: "expense" as const, is_system: true, sub_categories: ["Listrik", "Air", "Internet", "Sewa"] },
  { name: "Hiburan", icon: "🎮", color: "#9333EA", type: "expense" as const, is_system: true, sub_categories: ["Game", "Streaming", "Nongkrong"] },
  { name: "Kesehatan", icon: "💊", color: "#059669", type: "expense" as const, is_system: true, sub_categories: ["Obat", "Dokter", "Gym"] },
  // INCOME
  { name: "Bisnis", icon: "💼", color: "#1E8A5A", type: "income" as const, is_system: true, sub_categories: ["Penjualan", "Jasa", "Komisi"] },
  { name: "Gaji", icon: "💰", color: "#047857", type: "income" as const, is_system: true, sub_categories: ["Gaji Pokok", "Bonus", "THR"] },
  { name: "Investasi", icon: "📈", color: "#0369A1", type: "income" as const, is_system: true, sub_categories: ["Dividen", "Capital Gain"] },
  // BOTH
  { name: "Transfer", icon: "🔄", color: "#64748B", type: "both" as const, is_system: true, sub_categories: [] },
  { name: "Lainnya", icon: "📦", color: "#78716C", type: "both" as const, is_system: true, sub_categories: [] },
] as const;
