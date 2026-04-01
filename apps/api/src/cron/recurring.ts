import { runDueRecurring } from "../lib/recurring.js";
import { pushRecurring } from "../services/push.service.js";
import { prisma } from "../lib/db.js";

// Schedules runDueRecurring to fire at 00:01 every day.
// Uses recursive setTimeout so it always targets the next 00:01 wall-clock time.
export function startRecurringCron(): void {
  function scheduleNext(): void {
    const now = new Date();
    const next = new Date(now);
    next.setHours(0, 1, 0, 0); // 00:01:00.000
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    const msUntil = next.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        const created = await runDueRecurring();
        if (created > 0) {
          console.log(`[cron] recurring: created ${created} transaction(s)`);

          // Send push for each recurring transaction created today
          try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const recentTxns = await prisma.transaction.findMany({
              where: {
                source: "recurring",
                created_at: { gte: today },
              },
              select: { user_id: true, description: true, amount: true },
            });
            for (const txn of recentTxns) {
              await pushRecurring(txn.user_id, txn.description, Number(txn.amount));
            }
          } catch (pushErr) {
            console.error("[cron] recurring push error:", pushErr);
          }
        }
      } catch (err) {
        console.error("[cron] recurring error:", err);
      }
      scheduleNext();
    }, msUntil);
  }

  scheduleNext();
  console.log("[cron] recurring scheduler started — fires daily at 00:01");
}
