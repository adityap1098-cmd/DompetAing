import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin, isAdminEmail } from "../middleware/admin.js";
import { prisma } from "../lib/db.js";
import { getEffectivePlan } from "../middleware/subscription.js";

const admin = new Hono();
admin.use("*", requireAuth);
admin.use("*", requireAdmin);

// ── GET /admin/stats ──
admin.get("/stats", async (c) => {
  const [
    totalUsers,
    totalTransactions,
    paidPayments,
    subscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
    prisma.payment.findMany({
      where: { status: "paid" },
      select: { amount: true },
    }),
    prisma.subscription.findMany({
      select: { plan: true, trial_end: true, premium_end: true },
    }),
  ]);

  const now = new Date();
  let trial = 0, premium = 0, free = 0;
  for (const sub of subscriptions) {
    const p = getEffectivePlan(sub as { plan: string; trial_end: Date; premium_end: Date | null });
    if (p === "trial") trial++;
    else if (p === "premium") premium++;
    else free++;
  }
  // Users without subscription = free
  free += totalUsers - subscriptions.length;

  const totalRevenue = paidPayments.reduce((s, p) => s + Number(p.amount), 0);

  // Monthly signups (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentUsers = await prisma.user.findMany({
    where: { created_at: { gte: sixMonthsAgo } },
    select: { created_at: true },
    orderBy: { created_at: "asc" },
  });

  const monthlySignups: Record<string, number> = {};
  for (const u of recentUsers) {
    const key = `${u.created_at.getFullYear()}-${String(u.created_at.getMonth() + 1).padStart(2, "0")}`;
    monthlySignups[key] = (monthlySignups[key] ?? 0) + 1;
  }

  // Recent 10 signups
  const recentSignups = await prisma.user.findMany({
    take: 10,
    orderBy: { created_at: "desc" },
    select: {
      id: true, email: true, name: true, avatar_url: true,
      gmail_connected: true, created_at: true,
      subscription: { select: { plan: true, trial_end: true, premium_end: true } },
    },
  });

  return c.json({
    success: true, error: null,
    data: {
      total_users: totalUsers,
      premium_users: premium,
      trial_users: trial,
      free_users: free,
      total_transactions: totalTransactions,
      total_revenue: totalRevenue,
      monthly_signups: monthlySignups,
      recent_signups: recentSignups.map((u) => ({
        ...u,
        effective_plan: u.subscription
          ? getEffectivePlan(u.subscription as { plan: string; trial_end: Date; premium_end: Date | null })
          : "free",
      })),
    },
  });
});

// ── GET /admin/users ──
admin.get("/users", async (c) => {
  const search = c.req.query("search") ?? "";
  const status = c.req.query("status") ?? "all";
  const page = parseInt(c.req.query("page") ?? "1");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true, email: true, name: true, avatar_url: true,
        gmail_connected: true, created_at: true,
        subscription: { select: { plan: true, trial_end: true, premium_end: true } },
        _count: { select: { transactions: true, accounts: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Filter by effective plan status
  const mapped = users.map((u) => {
    const ep = u.subscription
      ? getEffectivePlan(u.subscription as { plan: string; trial_end: Date; premium_end: Date | null })
      : "free";
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatar_url: u.avatar_url,
      effective_plan: ep,
      plan: u.subscription?.plan ?? "free",
      trial_end: u.subscription?.trial_end ?? null,
      premium_end: u.subscription?.premium_end ?? null,
      gmail_connected: u.gmail_connected,
      transaction_count: u._count.transactions,
      account_count: u._count.accounts,
      created_at: u.created_at,
    };
  });

  const filtered = status === "all" ? mapped : mapped.filter((u) => u.effective_plan === status);

  return c.json({
    success: true, error: null,
    data: {
      users: filtered,
      total: status === "all" ? total : filtered.length,
      page, limit,
      has_next: offset + limit < total,
    },
  });
});

// ── GET /admin/users/:id ──
admin.get("/users/:id", async (c) => {
  const id = c.req.param("id");

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      _count: { select: { transactions: true, accounts: true, debts: true, budgets: true } },
    },
  });

  if (!user) return c.json({ success: false, error: "User not found", data: null }, 404);

  const ep = user.subscription
    ? getEffectivePlan(user.subscription as { plan: string; trial_end: Date; premium_end: Date | null })
    : "free";

  return c.json({
    success: true, error: null,
    data: {
      id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url,
      effective_plan: ep,
      gmail_connected: user.gmail_connected,
      subscription: user.subscription,
      counts: user._count,
      created_at: user.created_at,
    },
  });
});

// ── POST /admin/grant-premium ──
admin.post("/grant-premium", async (c) => {
  const body = await c.req.json() as { email?: string; duration?: string };
  if (!body.email || !body.duration) {
    return c.json({ success: false, error: "email and duration required", data: null }, 400);
  }

  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) return c.json({ success: false, error: "User not found", data: null }, 404);

  const now = new Date();
  let premiumEnd: Date | null = null;

  if (body.duration === "monthly") {
    premiumEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  } else if (body.duration === "yearly") {
    premiumEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  } else if (body.duration === "lifetime") {
    premiumEnd = new Date("2099-12-31");
  } else {
    return c.json({ success: false, error: "duration must be monthly/yearly/lifetime", data: null }, 400);
  }

  await prisma.subscription.upsert({
    where: { user_id: user.id },
    create: {
      user_id: user.id,
      plan: "premium",
      trial_start: now,
      trial_end: now,
      premium_start: now,
      premium_end: premiumEnd,
      is_active: true,
    },
    update: {
      plan: "premium",
      premium_start: now,
      premium_end: premiumEnd,
      is_active: true,
    },
  });

  return c.json({
    success: true, error: null,
    data: { email: user.email, plan: "premium", premium_end: premiumEnd },
  });
});

// ── POST /admin/revoke-premium ──
admin.post("/revoke-premium", async (c) => {
  const body = await c.req.json() as { email?: string };
  if (!body.email) return c.json({ success: false, error: "email required", data: null }, 400);

  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) return c.json({ success: false, error: "User not found", data: null }, 404);

  await prisma.subscription.updateMany({
    where: { user_id: user.id },
    data: { plan: "free", premium_start: null, premium_end: null, is_active: true },
  });

  return c.json({ success: true, error: null, data: { email: user.email, plan: "free" } });
});

// ── DELETE /admin/users/:id ──
admin.delete("/users/:id", async (c) => {
  const id = c.req.param("id");
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (!user) return c.json({ success: false, error: "User not found", data: null }, 404);

  // Don't allow deleting admin
  if (isAdminEmail(user.email)) {
    return c.json({ success: false, error: "Cannot delete admin user", data: null }, 403);
  }

  await prisma.user.delete({ where: { id } }); // cascade deletes all related data
  return c.json({ success: true, error: null, data: { deleted: true, email: user.email } });
});

export default admin;
