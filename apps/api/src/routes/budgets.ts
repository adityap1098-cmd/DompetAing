import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { requireFeature } from "../middleware/subscription.js";
import { prisma } from "../lib/db.js";
import {
  CreateBudgetSchema,
  UpdateBudgetSchema,
  ok,
  fail,
} from "@dompetaing/shared";
import { computeBudgetSpent, getBudgetPeriodDates } from "../lib/computed.js";

const budgets = new Hono();
budgets.use("*", requireAuth);

// ── Raw type for Prisma result ──
interface RawBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: { toString(): string };
  period_type: string;
  period_month: number | null;
  period_year: number | null;
  start_date: Date | null;
  end_date: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  category: { id: string; name: string; icon: string; color: string };
}

function serializeBudget(b: RawBudget, spent: number) {
  const amount = Number(b.amount);
  return {
    id: b.id,
    user_id: b.user_id,
    category_id: b.category_id,
    category: b.category,
    amount,
    spent,
    remaining: amount - spent,
    percentage: amount > 0 ? (spent / amount) * 100 : 0,
    period_type: b.period_type,
    period_month: b.period_month,
    period_year: b.period_year,
    start_date: b.start_date?.toISOString() ?? null,
    end_date: b.end_date?.toISOString() ?? null,
    is_active: b.is_active,
    created_at: b.created_at.toISOString(),
    updated_at: b.updated_at.toISOString(),
  };
}

// ── GET /budgets?month=&year= ──
budgets.get("/", async (c) => {
  const user = c.get("user");
  const now = new Date();
  const month = parseInt(c.req.query("month") ?? String(now.getMonth() + 1));
  const year = parseInt(c.req.query("year") ?? String(now.getFullYear()));

  const rows = await prisma.budget.findMany({
    where: {
      user_id: user.id,
      is_active: true,
      period_type: "monthly",
      period_month: month,
      period_year: year,
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
    orderBy: { created_at: "asc" },
  });

  const { start, end } = getBudgetPeriodDates("monthly", month, year);

  const budgetsWithSpent = await Promise.all(
    rows.map(async (b) => {
      const spent = await computeBudgetSpent(user.id, b.category_id, start, end);
      return serializeBudget(b as unknown as RawBudget, spent);
    })
  );

  const totalBudget = budgetsWithSpent.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgetsWithSpent.reduce((s, b) => s + b.spent, 0);

  return c.json(
    ok({
      total_budget: totalBudget,
      total_spent: totalSpent,
      percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      month,
      year,
      budgets: budgetsWithSpent,
    })
  );
});

// ── POST /budgets/copy-previous (must be before /:id) ──
budgets.post("/copy-previous", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as {
    from_month: number;
    from_year: number;
    to_month: number;
    to_year: number;
  };
  const { from_month, from_year, to_month, to_year } = body;

  const existing = await prisma.budget.findMany({
    where: {
      user_id: user.id,
      period_type: "monthly",
      period_month: from_month,
      period_year: from_year,
      is_active: true,
    },
  });

  if (existing.length === 0) {
    return c.json(fail("Tidak ada budget di bulan tersebut"), 404);
  }

  // Remove existing target-month budgets before copying
  await prisma.budget.deleteMany({
    where: {
      user_id: user.id,
      period_type: "monthly",
      period_month: to_month,
      period_year: to_year,
    },
  });

  const result = await prisma.budget.createMany({
    data: existing.map((b) => ({
      user_id: user.id,
      category_id: b.category_id,
      amount: b.amount,
      period_type: "monthly" as const,
      period_month: to_month,
      period_year: to_year,
      is_active: true,
    })),
    skipDuplicates: true,
  });

  return c.json(ok({ copied: result.count }), 201);
});

// ── GET /budgets/:id ──
budgets.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const budget = await prisma.budget.findFirst({
    where: { id, user_id: user.id },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  if (!budget) return c.json(fail("Budget tidak ditemukan"), 404);

  const { start, end } = getBudgetPeriodDates(
    budget.period_type,
    budget.period_month,
    budget.period_year,
    budget.start_date,
    budget.end_date
  );

  const [spent, subBreakdown, recentTransactions] = await Promise.all([
    computeBudgetSpent(user.id, budget.category_id, start, end),
    prisma.transaction.groupBy({
      by: ["sub_category_id"],
      where: {
        user_id: user.id,
        category_id: budget.category_id,
        type: "expense",
        is_verified: true,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.transaction.findMany({
      where: {
        user_id: user.id,
        category_id: budget.category_id,
        type: "expense",
        is_verified: true,
        date: { gte: start, lte: end },
      },
      include: {
        account: { select: { id: true, name: true, type: true, icon: true, color: true } },
        sub_category: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  // Resolve sub-category names
  const subIds = subBreakdown
    .map((s) => s.sub_category_id)
    .filter((id): id is string => id !== null);

  const subCategories =
    subIds.length > 0
      ? await prisma.subCategory.findMany({
          where: { id: { in: subIds } },
          select: { id: true, name: true },
        })
      : [];

  const subNameMap = new Map(subCategories.map((s) => [s.id, s.name]));

  return c.json(
    ok({
      ...serializeBudget(budget as unknown as RawBudget, spent),
      sub_breakdown: subBreakdown.map((s) => ({
        sub_category_id: s.sub_category_id,
        sub_category_name: s.sub_category_id
          ? (subNameMap.get(s.sub_category_id) ?? "Lainnya")
          : "Umum",
        spent: Number(s._sum.amount ?? 0),
        transaction_count: s._count.id,
        percentage:
          spent > 0 ? (Number(s._sum.amount ?? 0) / spent) * 100 : 0,
      })),
      recent_transactions: recentTransactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        description: t.description,
        date: t.date.toISOString(),
        sub_category: t.sub_category,
        account: t.account,
      })),
    })
  );
});

// ── POST /budgets ──
budgets.post("/", requireFeature("unlimited_budgets"), async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = CreateBudgetSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  // Prevent duplicate budget for same category + period
  const existing = await prisma.budget.findFirst({
    where: {
      user_id: user.id,
      category_id: parsed.data.category_id,
      period_type: parsed.data.period_type,
      period_month: parsed.data.period_month ?? null,
      period_year: parsed.data.period_year ?? null,
      is_active: true,
    },
  });
  if (existing) {
    return c.json(
      fail("Budget untuk kategori ini sudah ada di periode tersebut"),
      409
    );
  }

  const budget = await prisma.budget.create({
    data: {
      user_id: user.id,
      category_id: parsed.data.category_id,
      amount: parsed.data.amount,
      period_type: parsed.data.period_type,
      period_month: parsed.data.period_month ?? null,
      period_year: parsed.data.period_year ?? null,
      start_date: parsed.data.start_date ? new Date(parsed.data.start_date) : null,
      end_date: parsed.data.end_date ? new Date(parsed.data.end_date) : null,
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  return c.json(ok(serializeBudget(budget as unknown as RawBudget, 0)), 201);
});

// ── PUT /budgets/:id ──
budgets.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateBudgetSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const existing = await prisma.budget.findFirst({
    where: { id, user_id: user.id },
  });
  if (!existing) return c.json(fail("Budget tidak ditemukan"), 404);

  const budget = await prisma.budget.update({
    where: { id },
    data: { amount: parsed.data.amount },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  const { start, end } = getBudgetPeriodDates(
    budget.period_type,
    budget.period_month,
    budget.period_year,
    budget.start_date,
    budget.end_date
  );
  const spent = await computeBudgetSpent(user.id, budget.category_id, start, end);

  return c.json(ok(serializeBudget(budget as unknown as RawBudget, spent)));
});

// ── DELETE /budgets/:id ──
budgets.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await prisma.budget.findFirst({
    where: { id, user_id: user.id },
  });
  if (!existing) return c.json(fail("Budget tidak ditemukan"), 404);

  await prisma.budget.delete({ where: { id } });
  return c.json(ok({ deleted: true }));
});

export default budgets;
