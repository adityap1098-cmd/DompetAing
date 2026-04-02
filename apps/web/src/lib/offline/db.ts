import Dexie, { type EntityTable } from "dexie";

// ── Offline DB types (mirrors API data shapes) ──

export interface OfflineAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  bank_name: string | null;
  account_type: string | null;
  last_four: string | null;
  initial_balance: number;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  balance: number; // computed on sync
  created_at: string;
  updated_at: string;
}

export interface OfflineTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  category_id: string | null;
  sub_category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  description: string;
  notes: string | null;
  date: string;
  source: string;
  debt_id: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from API
  category?: { id: string; name: string; icon: string; color: string } | null;
  sub_category?: { id: string; name: string } | null;
  account?: { id: string; name: string; type: string; icon: string; color: string } | null;
  to_account?: { id: string; name: string; type: string; icon: string; color: string } | null;
  // Offline marker
  _offline?: boolean;
}

export interface OfflineCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  sub_categories?: Array<{ id: string; name: string; sort_order: number }>;
}

export interface OfflineBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period_type: string;
  period_month: number | null;
  period_year: number | null;
  is_active: boolean;
  spent: number;
  remaining: number;
  percentage: number;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; icon: string; color: string } | null;
}

export interface OfflineDebt {
  id: string;
  user_id: string;
  type: string;
  person_name: string;
  amount: number;
  description: string | null;
  borrow_date: string;
  due_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  auto_record: boolean;
  reminder_enabled: boolean;
  is_overdue?: boolean;
  days_remaining?: number;
  created_at: string;
  updated_at: string;
}

export interface OfflineRecurring {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: string;
  category_id: string | null;
  sub_category_id: string | null;
  account_id: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  active_days: string | null;
  is_active: boolean;
  next_run: string;
  last_run: string | null;
  monthly_total?: number;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; icon: string } | null;
  account?: { id: string; name: string } | null;
}

export type OfflineQueueAction = "create" | "update" | "delete";

export interface OfflineQueueItem {
  id?: number; // auto-increment
  entity: "transaction" | "account" | "category" | "budget" | "debt" | "recurring";
  action: OfflineQueueAction;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload?: Record<string, unknown>;
  tempId?: string; // temp ID for created items
  entityId?: string; // real or temp ID of the entity
  createdAt: number; // timestamp for ordering
  retryCount: number;
  lastError?: string;
}

export interface SyncMeta {
  key: string;
  value: string;
}

// ── Dexie DB ──

class DompetAingDB extends Dexie {
  accounts!: EntityTable<OfflineAccount, "id">;
  transactions!: EntityTable<OfflineTransaction, "id">;
  categories!: EntityTable<OfflineCategory, "id">;
  budgets!: EntityTable<OfflineBudget, "id">;
  debts!: EntityTable<OfflineDebt, "id">;
  recurring!: EntityTable<OfflineRecurring, "id">;
  offlineQueue!: EntityTable<OfflineQueueItem, "id">;
  syncMeta!: EntityTable<SyncMeta, "key">;

  constructor() {
    super("DompetAingOffline");

    this.version(1).stores({
      accounts: "id, user_id",
      transactions: "id, user_id, account_id, category_id, date, type",
      categories: "id, user_id, type",
      budgets: "id, user_id, category_id, period_month, period_year",
      debts: "id, user_id, type, is_paid",
      recurring: "id, user_id",
      offlineQueue: "++id, entity, createdAt",
      syncMeta: "key",
    });
  }
}

export const offlineDb = new DompetAingDB();

// ── Helper: clear all user data ──
export async function clearOfflineData() {
  await offlineDb.transaction(
    "rw",
    [
      offlineDb.accounts,
      offlineDb.transactions,
      offlineDb.categories,
      offlineDb.budgets,
      offlineDb.debts,
      offlineDb.recurring,
      offlineDb.offlineQueue,
      offlineDb.syncMeta,
    ],
    async () => {
      await offlineDb.accounts.clear();
      await offlineDb.transactions.clear();
      await offlineDb.categories.clear();
      await offlineDb.budgets.clear();
      await offlineDb.debts.clear();
      await offlineDb.recurring.clear();
      await offlineDb.offlineQueue.clear();
      await offlineDb.syncMeta.clear();
    }
  );
}
