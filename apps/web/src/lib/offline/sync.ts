import { offlineDb } from "./db";
import { api } from "@/lib/api";
import type {
  OfflineAccount,
  OfflineTransaction,
  OfflineCategory,
  OfflineBudget,
  OfflineDebt,
  OfflineRecurring,
} from "./db";

// ── Sync server data → IndexedDB ──

export async function syncAccounts(): Promise<void> {
  try {
    const accounts = await api.get<OfflineAccount[]>("/accounts");
    await offlineDb.accounts.clear();
    if (accounts.length) await offlineDb.accounts.bulkPut(accounts);
    await offlineDb.syncMeta.put({
      key: "accounts_synced_at",
      value: new Date().toISOString(),
    });
  } catch {
    // Silently fail — we'll use cached data
  }
}

export async function syncTransactions(): Promise<void> {
  try {
    // Fetch a generous page of recent transactions for offline use
    const res = await api.get<{
      items: OfflineTransaction[];
      meta: { total: number };
    }>("/transactions?limit=200&sort=date_desc");
    await offlineDb.transactions.clear();
    if (res.items.length) await offlineDb.transactions.bulkPut(res.items);
    await offlineDb.syncMeta.put({
      key: "transactions_synced_at",
      value: new Date().toISOString(),
    });
  } catch {
    // Silently fail
  }
}

export async function syncCategories(): Promise<void> {
  try {
    const categories = await api.get<OfflineCategory[]>("/categories");
    await offlineDb.categories.clear();
    if (categories.length) await offlineDb.categories.bulkPut(categories);
    await offlineDb.syncMeta.put({
      key: "categories_synced_at",
      value: new Date().toISOString(),
    });
  } catch {
    // Silently fail
  }
}

export async function syncBudgets(
  month: number,
  year: number
): Promise<void> {
  try {
    const res = await api.get<{
      budgets: OfflineBudget[];
      total_budget: number;
      total_spent: number;
      percentage: number;
    }>(`/budgets?month=${month}&year=${year}`);
    // Only clear budgets for this period
    const existing = await offlineDb.budgets
      .where("period_month")
      .equals(month)
      .and((b) => b.period_year === year)
      .toArray();
    if (existing.length) {
      await offlineDb.budgets.bulkDelete(existing.map((b) => b.id));
    }
    if (res.budgets.length) await offlineDb.budgets.bulkPut(res.budgets);
    await offlineDb.syncMeta.put({
      key: `budgets_synced_at_${month}_${year}`,
      value: new Date().toISOString(),
    });
  } catch {
    // Silently fail
  }
}

export async function syncDebts(): Promise<void> {
  try {
    const res = await api.get<{ debts: OfflineDebt[] }>("/debts?status=all");
    await offlineDb.debts.clear();
    if (res.debts.length) await offlineDb.debts.bulkPut(res.debts);
    await offlineDb.syncMeta.put({
      key: "debts_synced_at",
      value: new Date().toISOString(),
    });
  } catch {
    // Silently fail
  }
}

export async function syncRecurring(): Promise<void> {
  try {
    const res = await api.get<{ items: OfflineRecurring[] }>("/recurring");
    await offlineDb.recurring.clear();
    if (res.items.length) await offlineDb.recurring.bulkPut(res.items);
    await offlineDb.syncMeta.put({
      key: "recurring_synced_at",
      value: new Date().toISOString(),
    });
  } catch {
    // Silently fail
  }
}

/**
 * Full sync: pull all user data from server → IndexedDB.
 * Called on login, on app start (if online), and periodically.
 */
export async function syncAllData(): Promise<void> {
  const now = new Date();
  await Promise.allSettled([
    syncAccounts(),
    syncTransactions(),
    syncCategories(),
    syncBudgets(now.getMonth() + 1, now.getFullYear()),
    syncDebts(),
    syncRecurring(),
  ]);
  await offlineDb.syncMeta.put({
    key: "last_full_sync",
    value: new Date().toISOString(),
  });
}
