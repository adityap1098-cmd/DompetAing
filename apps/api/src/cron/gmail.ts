// Gmail auto-sync cron — syncs all connected users every 15 minutes

import { prisma } from "../lib/db.js";
import { syncGmailForUser } from "../lib/gmailSync.js";

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function syncAllUsers(): Promise<void> {
  const connectedUsers = await prisma.user.findMany({
    where: { gmail_connected: true, gmail_auto_sync: true },
    select: { id: true, gmail_sync_interval: true },
  });

  for (const user of connectedUsers) {
    try {
      const result = await syncGmailForUser(user.id);
      if (result.transactions_found > 0) {
        console.log(
          `[GmailCron] user=${user.id} found=${result.transactions_found} pending=${result.pending_review}`
        );
      }
    } catch (err) {
      console.error(`[GmailCron] sync failed for user=${user.id}:`, err);
    }
  }
}

function scheduleNext(): void {
  setTimeout(async () => {
    try {
      await syncAllUsers();
    } catch (err) {
      console.error("[GmailCron] syncAllUsers error:", err);
    } finally {
      scheduleNext();
    }
  }, DEFAULT_INTERVAL_MS);
}

export function startGmailCron(): void {
  console.log("[GmailCron] Started — syncing every 15 minutes");
  scheduleNext();
}
