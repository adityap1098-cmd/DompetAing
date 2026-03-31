import type { Context, Next } from "hono";
import { prisma } from "../lib/db.js";
import type { Feature } from "@dompetaing/shared";
import { PLAN_LIMITS } from "@dompetaing/shared";

export function getEffectivePlan(sub: {
  plan: string;
  trial_end: Date;
  premium_end: Date | null;
} | null): "trial" | "free" | "premium" {
  if (!sub) return "free";

  const now = new Date();

  if (sub.plan === "trial" && now <= sub.trial_end) return "trial";
  if (sub.plan === "premium" && sub.premium_end && now <= sub.premium_end) return "premium";

  return "free";
}

export function requireFeature(feature: Feature) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const user = c.get("user");

    const sub = await prisma.subscription.findUnique({
      where: { user_id: user.id },
    });

    const plan = getEffectivePlan(sub);

    if (plan === "trial" || plan === "premium") {
      return next();
    }

    // plan === "free"
    if (feature === "gmail_sync" || feature === "export" || feature === "full_reports") {
      return c.json({ success: false, error: "premium_required", feature, data: null }, 403);
    }

    if (feature === "unlimited_accounts") {
      const count = await prisma.account.count({ where: { user_id: user.id, is_active: true } });
      const limit = PLAN_LIMITS.free.max_accounts;
      if (count >= limit) {
        return c.json({ success: false, error: "limit_reached", limit, feature, data: null }, 403);
      }
    }

    if (feature === "unlimited_budgets") {
      const count = await prisma.budget.count({ where: { user_id: user.id, is_active: true } });
      const limit = PLAN_LIMITS.free.max_budgets;
      if (count >= limit) {
        return c.json({ success: false, error: "limit_reached", limit, feature, data: null }, 403);
      }
    }

    return next();
  };
}
