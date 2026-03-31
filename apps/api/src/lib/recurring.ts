import { prisma } from "./db.js";

// ── Next-run calculator ──
export function computeNextRun(
  frequency: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  activeDays?: string | null
): Date {
  const now = new Date();

  if (frequency === "daily") {
    // activeDays = comma-separated day numbers "1,2,3,4,5" (0=Sun…6=Sat)
    if (activeDays) {
      const activeSet = new Set(
        activeDays.split(",").map(Number).filter((n) => !isNaN(n) && n >= 0 && n <= 6)
      );
      if (activeSet.size > 0) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
          const candidate = new Date(tomorrow);
          candidate.setDate(tomorrow.getDate() + i);
          if (activeSet.has(candidate.getDay())) return candidate;
        }
      }
    }
    // No active_days restriction — every day
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  if (frequency === "weekly" && dayOfWeek !== null && dayOfWeek !== undefined) {
    const next = new Date(now);
    next.setHours(0, 0, 0, 0);
    const currentDay = next.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    next.setDate(next.getDate() + daysUntil);
    return next;
  }

  if (frequency === "monthly" && dayOfMonth !== null && dayOfMonth !== undefined) {
    const next = new Date(now);
    next.setHours(0, 0, 0, 0);
    next.setDate(dayOfMonth);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(dayOfMonth);
    }
    return next;
  }

  if (frequency === "yearly") {
    // activeDays = month number as string "3" (March), dayOfMonth = day
    const monthOfYear = activeDays ? parseInt(activeDays, 10) : 1; // 1-12
    const dom = dayOfMonth ?? 1;
    const next = new Date(now);
    next.setHours(0, 0, 0, 0);
    next.setMonth(monthOfYear - 1); // 0-indexed
    next.setDate(dom);
    if (next.getTime() <= now.getTime()) {
      next.setFullYear(next.getFullYear() + 1);
      next.setMonth(monthOfYear - 1);
      next.setDate(dom);
    }
    return next;
  }

  // Fallback: tomorrow
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

// ── Monthly total estimator ──
export function computeMonthlyTotal(
  amount: number,
  frequency: string,
  activeDays?: string | null
): number {
  // 4.33 = average weeks per month (52 weeks / 12 months)
  const WEEKS_PER_MONTH = 4.33;

  switch (frequency) {
    case "daily": {
      if (activeDays) {
        const dayCount = activeDays.split(",").filter((s) => s.trim() !== "").length;
        if (dayCount > 0 && dayCount < 7) return Math.round(amount * dayCount * WEEKS_PER_MONTH);
      }
      return Math.round(amount * 30);
    }
    case "weekly":  return Math.round(amount * WEEKS_PER_MONTH);
    case "monthly": return amount;
    case "yearly":  return Math.round(amount / 12);
    default:        return amount;
  }
}

// ── Cron: run all due recurring transactions ──
export async function runDueRecurring(): Promise<number> {
  const now = new Date();

  const dueItems = await prisma.recurringTransaction.findMany({
    where: { is_active: true, next_run: { lte: now } },
  });

  if (dueItems.length === 0) return 0;

  let created = 0;
  for (const r of dueItems) {
    try {
      await prisma.transaction.create({
        data: {
          user_id: r.user_id,
          type: r.type,
          amount: r.amount,
          account_id: r.account_id,
          category_id: r.category_id,
          sub_category_id: r.sub_category_id,
          description: r.description,
          date: now,
          source: "recurring",
          recurring_id: r.id,
          is_verified: true,
        },
      });

      const nextRun = computeNextRun(
        r.frequency,
        r.day_of_week,
        r.day_of_month,
        r.active_days
      );

      await prisma.recurringTransaction.update({
        where: { id: r.id },
        data: { last_run: now, next_run: nextRun },
      });

      created++;
    } catch {
      // Continue processing remaining items even if one fails
    }
  }

  return created;
}
