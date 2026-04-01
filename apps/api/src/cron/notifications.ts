import { prisma } from "../lib/db.js";
import { pushBudgetAlert, pushDebtReminder, pushWeeklyReport } from "../services/push.service.js";

const CRON_BATCH_SIZE = 100; // process at most 100 users per cron tick

// ── Exact-match dedup: check by type + ref_id stored in meta ──
async function alreadySent(
  user_id: string,
  type: string,
  ref_id: string,
  since: Date
): Promise<boolean> {
  const candidates = await prisma.notification.findMany({
    where: { user_id, type, created_at: { gte: since } },
    select: { meta: true },
  });
  return candidates.some((n) => {
    if (!n.meta) return false;
    try {
      const parsed = JSON.parse(n.meta) as { ref_id?: string };
      return parsed.ref_id === ref_id;
    } catch {
      return false;
    }
  });
}

// ── Budget threshold alerts ──
async function runBudgetAlerts() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const users = await prisma.user.findMany({
    where: { notif_budget_threshold: { gt: 0 } },
    select: {
      id: true,
      notif_budget_threshold: true,
      budgets: {
        where: { is_active: true, period_type: "monthly", period_month: month, period_year: year },
        include: { category: { select: { name: true, icon: true } } },
      },
    },
    take: CRON_BATCH_SIZE,
  });

  for (const user of users) {
    for (const budget of user.budgets) {
      try {
        const budgetAmount = Number(budget.amount);
        if (budgetAmount <= 0) continue;

        const agg = await prisma.transaction.aggregate({
          where: {
            user_id: user.id,
            category_id: budget.category_id,
            type: "expense",
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        const spent = Number(agg._sum.amount ?? 0);
        const pct = Math.round((spent / budgetAmount) * 100);

        if (pct < user.notif_budget_threshold) continue;

        // Dedup: one alert per budget per month
        const refId = `budget:${budget.id}:${year}-${month}`;
        if (await alreadySent(user.id, "budget_alert", refId, startDate)) continue;

        const icon = budget.category.icon ?? "💰";
        const remaining = budgetAmount - spent;

        await pushBudgetAlert(user.id, budget.category.name, icon, pct, remaining, budget.id);
      } catch (err) {
        console.error(`[NotifCron] budget alert error user=${user.id} budget=${budget.id}:`, err);
      }
    }
  }
}

// ── Debt due-date reminders (H-1) ──
async function runDebtReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const debts = await prisma.debt.findMany({
    where: {
      is_paid: false,
      reminder_enabled: true,
      due_date: { gte: tomorrowStart, lte: tomorrowEnd },
      user: { notif_debt_reminder: true },
    },
    include: { user: { select: { id: true } } },
    take: CRON_BATCH_SIZE,
  });

  for (const debt of debts) {
    try {
      const refId = `debt:${debt.id}:${todayStart.toISOString().slice(0, 10)}`;
      if (await alreadySent(debt.user.id, "debt_reminder", refId, todayStart)) continue;

      await pushDebtReminder(debt.user.id, debt.type, debt.person_name, Number(debt.amount), debt.id);
    } catch (err) {
      console.error(`[NotifCron] debt reminder error debt=${debt.id}:`, err);
    }
  }
}

// ── Weekly report (every Monday) ──
async function runWeeklyReport() {
  const now = new Date();
  if (now.getDay() !== 1) return; // Only Monday

  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - 7);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekKey = todayStart.toISOString().slice(0, 10);

  const users = await prisma.user.findMany({
    where: { notif_weekly_report: true },
    select: { id: true },
    take: CRON_BATCH_SIZE,
  });

  for (const user of users) {
    try {
      const refId = `weekly:${user.id}:${weekKey}`;
      if (await alreadySent(user.id, "weekly_report", refId, todayStart)) continue;

      const expenseAgg = await prisma.transaction.aggregate({
        where: { user_id: user.id, type: "expense", date: { gte: lastMonday, lte: lastSunday } },
        _sum: { amount: true },
      });

      const expense = Number(expenseAgg._sum.amount ?? 0);

      await pushWeeklyReport(user.id, expense);
    } catch (err) {
      console.error(`[NotifCron] weekly report error user=${user.id}:`, err);
    }
  }
}

// ── Main cron runner ──
let cronTimeout: ReturnType<typeof setTimeout> | null = null;

async function runNotificationCron() {
  await Promise.allSettled([
    runBudgetAlerts(),
    runDebtReminders(),
    runWeeklyReport(),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const names = ["budgetAlerts", "debtReminders", "weeklyReport"];
        console.error(`[NotifCron] ${names[i]} failed:`, r.reason);
      }
    });
  });

  cronTimeout = setTimeout(runNotificationCron, 60 * 60 * 1000);
}

export function startNotificationCron() {
  cronTimeout = setTimeout(runNotificationCron, 5000);
  console.log("[NotifCron] Started — runs every hour");
}

export function stopNotificationCron() {
  if (cronTimeout) {
    clearTimeout(cronTimeout);
    cronTimeout = null;
  }
}
