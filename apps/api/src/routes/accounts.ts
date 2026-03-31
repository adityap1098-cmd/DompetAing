import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireFeature } from "../middleware/subscription.js";
import { prisma } from "../lib/db.js";
import { computeAccountBalance } from "../lib/computed.js";
import { CreateAccountSchema, UpdateAccountSchema } from "@dompetaing/shared";

const accounts = new Hono();

// ── All routes require auth ──
accounts.use("*", requireAuth);

// ── Serialise a Prisma Account row + computed balance ──
function serializeAccount(
  a: {
    id: string;
    user_id: string;
    name: string;
    type: string;
    bank_name: string | null;
    account_type: string | null;
    last_four: string | null;
    initial_balance: { toString(): string };
    color: string;
    icon: string;
    is_active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
  },
  balance: number
) {
  return {
    id: a.id,
    user_id: a.user_id,
    name: a.name,
    type: a.type,
    bank_name: a.bank_name,
    account_type: a.account_type,
    last_four: a.last_four,
    initial_balance: Number(a.initial_balance),
    balance,
    color: a.color,
    icon: a.icon,
    is_active: a.is_active,
    sort_order: a.sort_order,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

// ───────────────────────────────────────────────────────────────────
// GET /accounts — List all accounts with computed balance
// ───────────────────────────────────────────────────────────────────
accounts.get("/", async (c) => {
  const user = c.get("user");

  const rows = await prisma.account.findMany({
    where: { user_id: user.id, is_active: true },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });

  const data = await Promise.all(
    rows.map(async (a) => serializeAccount(a, await computeAccountBalance(a.id)))
  );

  return c.json({ success: true, data, error: null });
});

// ───────────────────────────────────────────────────────────────────
// GET /accounts/:id — Detail with balance + recent transactions
// ───────────────────────────────────────────────────────────────────
accounts.get("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const account = await prisma.account.findFirst({
    where: { id, user_id: user.id, is_active: true },
  });

  if (!account) {
    return c.json({ success: false, data: null, error: "Account not found" }, 404);
  }

  const [balance, recentTransactions] = await Promise.all([
    computeAccountBalance(account.id),
    prisma.transaction.findMany({
      where: {
        user_id: user.id,
        OR: [{ account_id: account.id }, { to_account_id: account.id }],
      },
      orderBy: { date: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        date: true,
        is_verified: true,
        account_id: true,
        to_account_id: true,
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
        sub_category: {
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  return c.json({
    success: true,
    error: null,
    data: {
      ...serializeAccount(account, balance),
      recent_transactions: recentTransactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    },
  });
});

// ───────────────────────────────────────────────────────────────────
// POST /accounts — Create account (requires unlimited_accounts feature gate)
// ───────────────────────────────────────────────────────────────────
accounts.post("/", requireFeature("unlimited_accounts"), async (c) => {
  const user = c.get("user");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, data: null, error: "Invalid JSON body" }, 400);
  }

  const parsed = CreateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, data: null, error: parsed.error.errors[0]?.message ?? "Validation error" },
      400
    );
  }

  const data = parsed.data;

  // Determine next sort_order
  const maxOrder = await prisma.account.aggregate({
    where: { user_id: user.id },
    _max: { sort_order: true },
  });
  const nextOrder = (maxOrder._max.sort_order ?? -1) + 1;

  const account = await prisma.account.create({
    data: {
      user_id: user.id,
      name: data.name,
      type: data.type,
      bank_name: data.bank_name ?? null,
      account_type: data.account_type ?? null,
      last_four: data.last_four ?? null,
      initial_balance: data.initial_balance,
      color: data.color,
      icon: data.icon,
      sort_order: nextOrder,
    },
  });

  const balance = await computeAccountBalance(account.id);

  return c.json({ success: true, error: null, data: serializeAccount(account, balance) }, 201);
});

// ───────────────────────────────────────────────────────────────────
// PUT /accounts/:id — Update account
// ───────────────────────────────────────────────────────────────────
accounts.put("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, data: null, error: "Invalid JSON body" }, 400);
  }

  const parsed = UpdateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, data: null, error: parsed.error.errors[0]?.message ?? "Validation error" },
      400
    );
  }

  const existing = await prisma.account.findFirst({
    where: { id, user_id: user.id, is_active: true },
  });

  if (!existing) {
    return c.json({ success: false, data: null, error: "Account not found" }, 404);
  }

  const data = parsed.data;

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.bank_name !== undefined && { bank_name: data.bank_name }),
      ...(data.account_type !== undefined && { account_type: data.account_type }),
      ...(data.last_four !== undefined && { last_four: data.last_four }),
      ...(data.initial_balance !== undefined && { initial_balance: data.initial_balance }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
    },
  });

  const balance = await computeAccountBalance(updated.id);

  return c.json({ success: true, error: null, data: serializeAccount(updated, balance) });
});

// ───────────────────────────────────────────────────────────────────
// DELETE /accounts/:id — Soft-delete (transactions cascade via Prisma onDelete)
// ───────────────────────────────────────────────────────────────────
accounts.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const existing = await prisma.account.findFirst({
    where: { id, user_id: user.id, is_active: true },
  });

  if (!existing) {
    return c.json({ success: false, data: null, error: "Account not found" }, 404);
  }

  await prisma.account.update({
    where: { id },
    data: { is_active: false },
  });

  return c.json({ success: true, error: null, data: { id } });
});

// ───────────────────────────────────────────────────────────────────
// PATCH /accounts/:id/reorder — Update sort_order
// ───────────────────────────────────────────────────────────────────
const ReorderSchema = z.object({
  sort_order: z.number().int().min(0),
});

accounts.patch("/:id/reorder", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, data: null, error: "Invalid JSON body" }, 400);
  }

  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, data: null, error: parsed.error.errors[0]?.message ?? "Validation error" },
      400
    );
  }

  const existing = await prisma.account.findFirst({
    where: { id, user_id: user.id, is_active: true },
  });

  if (!existing) {
    return c.json({ success: false, data: null, error: "Account not found" }, 404);
  }

  const updated = await prisma.account.update({
    where: { id },
    data: { sort_order: parsed.data.sort_order },
  });

  return c.json({
    success: true,
    error: null,
    data: { id: updated.id, sort_order: updated.sort_order },
  });
});

// ───────────────────────────────────────────────────────────────────
// GET /accounts/:id/transactions — Paginated transactions for an account
// Query: ?page=1&limit=20&month=3&year=2026
// ───────────────────────────────────────────────────────────────────
const TxnQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

accounts.get("/:id/transactions", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const queryParsed = TxnQuerySchema.safeParse(c.req.query());
  if (!queryParsed.success) {
    return c.json(
      { success: false, data: null, error: queryParsed.error.errors[0]?.message ?? "Invalid query" },
      400
    );
  }

  const { page, limit, month, year } = queryParsed.data;

  const existing = await prisma.account.findFirst({
    where: { id, user_id: user.id, is_active: true },
  });

  if (!existing) {
    return c.json({ success: false, data: null, error: "Account not found" }, 404);
  }

  // Build date range filter when month/year supplied
  let dateFilter: { gte: Date; lte: Date } | undefined;
  if (month !== undefined && year !== undefined) {
    dateFilter = {
      gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
      lte: new Date(year, month, 0, 23, 59, 59, 999),
    };
  } else if (year !== undefined) {
    dateFilter = {
      gte: new Date(year, 0, 1, 0, 0, 0, 0),
      lte: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }

  const where = {
    user_id: user.id,
    OR: [{ account_id: id }, { to_account_id: id }],
    ...(dateFilter ? { date: dateFilter } : {}),
  };

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        notes: true,
        date: true,
        source: true,
        is_verified: true,
        account_id: true,
        to_account_id: true,
        created_at: true,
        updated_at: true,
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
        sub_category: {
          select: { id: true, name: true },
        },
        account: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
        to_account: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
      },
    }),
  ]);

  return c.json({
    success: true,
    error: null,
    data: {
      transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    },
    meta: {
      total,
      page,
      limit,
      has_next: page * limit < total,
    },
  });
});

// ───────────────────────────────────────────────────────────────────
// GET /accounts/:id/stats — Monthly cash flow + top spending categories
// Query: ?months=6
// ───────────────────────────────────────────────────────────────────
const StatsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

accounts.get("/:id/stats", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const queryParsed = StatsQuerySchema.safeParse(c.req.query());
  if (!queryParsed.success) {
    return c.json(
      { success: false, data: null, error: queryParsed.error.errors[0]?.message ?? "Invalid query" },
      400
    );
  }

  const { months } = queryParsed.data;

  const existing = await prisma.account.findFirst({
    where: { id, user_id: user.id, is_active: true },
  });

  if (!existing) {
    return c.json({ success: false, data: null, error: "Account not found" }, 404);
  }

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1, 0, 0, 0, 0);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const txns = await prisma.transaction.findMany({
    where: {
      user_id: user.id,
      OR: [{ account_id: id }, { to_account_id: id }],
      is_verified: true,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      amount: true,
      type: true,
      date: true,
      account_id: true,
      to_account_id: true,
      category_id: true,
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
  });

  // Pre-populate monthly buckets
  const flowMap = new Map<string, { month: string; income: number; expense: number }>();
  for (let m = 0; m < months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    flowMap.set(key, { month: key, income: 0, expense: 0 });
  }

  // Category spend accumulator (expense only, tied to this account)
  const categorySpend = new Map<
    string,
    { category: { id: string; name: string; icon: string; color: string }; total: number }
  >();

  for (const t of txns) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = flowMap.get(key);
    if (!bucket) continue;

    const amount = Number(t.amount);

    if (t.type === "income" && t.account_id === id) {
      bucket.income += amount;
    } else if (t.type === "expense" && t.account_id === id) {
      bucket.expense += amount;

      if (t.category_id && t.category) {
        const entry = categorySpend.get(t.category_id);
        if (entry) {
          categorySpend.set(t.category_id, { ...entry, total: entry.total + amount });
        } else {
          categorySpend.set(t.category_id, { category: t.category, total: amount });
        }
      }
    } else if (t.type === "transfer") {
      if (t.account_id === id) {
        bucket.expense += amount;
      } else if (t.to_account_id === id) {
        bucket.income += amount;
      }
    }
  }

  const monthly_flow = Array.from(flowMap.values());

  const top_categories = Array.from(categorySpend.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(({ category, total }) => ({ category, total }));

  return c.json({
    success: true,
    error: null,
    data: { monthly_flow, top_categories },
  });
});

export default accounts;
