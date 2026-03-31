import { runDueRecurring } from "../lib/recurring.js";

// Schedules runDueRecurring to fire at 00:01 every day.
// Uses recursive setTimeout so it always targets the next 00:01 wall-clock time.
export function startRecurringCron(): void {
  function scheduleNext(): void {
    const now = new Date();
    const next = new Date(now);
    next.setHours(0, 1, 0, 0); // 00:01:00.000
    if (next.getTime() <= now.getTime()) {
      // 00:01 already passed today — aim for tomorrow
      next.setDate(next.getDate() + 1);
    }
    const msUntil = next.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        const created = await runDueRecurring();
        if (created > 0) {
          console.log(`[cron] recurring: created ${created} transaction(s)`);
        }
      } catch (err) {
        console.error("[cron] recurring error:", err);
      }
      scheduleNext(); // arm next day
    }, msUntil);
  }

  scheduleNext();
  console.log("[cron] recurring scheduler started — fires daily at 00:01");
}
