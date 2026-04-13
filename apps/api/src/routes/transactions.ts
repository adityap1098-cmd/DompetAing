import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransactionQuerySchema,
  ok,
  fail,
} from "@dompetaing/shared";
import { computeAccountBalance } from "../lib/computed.js";

const transactions = new Hono();
transactions.use("*", requireAuth);

// ── Include shape ──
const INCLUDE = {
  category: { select: { id: true, name: true, icon: true, color: true } },
  sub_category: { select: { id: true, name: true } },
  account: { select: { id: true, name: true, type: true, icon: true, color: true } },
  to_account: { select: { id: true, name: true, type: true, icon: true, color: true } },
} as const;

// ── Serialize ──
interface RawTxn {
  id: string;
  user_id: string;
  amount: { toString(): string };
  type: string;
  category_id: string | null;
  sub_category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  description: string;
  notes: string | null;
  date: Date;
  source: string;
  gmail_message_id: string | null;
  recurring_id: string | null;
  debt_id: string | null;
  is_verified: boolean;
  category: { id: string; name: string; icon: string; color: string } | null;
  sub_category: { id: string; name: string } | null;
  account: { id: string; name: string; type: string; icon: string; color: string };
  to_account: { id: string; name: string; type: string; icon: string; color: string } | null;
  created_at: Date;
  updated_at: Date;
}

function serializeTransaction(txn: RawTxn) {
  return {
    id: txn.id,
    user_id: txn.user_id,
    amount: Number(txn.amount),
    type: txn.type,
    category_id: txn.category_id,
    sub_category_id: txn.sub_category_id,
    account_id: txn.account_id,
    to_account_id: txn.to_account_id,
    description: txn.description,
    notes: txn.notes,
    date: txn.date.toISOString(),
    source: txn.source,
    gmail_message_id: txn.gmail_message_id,
    recurring_id: txn.recurring_id,
    debt_id: txn.debt_id,
    is_verified: txn.is_verified,
    category: txn.category,
    sub_category: txn.sub_category,
    account: txn.account,
    to_account: txn.to_account,
    created_at: txn.created_at.toISOString(),
    updated_at: txn.updated_at.toISOString(),
  };
}

// ── Build WHERE clause ──
// Uses AND array to avoid OR key conflicts when combining account + search filters.
function buildWhere(
  userId: string,
  params: {
    type?: string;
    category_id?: string;
    sub_category_id?: string;
    account_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    amount_min?: number;
    amount_max?: number;
  }
) {
  const and: Record<string, unknown>[] = [{ user_id: userId }];

  if (params.type) and.push({ type: params.type });
  if (params.category_id) and.push({ category_id: params.category_id });
  if (params.sub_category_id) and.push({ sub_category_id: params.sub_category_id });

  if (params.account_id) {
    and.push({
      OR: [
        { account_id: params.account_id },
        { to_account_id: params.account_id },
      ],
    });
  }

  if (params.search) {
    and.push({
      OR: [
        { description: { contains: params.search, mode: "insensitive" } },
        { notes: { contains: params.search, mode: "insensitive" } },
        { category: { name: { contains: params.search, mode: "insensitive" } } },
        { sub_category: { name: { contains: params.search, mode: "insensitive" } } },
      ],
    });
  }

  const dateFilter: Record<string, unknown> = {};
  // Offset date_from ke UTC-7 (WIB) supaya match tanggal lokal user
  // "2026-04-01" berarti "1 April 00:00 WIB" = "31 Maret 17:00 UTC"
  if (params.date_from) dateFilter.gte = new Date(params.date_from + "T00:00:00+07:00");
  if (params.date_to) dateFilter.lte = new Date(params.date_to + "T23:59:59.999+07:00");
  if (Object.keys(dateFilter).length) and.push({ date: dateFilter });

  const amountFilter: Record<string, unknown> = {};
  if (params.amount_min !== undefined) amountFilter.gte = params.amount_min;
  if (params.amount_max !== undefined) amountFilter.lte = params.amount_max;
  if (Object.keys(amountFilter).length) and.push({ amount: amountFilter });

  return and.length === 1 ? and[0] : { AND: and };
}

const SORT_MAP: Record<string, unknown[]> = {
  date_desc: [{ date: "desc" }, { created_at: "desc" }],
  date_asc: [{ date: "asc" }, { created_at: "asc" }],
  amount_desc: [{ amount: "desc" }],
  amount_asc: [{ amount: "asc" }],
};

// ── GET /transactions/search-total (must be before /:id) ──
transactions.get("/search-total", async (c) => {
  const user = c.get("user");
  const raw = c.req.query();
  const parsed = TransactionQuerySchema.safeParse(raw);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const { page: _p, limit: _l, sort: _s, ...filterParams } = parsed.data;
  const where = buildWhere(user.id, filterParams);

  const [count, agg] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({ where, _sum: { amount: true } }),
  ]);

  return c.json(ok({ count, total_amount: Number(agg._sum.amount ?? 0) }));
});

// ── GET /transactions ──
transactions.get("/", async (c) => {
  const user = c.get("user");
  const raw = c.req.query();
  const parsed = TransactionQuerySchema.safeParse(raw);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const { page, limit, sort, ...filterParams } = parsed.data;
  const where = buildWhere(user.id, filterParams);

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: INCLUDE,
      orderBy: SORT_MAP[sort] as never,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return c.json(
    ok({
      items: rows.map((r) => serializeTransaction(r as unknown as RawTxn)),
      meta: { total, page, limit, has_next: page * limit < total },
    })
  );
});

// ── GET /transactions/:id ──
transactions.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const txn = await prisma.transaction.findFirst({
    where: { id, user_id: user.id },
    include: INCLUDE,
  });

  if (!txn) return c.json(fail("Transaksi tidak ditemukan"), 404);
  return c.json(ok(serializeTransaction(txn as unknown as RawTxn)));
});

// ── POST /transactions ──
transactions.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = CreateTransactionSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.account_id, user_id: user.id },
  });
  if (!account) return c.json(fail("Akun tidak ditemukan"), 404);

  if (parsed.data.to_account_id) {
    const toAccount = await prisma.account.findFirst({
      where: { id: parsed.data.to_account_id, user_id: user.id },
    });
    if (!toAccount) return c.json(fail("Akun tujuan tidak ditemukan"), 404);
  }

  const txn = await prisma.transaction.create({
    data: {
      user_id: user.id,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category_id: parsed.data.category_id ?? null,
      sub_category_id: parsed.data.sub_category_id ?? null,
      account_id: parsed.data.account_id,
      to_account_id: parsed.data.to_account_id ?? null,
      description: parsed.data.description,
      notes: parsed.data.notes ?? null,
      date: new Date(parsed.data.date),
      debt_id: parsed.data.debt_id ?? null,
    },
    include: INCLUDE,
  });

  const account_balance = await computeAccountBalance(parsed.data.account_id);
  const effects: Record<string, unknown> = { account_balance };

  if (parsed.data.to_account_id) {
    effects.to_account_balance = await computeAccountBalance(parsed.data.to_account_id);
  }

  return c.json(
    ok({ transaction: serializeTransaction(txn as unknown as RawTxn), effects }),
    201
  );
});

// ── PUT /transactions/:id ──
transactions.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateTransactionSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const existing = await prisma.transaction.findFirst({
    where: { id, user_id: user.id },
  });
  if (!existing) return c.json(fail("Transaksi tidak ditemukan"), 404);

  if (parsed.data.account_id) {
    const account = await prisma.account.findFirst({
      where: { id: parsed.data.account_id, user_id: user.id },
    });
    if (!account) return c.json(fail("Akun tidak ditemukan"), 404);
  }

  if (parsed.data.to_account_id) {
    const toAccount = await prisma.account.findFirst({
      where: { id: parsed.data.to_account_id, user_id: user.id },
    });
    if (!toAccount) return c.json(fail("Akun tujuan tidak ditemukan"), 404);
  }

  const txn = await prisma.transaction.update({
    where: { id },
    data: {
      ...parsed.data,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    },
    include: INCLUDE,
  });

  const affectedAccountId = parsed.data.account_id ?? existing.account_id;
  const account_balance = await computeAccountBalance(affectedAccountId);
  const effects: Record<string, unknown> = { account_balance };

  const toAccountId = parsed.data.to_account_id ?? existing.to_account_id;
  if (toAccountId) {
    effects.to_account_balance = await computeAccountBalance(toAccountId);
  }

  return c.json(ok({ transaction: serializeTransaction(txn as unknown as RawTxn), effects }));
});

// ── DELETE /transactions/:id ──
transactions.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await prisma.transaction.findFirst({
    where: { id, user_id: user.id },
  });
  if (!existing) return c.json(fail("Transaksi tidak ditemukan"), 404);

  await prisma.transaction.delete({ where: { id } });

  const account_balance = await computeAccountBalance(existing.account_id);
  const effects: Record<string, unknown> = { account_balance };

  if (existing.to_account_id) {
    effects.to_account_balance = await computeAccountBalance(existing.to_account_id);
  }

  return c.json(ok({ deleted: true, effects }));
});

export default transactions;
