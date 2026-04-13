import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { computeAccountBalance } from "../lib/computed.js";
import {
  CreateDebtSchema,
  UpdateDebtSchema,
  PayDebtSchema,
  ok,
  fail,
} from "@dompetaing/shared";

const debts = new Hono();
debts.use("*", requireAuth);

// ── Raw type for Prisma result ──
interface RawDebt {
  id: string;
  user_id: string;
  type: string;
  person_name: string;
  amount: { toString(): string };
  description: string | null;
  borrow_date: Date;
  due_date: Date | null;
  is_paid: boolean;
  paid_at: Date | null;
  auto_record: boolean;
  reminder_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

function serializeDebt(d: RawDebt) {
  const now = new Date();
  const dueDate = d.due_date;
  const is_overdue = !d.is_paid && dueDate !== null && dueDate < now;
  const days_remaining =
    dueDate !== null
      ? Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  return {
    id: d.id,
    user_id: d.user_id,
    type: d.type,
    person_name: d.person_name,
    amount: Number(d.amount),
    description: d.description,
    borrow_date: d.borrow_date.toISOString(),
    due_date: dueDate?.toISOString() ?? null,
    is_paid: d.is_paid,
    paid_at: d.paid_at?.toISOString() ?? null,
    auto_record: d.auto_record,
    reminder_enabled: d.reminder_enabled,
    is_overdue,
    days_remaining,
    created_at: d.created_at.toISOString(),
    updated_at: d.updated_at.toISOString(),
  };
}

// ── GET /debts ──
debts.get("/", async (c) => {
  const user = c.get("user");
  const type = c.req.query("type"); // "hutang" | "piutang"
  const status = c.req.query("status") ?? "active"; // "active" | "paid" | "all"
  const sort = c.req.query("sort") ?? "due_date_asc";

  const where: Record<string, unknown> = { user_id: user.id };
  if (type === "hutang" || type === "piutang") where.type = type;
  if (status === "active") where.is_paid = false;
  else if (status === "paid") where.is_paid = true;

  const orderBy =
    sort === "due_date_asc"
      ? [{ due_date: "asc" as const }, { created_at: "asc" as const }]
      : sort === "amount_desc"
      ? [{ amount: "desc" as const }]
      : [{ created_at: "desc" as const }];

  const rows = await prisma.debt.findMany({ where, orderBy });

  // Summary (always over all active debts, ignoring tab filter)
  const allActive = await prisma.debt.findMany({
    where: { user_id: user.id, is_paid: false },
    select: { type: true, amount: true, due_date: true },
  });

  const now = new Date();
  const summary = {
    total_hutang: allActive
      .filter((d) => d.type === "hutang")
      .reduce((s, d) => s + Number(d.amount), 0),
    total_piutang: allActive
      .filter((d) => d.type === "piutang")
      .reduce((s, d) => s + Number(d.amount), 0),
    hutang_active_count: allActive.filter((d) => d.type === "hutang").length,
    piutang_active_count: allActive.filter((d) => d.type === "piutang").length,
    overdue_count: allActive.filter(
      (d) => d.due_date !== null && d.due_date < now
    ).length,
  };

  return c.json(ok({ summary, debts: rows.map((r) => serializeDebt(r as unknown as RawDebt)) }));
});

// ── GET /debts/:id ──
debts.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const debt = await prisma.debt.findFirst({ where: { id, user_id: user.id } });
  if (!debt) return c.json(fail("Hutang/piutang tidak ditemukan"), 404);

  return c.json(ok(serializeDebt(debt as unknown as RawDebt)));
});

// ── POST /debts ──
debts.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = CreateDebtSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const debt = await prisma.debt.create({
    data: {
      user_id: user.id,
      type: parsed.data.type,
      person_name: parsed.data.person_name,
      amount: parsed.data.amount,
      description: parsed.data.description ?? null,
      borrow_date: new Date(parsed.data.borrow_date),
      due_date: parsed.data.due_date ? new Date(parsed.data.due_date) : null,
      reminder_enabled: parsed.data.reminder_enabled ?? true,
      auto_record: parsed.data.auto_record ?? true,
    },
  });

  return c.json(ok(serializeDebt(debt as unknown as RawDebt)), 201);
});

// ── PUT /debts/:id ──
debts.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateDebtSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const existing = await prisma.debt.findFirst({ where: { id, user_id: user.id } });
  if (!existing) return c.json(fail("Hutang/piutang tidak ditemukan"), 404);
  if (existing.is_paid) return c.json(fail("Tidak bisa edit hutang/piutang yang sudah lunas"), 409);

  const debt = await prisma.debt.update({
    where: { id },
    data: {
      ...(parsed.data.type !== undefined && { type: parsed.data.type }),
      ...(parsed.data.person_name !== undefined && { person_name: parsed.data.person_name }),
      ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.borrow_date !== undefined && { borrow_date: new Date(parsed.data.borrow_date) }),
      ...(parsed.data.due_date !== undefined && {
        due_date: parsed.data.due_date ? new Date(parsed.data.due_date) : null,
      }),
      ...(parsed.data.reminder_enabled !== undefined && { reminder_enabled: parsed.data.reminder_enabled }),
      ...(parsed.data.auto_record !== undefined && { auto_record: parsed.data.auto_record }),
    },
  });

  return c.json(ok(serializeDebt(debt as unknown as RawDebt)));
});

// ── PATCH /debts/:id/pay ──
debts.patch("/:id/pay", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = PayDebtSchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const existing = await prisma.debt.findFirst({ where: { id, user_id: user.id } });
  if (!existing) return c.json(fail("Hutang/piutang tidak ditemukan"), 404);
  if (existing.is_paid) return c.json(fail("Sudah lunas"), 409);

  const { auto_record, account_id } = parsed.data;

  if (auto_record && !account_id) {
    return c.json(fail("account_id wajib diisi saat auto_record aktif"), 400);
  }

  // Mark paid
  const debt = await prisma.debt.update({
    where: { id },
    data: { is_paid: true, paid_at: new Date() },
  });

  let transaction: any = null;
  if (auto_record && account_id) {
    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: { id: account_id, user_id: user.id },
    });
    if (!account) return c.json(fail("Akun tidak ditemukan"), 404);

    // hutang (gua pinjam) → bayar = expense
    // piutang (orang pinjam ke gua) → terima = income
    const txnType = existing.type === "hutang" ? "expense" : "income";
    const description =
      existing.type === "hutang"
        ? `Pelunasan hutang ke ${existing.person_name}`
        : `Pembayaran piutang dari ${existing.person_name}`;

    transaction = await prisma.transaction.create({
      data: {
        user_id: user.id,
        type: txnType,
        amount: existing.amount,
        account_id,
        description,
        date: new Date(),
        debt_id: id,
        is_verified: true,
      },
    });

    // Recompute account balance (returned for client info but balance is always computed)
    await computeAccountBalance(account_id);
  }

  return c.json(
    ok({
      debt: serializeDebt(debt as unknown as RawDebt),
      transaction: transaction
        ? {
            id: transaction.id,
            type: transaction.type,
            amount: Number(transaction.amount),
            description: transaction.description,
            date: transaction.date.toISOString(),
          }
        : null,
    })
  );
});

// ── PATCH /debts/:id/unpay ──
debts.patch("/:id/unpay", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await prisma.debt.findFirst({ where: { id, user_id: user.id } });
  if (!existing) return c.json(fail("Hutang/piutang tidak ditemukan"), 404);
  if (!existing.is_paid) return c.json(fail("Belum lunas"), 409);

  // Find auto-recorded transactions linked to this debt
  const linkedTxns = await prisma.transaction.findMany({
    where: { debt_id: id, user_id: user.id },
    select: { id: true, account_id: true },
  });

  // Delete linked transactions
  if (linkedTxns.length > 0) {
    await prisma.transaction.deleteMany({ where: { debt_id: id, user_id: user.id } });
  }

  // Mark unpaid
  const debt = await prisma.debt.update({
    where: { id },
    data: { is_paid: false, paid_at: null },
  });

  // Recompute affected account balances
  const affectedAccountIds = [...new Set(linkedTxns.map((t) => t.account_id))] as string[];
  await Promise.all(affectedAccountIds.map((aid) => computeAccountBalance(aid)));

  return c.json(
    ok({
      debt: serializeDebt(debt as unknown as RawDebt),
      deleted_transaction_ids: linkedTxns.map((t) => t.id),
    })
  );
});

// ── DELETE /debts/:id ──
debts.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const existing = await prisma.debt.findFirst({ where: { id, user_id: user.id } });
  if (!existing) return c.json(fail("Hutang/piutang tidak ditemukan"), 404);

  await prisma.debt.delete({ where: { id } });
  return c.json(ok({ deleted: true }));
});

export default debts;
