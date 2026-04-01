import { prisma } from "./db.js";

// ── ACCOUNT BALANCE ──
// Computed: initial_balance + SUM(income) - SUM(expense) - SUM(transfer out) + SUM(transfer in)
export async function computeAccountBalance(accountId: string): Promise<number> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    select: { initial_balance: true },
  });

  const result = await prisma.$queryRaw<[{ balance: string }]>`
    SELECT
      ${account.initial_balance} + COALESCE(
        (SELECT SUM(
          CASE
            WHEN t.type = 'income' AND t.account_id = ${accountId} THEN t.amount
            WHEN t.type = 'expense' AND t.account_id = ${accountId} THEN -t.amount
            WHEN t.type = 'transfer' AND t.account_id = ${accountId} THEN -t.amount
            WHEN t.type = 'transfer' AND t.to_account_id = ${accountId} THEN t.amount
            ELSE 0
          END
        ) FROM transactions t
        WHERE (t.account_id = ${accountId} OR t.to_account_id = ${accountId})
          AND t.is_verified = true
        ), 0
      ) AS balance
  `;

  return parseFloat(result[0]?.balance ?? "0");
}

// ── NET WORTH ──
export async function computeNetWorth(userId: string): Promise<number> {
  const accounts = await prisma.account.findMany({
    where: { user_id: userId, is_active: true },
    select: { id: true },
  });

  const balances = await Promise.all(
    accounts.map((a) => computeAccountBalance(a.id))
  );

  return balances.reduce((sum, b) => sum + b, 0);
}

// ── BUDGET SPENT ──
export async function computeBudgetSpent(
  userId: string,
  categoryId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: {
      user_id: userId,
      category_id: categoryId,
      type: "expense",
      is_verified: true,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    _sum: { amount: true },
  });

  return Number(result._sum.amount ?? 0);
}

// ── BUDGET PERIOD DATES ──
export function getBudgetPeriodDates(
  periodType: string,
  periodMonth?: number | null,
  periodYear?: number | null,
  startDate?: Date | null,
  endDate?: Date | null
): { start: Date; end: Date } {
  if (periodType === "custom" && startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  const now = new Date();
  const month = periodMonth ?? now.getMonth() + 1;
  const year = periodYear ?? now.getFullYear();

  if (periodType === "monthly") {
    // Offset ke WIB (UTC+7): 1 April 00:00 WIB = 31 Maret 17:00 UTC
    const start = new Date(Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000);
    const end = new Date(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000 - 1);
    return { start, end };
  }

  if (periodType === "weekly") {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Fallback: current month (WIB offset)
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 7 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 7 * 60 * 60 * 1000 - 1);
  return { start, end };
}
