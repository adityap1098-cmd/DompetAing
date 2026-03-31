// ═══════════════════════════════════════
// Shared TypeScript Types — DompetAing
// ═══════════════════════════════════════

export type Plan = "trial" | "free" | "premium";
export type TransactionType = "expense" | "income" | "transfer";
export type AccountType = "bank" | "ewallet" | "cash";
export type PeriodType = "monthly" | "weekly" | "custom";
export type DebtType = "hutang" | "piutang";
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type Feature =
  | "gmail_sync"
  | "export"
  | "unlimited_accounts"
  | "unlimited_budgets"
  | "full_reports";

// ── USER ──
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  google_id: string;
  currency: string;
  locale: string;
  theme: "light" | "dark";
  color_scheme: string;
  hide_balance: boolean;
  gmail_connected: boolean;
  gmail_auto_sync: boolean;
  gmail_sync_interval: number;
  gmail_auto_categorize: boolean;
  gmail_review_before_save: boolean;
  gmail_last_sync: string | null;
  notif_budget_threshold: number;
  notif_weekly_report: boolean;
  notif_transaction: boolean;
  notif_debt_reminder: boolean;
  pin_set: boolean;
  created_at: string;
  updated_at: string;
}

// ── SUBSCRIPTION ──
export interface Subscription {
  id: string;
  user_id: string;
  plan: Plan;
  effective_plan: Plan;
  is_trial_active: boolean;
  trial_start: string;
  trial_end: string;
  trial_days_left: number;
  premium_start: string | null;
  premium_end: string | null;
  premium_days_left: number | null;
  auto_renew: boolean;
  is_active: boolean;
  limits: {
    max_accounts: number | null;
    max_budgets: number | null;
    current_accounts: number;
    current_budgets: number;
  };
  locked_features: Feature[];
  created_at: string;
  updated_at: string;
}

// ── ACCOUNT ──
export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  bank_name: string | null;
  account_type: string | null;
  last_four: string | null;
  initial_balance: number;
  balance: number; // computed
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ── CATEGORY ──
export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income" | "both";
  is_system: boolean;
  sort_order: number;
  sub_categories: SubCategory[];
  created_at: string;
  updated_at: string;
}

// ── TRANSACTION ──
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  sub_category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  description: string;
  notes: string | null;
  date: string;
  source: "manual" | "gmail" | "recurring";
  gmail_message_id: string | null;
  recurring_id: string | null;
  debt_id: string | null;
  is_verified: boolean;
  category?: Pick<Category, "id" | "name" | "icon" | "color"> | null;
  sub_category?: Pick<SubCategory, "id" | "name"> | null;
  account?: Pick<Account, "id" | "name" | "type" | "icon" | "color">;
  to_account?: Pick<Account, "id" | "name" | "type" | "icon" | "color"> | null;
  created_at: string;
  updated_at: string;
}

// ── BUDGET ──
export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category: Pick<Category, "id" | "name" | "icon" | "color">;
  amount: number;
  spent: number; // computed
  remaining: number; // computed
  percentage: number; // computed
  period_type: PeriodType;
  period_month: number | null;
  period_year: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── RECURRING TRANSACTION ──
export interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  category_id: string | null;
  sub_category_id: string | null;
  account_id: string;
  frequency: Frequency;
  day_of_week: number | null;
  day_of_month: number | null;
  active_days: string | null;
  is_active: boolean;
  next_run: string;
  last_run: string | null;
  monthly_total: number; // computed
  category: Pick<Category, "id" | "name" | "icon" | "color"> | null;
  account: Pick<Account, "id" | "name" | "type" | "icon" | "color">;
  created_at: string;
  updated_at: string;
}

// ── DEBT ──
export interface Debt {
  id: string;
  user_id: string;
  type: DebtType;
  person_name: string;
  amount: number;
  description: string | null;
  borrow_date: string;
  due_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  auto_record: boolean;
  reminder_enabled: boolean;
  is_overdue: boolean; // computed
  days_remaining: number | null; // computed
  created_at: string;
  updated_at: string;
}

// ── API RESPONSE ENVELOPE ──
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
  };
}

export function ok<T>(data: T, meta?: ApiResponse<T>["meta"]): ApiResponse<T> {
  return { success: true, data, error: null, meta };
}

export function fail(error: string): ApiResponse<null> {
  return { success: false, data: null, error };
}
