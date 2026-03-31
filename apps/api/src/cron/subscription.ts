// ═══════════════════════════════════════
// Cron: Subscription Expiry Check
// Daily at 00:05 — downgrade expired trials & premiums
// ═══════════════════════════════════════
import { prisma } from "../lib/db.js";

export function startSubscriptionCron() {
  async function check() {
    try {
      const now = new Date();

      // 1. Expired trials → set plan to "free"
      const expiredTrials = await prisma.subscription.updateMany({
        where: {
          plan: "trial",
          trial_end: { lt: now },
        },
        data: {
          plan: "free",
        },
      });

      if (expiredTrials.count > 0) {
        console.log(`[SubscriptionCron] Downgraded ${expiredTrials.count} expired trial(s) to free`);
      }

      // 2. Expired premiums (no auto-renew) → set plan to "free"
      const expiredPremiums = await prisma.subscription.updateMany({
        where: {
          plan: "premium",
          premium_end: { lt: now },
          auto_renew: false,
        },
        data: {
          plan: "free",
          is_active: false,
        },
      });

      if (expiredPremiums.count > 0) {
        console.log(`[SubscriptionCron] Downgraded ${expiredPremiums.count} expired premium(s) to free`);
      }

      // 3. Expired premiums with auto_renew = true
      //    In a real system, we'd charge via Midtrans recurring API.
      //    For now, just log a warning — manual renewal required.
      const autoRenewExpired = await prisma.subscription.findMany({
        where: {
          plan: "premium",
          premium_end: { lt: now },
          auto_renew: true,
        },
        include: { user: { select: { id: true, email: true } } },
      });

      for (const sub of autoRenewExpired) {
        console.log(`[SubscriptionCron] Auto-renew expired for user ${sub.user.email} — needs manual renewal or Midtrans recurring API`);
        // Downgrade for now — in production, trigger Midtrans charge
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan: "free",
            is_active: false,
            auto_renew: false, // reset to avoid repeated logs
          },
        });
      }
    } catch (err) {
      console.error("[SubscriptionCron] Error:", err);
    }

    // Schedule next check in 24 hours
    const msUntilNextCheck = getMillisUntilTime(0, 5); // 00:05
    setTimeout(check, msUntilNextCheck);
  }

  // First run: schedule for next 00:05
  const msUntilFirst = getMillisUntilTime(0, 5);
  setTimeout(check, msUntilFirst);

  console.log("[SubscriptionCron] Scheduled — next check at 00:05");
}

function getMillisUntilTime(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}
