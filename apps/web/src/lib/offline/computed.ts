import { offlineDb } from "./db";
import type { OfflineAccount, OfflineTransaction } from "./db";

/**
 * Compute account balance from local IndexedDB data.
 * balance = initial_balance
 *   + SUM(income where account_id)
 *   - SUM(expense where account_id)
 *   - SUM(transfer where account_id [source])
 *   + SUM(transfer where to_account_id [destination])
 */
export async function computeAccountBalance(
  accountId: string
): Promise<number> {
  const account = await offlineDb.accounts.get(accountId);
  if (!account) return 0;

  const txns = await offlineDb.transactions
    .where("account_id")
    .equals(accountId)
    .toArray();

  // Also get transfers TO this account
  const transfersIn = await offlineDb.transactions
    .filter(
      (t) => t.type === "transfer" && t.to_account_id === accountId
    )
    .toArray();

  let balance = account.initial_balance || 0;

  for (const t of txns) {
    const amount = Number(t.amount) || 0;
    switch (t.type) {
      case "income":
        balance += amount;
        break;
      case "expense":
        balance -= amount;
        break;
      case "transfer":
        balance -= amount; // money going out
        break;
    }
  }

  for (const t of transfersIn) {
    balance += Number(t.amount) || 0;
  }

  return balance;
}

/**
 * Compute net worth from all active accounts in IndexedDB.
 */
export async function computeNetWorth(): Promise<number> {
  const accounts = await offlineDb.accounts
    .filter((a) => a.is_active)
    .toArray();

  let total = 0;
  for (const account of accounts) {
    // Use pre-computed balance if available, else compute
    if (typeof account.balance === "number") {
      total += account.balance;
    } else {
      total += await computeAccountBalance(account.id);
    }
  }
  return total;
}

/**
 * Compute budget spent for a category in a period from local data.
 */
export async function computeBudgetSpent(
  categoryId: string,
  month: number,
  year: number
): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const txns = await offlineDb.transactions
    .where("category_id")
    .equals(categoryId)
    .filter(
      (t) =>
        t.type === "expense" &&
        new Date(t.date) >= startDate &&
        new Date(t.date) <= endDate
    )
    .toArray();

  return txns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * Compute income/expense totals for a month from local data.
 */
export async function computeMonthTotals(
  month: number,
  year: number
): Promise<{ income: number; expense: number }> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const txns = await offlineDb.transactions
    .filter(
      (t) =>
        (t.type === "income" || t.type === "expense") &&
        new Date(t.date) >= startDate &&
        new Date(t.date) <= endDate
    )
    .toArray();

  let income = 0;
  let expense = 0;
  for (const t of txns) {
    const amount = Number(t.amount) || 0;
    if (t.type === "income") income += amount;
    if (t.type === "expense") expense += amount;
  }

  return { income, expense };
}

/**
 * Get debt summary from local data.
 */
export async function computeDebtSummary(): Promise<{
  total_hutang: number;
  total_piutang: number;
  overdue_count: number;
}> {
  const debts = await offlineDb.debts.filter((d) => !d.is_paid).toArray();

  let total_hutang = 0;
  let total_piutang = 0;
  let overdue_count = 0;
  const now = new Date();

  for (const d of debts) {
    const amount = Number(d.amount) || 0;
    if (d.type === "hutang") total_hutang += amount;
    if (d.type === "piutang") total_piutang += amount;
    if (d.due_date && new Date(d.due_date) < now) overdue_count++;
  }

  return { total_hutang, total_piutang, overdue_count };
}

/**
 * Get all accounts with computed balances from local data.
 */
export async function getOfflineAccounts(): Promise<OfflineAccount[]> {
  return offlineDb.accounts.orderBy("sort_order").toArray();
}

/**
 * Get recent transactions from local data.
 */
export async function getOfflineTransactions(
  limit = 50
): Promise<OfflineTransaction[]> {
  // Sort by date descending
  const all = await offlineDb.transactions.toArray();
  all.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return all.slice(0, limit);
}
