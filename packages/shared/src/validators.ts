import { z } from "zod";

// ── AUTH ──
export const LoginCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

// ── ACCOUNT ──
export const CreateAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["bank", "ewallet", "cash"]),
  bank_name: z.string().max(50).optional(),
  account_type: z.string().max(50).optional(),
  last_four: z.string().length(4).optional(),
  initial_balance: z.number().default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#2E7D5A"),
  icon: z.string().default("🏦"),
});

export const UpdateAccountSchema = CreateAccountSchema.partial();

// ── CATEGORY ──
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().min(1).max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  type: z.enum(["expense", "income", "both"]),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CreateSubCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

// ── TRANSACTION ──
const TransactionBaseSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["expense", "income", "transfer"]),
  category_id: z.string().cuid().optional(),
  sub_category_id: z.string().cuid().optional(),
  account_id: z.string().cuid(),
  to_account_id: z.string().cuid().optional(),
  description: z.string().min(1).max(255),
  notes: z.string().max(1000).optional(),
  date: z.string().datetime(),
  debt_id: z.string().cuid().optional(),
});

export const CreateTransactionSchema = TransactionBaseSchema.refine(
  (data) => !(data.type === "transfer" && !data.to_account_id),
  { message: "to_account_id required for transfer" }
);

export const UpdateTransactionSchema = TransactionBaseSchema.partial().refine(
  (data) => !(data.type === "transfer" && !data.to_account_id),
  { message: "to_account_id required for transfer" }
);

export const TransactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(["expense", "income", "transfer"]).optional(),
  category_id: z.string().cuid().optional(),
  sub_category_id: z.string().cuid().optional(),
  account_id: z.string().cuid().optional(),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  amount_min: z.coerce.number().optional(),
  amount_max: z.coerce.number().optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
});

// ── BUDGET ──
export const CreateBudgetSchema = z.object({
  category_id: z.string().cuid(),
  amount: z.number().positive(),
  period_type: z.enum(["monthly", "weekly", "custom"]),
  period_month: z.number().int().min(1).max(12).optional(),
  period_year: z.number().int().min(2000).max(2100).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const UpdateBudgetSchema = z.object({
  amount: z.number().positive(),
});

// ── DEBT ──
export const CreateDebtSchema = z.object({
  type: z.enum(["hutang", "piutang"]),
  person_name: z.string().min(1).max(100),
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  borrow_date: z.string().datetime(),
  due_date: z.string().datetime().optional(),
  reminder_enabled: z.boolean().default(true),
  auto_record: z.boolean().default(true),
});

export const UpdateDebtSchema = CreateDebtSchema.partial();

export const PayDebtSchema = z.object({
  auto_record: z.boolean(),
  account_id: z.string().cuid().optional(),
});

// ── RECURRING ──
export const CreateRecurringSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  type: z.enum(["expense", "income"]),
  category_id: z.string().cuid().optional(),
  sub_category_id: z.string().cuid().optional(),
  account_id: z.string().cuid(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  day_of_week: z.number().int().min(0).max(6).optional(), // 0=Sun … 6=Sat
  day_of_month: z.number().int().min(1).max(31).optional(),
  active_days: z.string().optional(),
});

export const UpdateRecurringSchema = CreateRecurringSchema.partial();

// ── SETTINGS ──
export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
});

export const UpdatePreferencesSchema = z.object({
  currency: z.string().length(3).optional(),
  locale: z.string().max(10).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  color_scheme: z.string().optional(),
  hide_balance: z.boolean().optional(),
});

export const UpdateNotificationsSchema = z.object({
  notif_budget_threshold: z.number().int().min(1).max(100).optional(),
  notif_weekly_report: z.boolean().optional(),
  notif_transaction: z.boolean().optional(),
  notif_debt_reminder: z.boolean().optional(),
});

export const UpdateSecuritySchema = z.object({
  old_pin: z.string().length(6).optional(),
  new_pin: z.string().length(6),
});

// ── SUBSCRIPTION ──
export const CheckoutSchema = z.object({
  plan_type: z.enum(["monthly", "yearly"]),
});
