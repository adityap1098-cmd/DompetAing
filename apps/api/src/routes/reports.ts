import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { requireFeature, getEffectivePlan } from "../middleware/subscription.js";
import { ok, fail } from "@dompetaing/shared";

const reports = new Hono();
reports.use("*", requireAuth);

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function monthRange(month: number, year: number) {
  // Offset ke WIB (UTC+7): 1 April 00:00 WIB = 31 Maret 17:00 UTC
  const start = new Date(Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000 - 1);
  return { start, end };
}

// ── GET /reports/monthly?month=3&year=2026 ──
// All users: free = current month only
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

  const transactions = await prisma.transaction.findMany({
    where: {
      user_id: user.id,
      date: { gte: start, lte: end },
      type: { in: ["income", "expense"] },
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
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

  // Group by category
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

  // Daily breakdown (all days of the month, even if 0)
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyMap = new Map<string, { income: number; expense: number }>();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dailyMap.set(key, { income: 0, expense: 0 });
  }
  for (const t of transactions) {
    const key = t.date.toISOString().slice(0, 10);
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

  return c.json(
    ok({
      period: { month, year },
      income: incomeTotal,
      expense: expenseTotal,
      savings,
      expense_by_category,
      income_by_category,
      daily_breakdown,
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

    const inc = Number(agg.find((a) => a.type === "income")?._sum.amount ?? 0);
    const exp = Number(agg.find((a) => a.type === "expense")?._sum.amount ?? 0);

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

      const inc = Number(agg.find((a) => a.type === "income")?._sum.amount ?? 0);
      const exp = Number(agg.find((a) => a.type === "expense")?._sum.amount ?? 0);

      return { month, label: MONTH_SHORT[i], income: inc, expense: exp, savings: inc - exp };
    })
  );

  return c.json(ok({ year, months }));
});

export default reports;
