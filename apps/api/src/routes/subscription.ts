import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { getEffectivePlan } from "../middleware/subscription.js";
import { prisma } from "../lib/db.js";
import { PREMIUM_PRICES } from "@dompetaing/shared";
import type { Feature } from "@dompetaing/shared";
import {
  createSnapTransaction,
  generateOrderId,
  verifySignature,
  isPaymentSuccess,
  isPaymentPending,
  isPaymentFailed,
  type MidtransNotification,
} from "../lib/midtrans.js";
import { env } from "../env.js";

const subscription = new Hono();

// ── GET /subscription ── (authenticated)
subscription.get("/", requireAuth, async (c) => {
  const user = c.get("user");

  const sub = await prisma.subscription.findUnique({
    where: { user_id: user.id },
  });

  if (!sub) {
    return c.json({
      success: false,
      error: "Subscription not found",
      data: null,
    }, 404);
  }

  const now = new Date();
  const effectivePlan = getEffectivePlan(sub);
  const isTrialActive = sub.plan === "trial" && now <= sub.trial_end;
  const trialDaysLeft = isTrialActive
    ? Math.max(0, Math.ceil((sub.trial_end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const premiumDaysLeft = sub.premium_end && sub.plan === "premium" && now <= sub.premium_end
    ? Math.max(0, Math.ceil((sub.premium_end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  // Count current usage
  const [currentAccounts, currentBudgets] = await Promise.all([
    prisma.account.count({ where: { user_id: user.id, is_active: true } }),
    prisma.budget.count({ where: { user_id: user.id, is_active: true } }),
  ]);

  const lockedFeatures: Feature[] = [];
  if (effectivePlan === "free") {
    lockedFeatures.push("gmail_sync", "export", "full_reports");
    if (currentAccounts >= 2) lockedFeatures.push("unlimited_accounts");
    if (currentBudgets >= 3) lockedFeatures.push("unlimited_budgets");
  }

  return c.json({
    success: true,
    error: null,
    data: {
      id: sub.id,
      plan: sub.plan,
      effective_plan: effectivePlan,
      is_trial_active: isTrialActive,
      trial_start: sub.trial_start,
      trial_end: sub.trial_end,
      trial_days_left: trialDaysLeft,
      premium_start: sub.premium_start,
      premium_end: sub.premium_end,
      premium_days_left: premiumDaysLeft,
      auto_renew: sub.auto_renew,
      is_active: sub.is_active,
      limits: {
        max_accounts: effectivePlan === "free" ? 2 : null,
        max_budgets: effectivePlan === "free" ? 3 : null,
        current_accounts: currentAccounts,
        current_budgets: currentBudgets,
      },
      locked_features: lockedFeatures,
    },
  });
});

// ── POST /subscription/checkout ── (authenticated)
subscription.post("/checkout", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as { plan_type?: string };

  const planType = body.plan_type;
  if (planType !== "monthly" && planType !== "yearly") {
    return c.json({ success: false, error: "plan_type must be 'monthly' or 'yearly'", data: null }, 400);
  }

  // Check MIDTRANS_SERVER_KEY
  if (!env.MIDTRANS_SERVER_KEY) {
    return c.json({ success: false, error: "Payment gateway not configured", data: null }, 503);
  }

  const sub = await prisma.subscription.findUnique({
    where: { user_id: user.id },
  });

  if (!sub) {
    return c.json({ success: false, error: "Subscription not found", data: null }, 404);
  }

  // Already premium with plenty of time?
  const effectivePlan = getEffectivePlan(sub);
  if (effectivePlan === "premium" && sub.premium_end) {
    const daysLeft = Math.ceil((sub.premium_end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 7) {
      return c.json({
        success: false,
        error: "Kamu masih punya Premium aktif. Upgrade ulang bisa dilakukan saat sisa ≤ 7 hari.",
        data: null,
      }, 400);
    }
  }

  const priceInfo = PREMIUM_PRICES[planType];
  const orderId = generateOrderId(user.id, planType);

  // Calculate period
  const now = new Date();
  let periodStart: Date;
  // If currently premium, extend from premium_end
  if (effectivePlan === "premium" && sub.premium_end && sub.premium_end > now) {
    periodStart = sub.premium_end;
  } else {
    periodStart = now;
  }
  const periodEnd = new Date(periodStart.getTime() + priceInfo.period_days * 24 * 60 * 60 * 1000);

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      user_id: user.id,
      subscription_id: sub.id,
      midtrans_order_id: orderId,
      amount: priceInfo.amount,
      currency: "IDR",
      status: "pending",
      period_start: periodStart,
      period_end: periodEnd,
    },
  });

  // Create Midtrans Snap token
  try {
    const snap = await createSnapTransaction({
      order_id: orderId,
      gross_amount: priceInfo.amount,
      customer_email: user.email,
      customer_name: user.name,
      item_name: planType === "monthly" ? "DompetAing Premium Bulanan" : "DompetAing Premium Tahunan",
    });

    return c.json({
      success: true,
      error: null,
      data: {
        snap_token: snap.token,
        redirect_url: snap.redirect_url,
        order_id: orderId,
        amount: priceInfo.amount,
        plan_type: planType,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      },
    });
  } catch (err) {
    // Cleanup payment record on Snap failure
    await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    console.error("[Subscription] Snap error:", err);
    return c.json({ success: false, error: "Gagal membuat pembayaran. Coba lagi nanti.", data: null }, 500);
  }
});

// ── POST /subscription/webhook ── (Midtrans — NO AUTH, verify signature instead)
subscription.post("/webhook", async (c) => {
  let body: MidtransNotification;
  try {
    body = await c.req.json() as MidtransNotification;
  } catch {
    return c.json({ success: false, error: "Invalid JSON" }, 400);
  }

  console.log("[Midtrans Webhook]", body.order_id, body.transaction_status);

  // Verify signature
  if (!verifySignature(body)) {
    console.error("[Midtrans Webhook] Invalid signature for order:", body.order_id);
    return c.json({ success: false, error: "Invalid signature" }, 403);
  }

  // Find payment by order_id
  const payment = await prisma.payment.findUnique({
    where: { midtrans_order_id: body.order_id },
    include: { subscription: true },
  });

  if (!payment) {
    console.error("[Midtrans Webhook] Payment not found:", body.order_id);
    return c.json({ success: false, error: "Payment not found" }, 404);
  }

  // Store raw response
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      midtrans_transaction_id: body.transaction_id ?? null,
      midtrans_response: JSON.stringify(body),
      payment_method: body.payment_type ?? null,
    },
  });

  if (isPaymentSuccess(body)) {
    // ── Payment SUCCESS ──
    const now = new Date();

    await prisma.$transaction([
      // Update payment → paid
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "paid",
          paid_at: now,
        },
      }),
      // Activate premium
      prisma.subscription.update({
        where: { id: payment.subscription_id },
        data: {
          plan: "premium",
          premium_start: payment.period_start,
          premium_end: payment.period_end,
          is_active: true,
        },
      }),
    ]);

    console.log("[Midtrans Webhook] Payment SUCCESS:", body.order_id, "→ premium until", payment.period_end);
  } else if (isPaymentPending(body)) {
    // ── Payment PENDING ──
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "pending" },
    });
    console.log("[Midtrans Webhook] Payment PENDING:", body.order_id);
  } else if (isPaymentFailed(body)) {
    // ── Payment FAILED/EXPIRED/DENIED ──
    const status = body.transaction_status === "expire" ? "expired" : "failed";
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });
    console.log("[Midtrans Webhook] Payment FAILED:", body.order_id, body.transaction_status);
  }

  // Midtrans expects 200 OK
  return c.json({ success: true });
});

// ── GET /subscription/payments ── (authenticated)
subscription.get("/payments", requireAuth, async (c) => {
  const user = c.get("user");

  const payments = await prisma.payment.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      midtrans_order_id: true,
      amount: true,
      status: true,
      payment_method: true,
      period_start: true,
      period_end: true,
      paid_at: true,
      created_at: true,
    },
  });

  return c.json({
    success: true,
    error: null,
    data: {
      payments: payments.map((p: any) => ({
        ...p,
        amount: Number(p.amount),
      })),
    },
  });
});

// ── PATCH /subscription/auto-renew ── (authenticated)
subscription.patch("/auto-renew", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as { auto_renew?: boolean };

  if (typeof body.auto_renew !== "boolean") {
    return c.json({ success: false, error: "auto_renew must be boolean", data: null }, 400);
  }

  const sub = await prisma.subscription.update({
    where: { user_id: user.id },
    data: { auto_renew: body.auto_renew },
  });

  return c.json({ success: true, error: null, data: { auto_renew: sub.auto_renew } });
});

// ── POST /subscription/cancel ── (authenticated)
subscription.post("/cancel", requireAuth, async (c) => {
  const user = c.get("user");

  const sub = await prisma.subscription.findUnique({
    where: { user_id: user.id },
  });

  if (!sub) {
    return c.json({ success: false, error: "Subscription not found", data: null }, 404);
  }

  const effectivePlan = getEffectivePlan(sub);
  if (effectivePlan !== "premium") {
    return c.json({ success: false, error: "Kamu tidak sedang berlangganan Premium", data: null }, 400);
  }

  // Cancel = turn off auto-renew, premium stays until premium_end
  await prisma.subscription.update({
    where: { user_id: user.id },
    data: { auto_renew: false },
  });

  return c.json({
    success: true,
    error: null,
    data: {
      message: `Premium tetap aktif hingga ${sub.premium_end?.toISOString().split("T")[0]}. Setelah itu akan kembali ke Free.`,
      premium_end: sub.premium_end,
    },
  });
});

export default subscription;
