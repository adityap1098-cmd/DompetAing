import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { computeNextRun, computeMonthlyTotal, runDueRecurring } from "../lib/recurring.js";
import {
  CreateRecurringSchema,
  UpdateRecurringSchema,
  ok,
  fail,
} from "@dompetaing/shared";

const recurring = new Hono();
recurring.use("*", requireAuth);

// ── Raw type for Prisma result ──
interface RawRecurring {
  id: string;
  user_id: string;
  description: string;
  amount: { toString(): string };
  type: string;
  category_id: string | null;
  sub_category_id: string | null;
  account_id: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  active_days: string | null;
  is_active: boolean;
  next_run: Date;
  last_run: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CategoryRef { id: string; name: string; icon: string; color: string }
interface AccountRef  { id: string; name: string; type: string; icon: string; color: string }

function serializeRecurring(
  r: RawRecurring,
  category: CategoryRef | null,
  account: AccountRef | null
) {
  const amount = Number(r.amount);
  return {
    id: r.id,
    user_id: r.user_id,
    description: r.description,
    amount,
    type: r.type,
    category_id: r.category_id,
    sub_category_id: r.sub_category_id,
    account_id: r.account_id,
    frequency: r.frequency,
    day_of_week: r.day_of_week,
    day_of_month: r.day_of_month,
    active_days: r.active_days,
    is_active: r.is_active,
    next_run: r.next_run.toISOString(),
    last_run: r.last_run?.toISOString() ?? null,
    monthly_total: computeMonthlyTotal(amount, r.frequency, r.active_days),
    category,
    account,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  };
}

async function resolveRefs(rows: RawRecurring[]) {
  const catIds = [...new Set(rows.map((r) => r.category_id).filter((id): id is string => id !== null))];
  const accountIds = [...new Set(rows.map((r) => r.account_id))];

  const [categories, accounts] = await Promise.all([
    catIds.length > 0
      ? prisma.category.findMany({
          where: { id: { in: catIds } },
          select: { id: true, name: true, icon: true, color: true },
        })
      : [],
    prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true, type: true, icon: true, color: true },
    }),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  return { catMap, accountMap };
}

// ── GET /recurring ──
recurring.get("/", async (c) => {
  const user = c.get("user");

  const rows = await prisma.recurringTransaction.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "asc" },
  });

  const { catMap, accountMap } = await resolveRefs(rows as unknown as RawRecurring[]);

  const items = rows.map((r) =>
    serializeRecurring(
      r as unknown as RawRecurring,
      (catMap.get(r.category_id ?? "") ?? null) as any,
      (accountMap.get(r.account_id) ?? null) as any
    )
  );

  const activeItems = items.filter((i) => i.is_active);
  const summary = {
    total_expense_monthly: activeItems
      .filter((i) => i.type === "expense")
      .reduce((s, i) => s + i.monthly_total, 0),
    total_income_monthly: activeItems
      .filter((i) => i.type === "income")
      .reduce((s, i) => s + i.monthly_total, 0),
  };

  return c.json(ok({ items, summary }));
});

// ── GET /recurring/:id ──
recurring.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const row = await prisma.recurringTransaction.findFirst({
    where: { id, user_id: user.id },
  });
  if (!row) return c.json(fail("Tidak ditemukan"), 404);

  const { catMap, accountMap } = await resolveRefs([row as unknown as RawRecurring]);

  return c.json(
    ok(
      serializeRecurring(
        row as unknown as RawRecurring,
        (catMap.get(row.category_id ?? "") ?? null) as any,
        (accountMap.get(row.account_id) ?? null) as any
      )
    )
  );
});

// ── POST /recurring ──
recurring.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = CreateRecurringSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const d = parsed.data;
  const next_run = computeNextRun(d.frequency, d.day_of_week, d.day_of_month, d.active_days);

  const row = await prisma.recurringTransaction.create({
    data: {
      user_id: user.id,
      description: d.description,
      amount: d.amount,
      type: d.type,
      category_id: d.category_id ?? null,
      sub_category_id: d.sub_category_id ?? null,
      account_id: d.account_id,
      frequency: d.frequency,
      day_of_week: d.day_of_week ?? null,
      day_of_month: d.day_of_month ?? null,
      active_days: d.active_days ?? null,
      next_run,
    },
  });

  const { catMap, accountMap } = await resolveRefs([row as unknown as RawRecurring]);

  return c.json(
    ok(
      serializeRecurring(
        row as unknown as RawRecurring,
        (catMap.get(row.category_id ?? "") ?? null) as any,
        (accountMap.get(row.account_id) ?? null) as any
      )
    ),
    201
  );
});

// ── PUT /recurring/:id ──
recurring.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateRecurringSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const existing = await prisma.recurringTransaction.findFirst({ where: { id, user_id: user.id } });
  if (!existing) return c.json(fail("Tidak ditemukan"), 404);

  const d = parsed.data;
  const newFreq = d.frequency ?? existing.frequency;
  const newDow = d.day_of_week !== undefined ? d.day_of_week : existing.day_of_week;
  const newDom = d.day_of_month !== undefined ? d.day_of_month : existing.day_of_month;
  const newActiveDays = d.active_days !== undefined ? d.active_days : existing.active_days;
  const next_run = computeNextRun(newFreq, newDow, newDom, newActiveDays);

  const row = await prisma.recurringTransaction.update({
    where: { id },
    data: {
      ...(d.description !== undefined && { description: d.description }),
      ...(d.amount !== undefined && { amount: d.amount }),
      ...(d.type !== undefined && { type: d.type }),
      ...(d.category_id !== undefined && { category_id: d.category_id ?? null }),
      ...(d.sub_category_id !== undefined && { sub_category_id: d.sub_category_id ?? null }),
      ...(d.account_id !== undefined && { account_id: d.account_id }),
      ...(d.frequency !== undefined && { frequency: d.frequency }),
      ...(d.day_of_week !== undefined && { day_of_week: d.day_of_week ?? null }),
      ...(d.day_of_month !== undefined && { day_of_month: d.day_of_month ?? null }),
      ...(d.active_days !== undefined && { active_days: d.active_days ?? null }),
      next_run,
    },
  });

  const { catMap, accountMap } = await resolveRefs([row as unknown as RawRecurring]);

  return c.json(
    ok(
      serializeRecurring(
        row as unknown as RawRecurring,
        (catMap.get(row.category_id ?? "") ?? null) as any,
        (accountMap.get(row.account_id) ?? null) as any
      )
    )
  );
});

// ── PATCH /recurring/:id/toggle ──
recurring.patch("/:id/toggle", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await prisma.recurringTransaction.findFirst({ where: { id, user_id: user.id } });
  if (!existing) return c.json(fail("Tidak ditemukan"), 404);

  const row = await prisma.recurringTransaction.update({
    where: { id },
    data: { is_active: !existing.is_active },
  });

  const { catMap, accountMap } = await resolveRefs([row as unknown as RawRecurring]);

  return c.json(
    ok(
      serializeRecurring(
        row as unknown as RawRecurring,
        (catMap.get(row.category_id ?? "") ?? null) as any,
        (accountMap.get(row.account_id) ?? null) as any
      )
    )
  );
});

// ── DELETE /recurring/:id ──
recurring.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await prisma.recurringTransaction.findFirst({ where: { id, user_id: user.id } });
  if (!existing) return c.json(fail("Tidak ditemukan"), 404);

  await prisma.recurringTransaction.delete({ where: { id } });
  return c.json(ok({ deleted: true }));
});

// ── POST /recurring/execute-now (dev-only manual trigger) ──
recurring.post("/execute-now", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return c.json(fail("Tidak tersedia"), 403);
  }
  const created = await runDueRecurring();
  return c.json(ok({ created }));
});

export default recurring;
