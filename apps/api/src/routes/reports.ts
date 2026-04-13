import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { requireFeature, getEffectivePlan } from "../middleware/subscription.js";
import { ok, fail } from "@dompetaing/shared";

const reports = new Hono();
reports.use("*", requireAuth);

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function monthRange(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000 - 1);
  return { start, end };
}

// ── GET /reports/monthly?month=3&year=2026 ──
reports.get("/monthly", async (c) => {
  const user = c.get("user");
  const now = new Date();
  const month = parseInt(c.req.query("month") ?? String(now.getMonth() + 1));
  const year = parseInt(c.req.query("year") ?? String(now.getFullYear()));

  const sub = await prisma.subscription.findUnique({ where: { user_id: user.id } });
  const plan = getEffectivePlan(sub);

  if (plan === "free") {
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    if (!isCurrentMonth) {
      return c.json(fail("Upgrade untuk akses laporan bulan lainnya"), 403);
    }
  }

  const { start, end } = monthRange(month, year);

  // ── Fetch current month transactions ──
  const transactions = await prisma.transaction.findMany({
    where: {
      user_id: user.id,
      date: { gte: start, lte: end },
      type: { in: ["income", "expense"] },
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, icon: true, color: true, type: true } },
    },
    orderBy: { date: "asc" },
  });

  const incomeTotal = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenseTotal = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const savings = incomeTotal - expenseTotal;
  const savingRate = incomeTotal > 0 ? Math.round((savings / incomeTotal) * 100) : 0;

  // ── Previous month comparison ──
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { start: prevStart, end: prevEnd } = monthRange(prevMonth, prevYear);

  const prevAgg = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      user_id: user.id,
      date: { gte: prevStart, lte: prevEnd },
      type: { in: ["income", "expense"] },
    },
    _sum: { amount: true },
    _count: true,
  });

  const prevIncome = Number(prevAgg.find((a) => a.type === "income")?._sum.amount ?? 0);
  const prevExpense = Number(prevAgg.find((a) => a.type === "expense")?._sum.amount ?? 0);
  const prevTxnCount = prevAgg.reduce((s, a) => s + a._count, 0);

  function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  const comparison = {
    prev_income: prevIncome,
    prev_expense: prevExpense,
    income_change: pctChange(incomeTotal, prevIncome),
    expense_change: pctChange(expenseTotal, prevExpense),
    prev_savings: prevIncome - prevExpense,
    prev_transaction_count: prevTxnCount,
  };

  // ── Group by category ──
  function groupByCategory(txns: typeof transactions) {
    const map = new Map<string, { category: { id: string | null; name: string; icon: string; color: string }; amount: number; count: number }>();
    for (const t of txns) {
      const key = t.category_id ?? "__none__";
      const cat = t.category
        ? { id: t.category.id, name: t.category.name, icon: t.category.icon, color: t.category.color }
        : { id: null, name: "Tanpa Kategori", icon: "📦", color: "#9CA3AF" };
      if (!map.has(key)) map.set(key, { category: cat, amount: 0, count: 0 });
      const e = map.get(key)!;
      e.amount += Number(t.amount);
      e.count++;
    }
    return map;
  }

  const expenseMap = groupByCategory(transactions.filter((t) => t.type === "expense"));
  const incomeMap = groupByCategory(transactions.filter((t) => t.type === "income"));

  const expense_by_category = Array.from(expenseMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((e) => ({
      category: e.category,
      amount: e.amount,
      percentage: expenseTotal > 0 ? Math.round((e.amount / expenseTotal) * 100) : 0,
      transaction_count: e.count,
    }));

  const income_by_category = Array.from(incomeMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((e) => ({
      category: e.category,
      amount: e.amount,
      percentage: incomeTotal > 0 ? Math.round((e.amount / incomeTotal) * 100) : 0,
      transaction_count: e.count,
    }));

  // ── Daily breakdown ──
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyMap = new Map<string, { income: number; expense: number }>();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dailyMap.set(key, { income: 0, expense: 0 });
  }
  for (const t of transactions) {
    // Convert to WIB date key
    const wib = new Date(t.date.getTime() + 7 * 60 * 60 * 1000);
    const key = wib.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      if (t.type === "income") entry.income += Number(t.amount);
      else entry.expense += Number(t.amount);
    }
  }

  const daily_breakdown = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    income: v.income,
    expense: v.expense,
  }));

  // ── Top 5 biggest expenses ──
  const top_transactions = transactions
    .filter((t) => t.type === "expense")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      category: t.category
        ? { id: t.category.id, name: t.category.name, icon: t.category.icon, color: t.category.color }
        : { id: null, name: "Tanpa Kategori", icon: "📦", color: "#9CA3AF" },
      account: t.account
        ? { id: t.account.id, name: t.account.name, icon: t.account.icon }
        : null,
    }));

  // ── Budget vs Actual ──
  const budgets = await prisma.budget.findMany({
    where: {
      user_id: user.id,
      period_month: month,
      period_year: year,
      is_active: true,
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  const budget_vs_actual = budgets.map((b) => {
    const catSpent = expense_by_category.find((c) => c.category.id === b.category_id);
    const spent = catSpent?.amount ?? 0;
    const budgetAmt = Number(b.amount);
    const pct = budgetAmt > 0 ? Math.round((spent / budgetAmt) * 100) : 0;
    return {
      category: b.category
        ? { id: b.category.id, name: b.category.name, icon: b.category.icon, color: b.category.color }
        : { id: null, name: "Tanpa Kategori", icon: "📦", color: "#9CA3AF" },
      budget: budgetAmt,
      spent,
      remaining: budgetAmt - spent,
      percentage: pct,
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // ── Per-account spending ──
  const accountMap = new Map<string, { id: string; name: string; icon: string; color: string; type: string; amount: number }>();
  for (const t of transactions.filter((t) => t.type === "expense")) {
    if (!t.account) continue;
    const key = t.account_id;
    if (!accountMap.has(key)) {
      accountMap.set(key, {
        id: t.account.id,
        name: t.account.name,
        icon: t.account.icon,
        color: t.account.color,
        type: t.account.type,
        amount: 0,
      });
    }
    accountMap.get(key)!.amount += Number(t.amount);
  }
  const per_account_spending = Array.from(accountMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((a) => ({
      account: { id: a.id, name: a.name, icon: a.icon, color: a.color, type: a.type },
      amount: a.amount,
      percentage: expenseTotal > 0 ? Math.round((a.amount / expenseTotal) * 100) : 0,
    }));

  // ── Daily average & busiest day ──
  const today = new Date();
  const wibToday = new Date(today.getTime() + 7 * 60 * 60 * 1000);
  const isCurrentMonth = month === (wibToday.getMonth() + 1) && year === wibToday.getFullYear();
  const elapsedDays = isCurrentMonth ? wibToday.getDate() : daysInMonth;
  const daily_average = elapsedDays > 0 ? Math.round(expenseTotal / elapsedDays) : 0;

  let busiest_day: { date: string; amount: number } | null = null;
  for (const [date, v] of dailyMap) {
    if (v.expense > 0 && (!busiest_day || v.expense > busiest_day.amount)) {
      busiest_day = { date, amount: v.expense };
    }
  }

  // ── Transaction count ──
  const total_transaction_count = transactions.length;

  // ── Monthly trend (last 6 months) ──
  const trendLabels: string[] = [];
  const trendIncome: number[] = [];
  const trendExpense: number[] = [];
  const trendSavings: number[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const { start: tStart, end: tEnd } = monthRange(m, y);

    const agg = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        user_id: user.id,
        date: { gte: tStart, lte: tEnd },
        type: { in: ["income", "expense"] },
      },
      _sum: { amount: true },
    });

    const inc = Number(agg.find((a) => a.type === "income")?._sum.amount ?? 0);
    const exp = Number(agg.find((a) => a.type === "expense")?._sum.amount ?? 0);

    trendLabels.push(`${MONTH_SHORT[m - 1]}`);
    trendIncome.push(inc);
    trendExpense.push(exp);
    trendSavings.push(inc - exp);
  }

  return c.json(
    ok({
      period: { month, year },
      // Summary
      income: incomeTotal,
      expense: expenseTotal,
      savings,
      saving_rate: savingRate,
      // Comparison vs previous month
      comparison,
      // Breakdowns
      expense_by_category,
      income_by_category,
      daily_breakdown,
      // Top transactions
      top_transactions,
      // Budget vs actual
      budget_vs_actual,
      // Per account
      per_account_spending,
      // Metrics
      daily_average,
      busiest_day,
      total_transaction_count,
      // 6 month trend
      monthly_trend: {
        labels: trendLabels,
        income: trendIncome,
        expense: trendExpense,
        savings: trendSavings,
      },
    })
  );
});

// ── GET /reports/trend?months=6 ── (premium/trial only)
reports.get("/trend", requireFeature("full_reports"), async (c) => {
  const user = c.get("user");
  const months = Math.min(parseInt(c.req.query("months") ?? "6"), 12);
  const now = new Date();

  const labels: string[] = [];
  const income: number[] = [];
  const expense: number[] = [];
  const savings: number[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const { start, end } = monthRange(m, y);

    const agg = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        user_id: user.id,
        date: { gte: start, lte: end },
        type: { in: ["income", "expense"] },
      },
      _sum: { amount: true },
    });

    const inc = Number(agg.find((a: any) => a.type === "income")?._sum.amount ?? 0);
    const exp = Number(agg.find((a: any) => a.type === "expense")?._sum.amount ?? 0);

    labels.push(`${MONTH_SHORT[m - 1]} '${String(y).slice(2)}`);
    income.push(inc);
    expense.push(exp);
    savings.push(inc - exp);
  }

  return c.json(ok({ labels, income, expense, savings }));
});

// ── GET /reports/yearly?year=2026 ── (premium/trial only)
reports.get("/yearly", requireFeature("full_reports"), async (c) => {
  const user = c.get("user");
  const year = parseInt(c.req.query("year") ?? String(new Date().getFullYear()));

  const months = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const month = i + 1;
      const { start, end } = monthRange(month, year);

      const agg = await prisma.transaction.groupBy({
        by: ["type"],
        where: {
          user_id: user.id,
          date: { gte: start, lte: end },
          type: { in: ["income", "expense"] },
        },
        _sum: { amount: true },
      });

      const inc = Number(agg.find((a: any) => a.type === "income")?._sum.amount ?? 0);
      const exp = Number(agg.find((a: any) => a.type === "expense")?._sum.amount ?? 0);

      return { month, label: MONTH_SHORT[i], income: inc, expense: exp, savings: inc - exp };
    })
  );

  return c.json(ok({ year, months }));
});

export default reports;
