// Push notification service — sends FCM push + creates in-app notification
import { prisma } from "../lib/db.js";
import { env } from "../env.js";

// ── Lazy-init Firebase Admin ──
let firebaseApp: import("firebase-admin").app.App | null = null;

async function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_PRIVATE_KEY) {
    return null; // Firebase not configured — skip push, still create in-app notif
  }
  const admin = await import("firebase-admin");
  firebaseApp = admin.default.initializeApp({
    credential: admin.default.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Private key comes as escaped newlines in env
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
  return firebaseApp;
}

// ── Format currency ──
function fmtRp(amount: number): string {
  if (amount >= 1_000_000) {
    const m = (amount / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `Rp ${m}Jt`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ── Core: send push + save in-app notification ──
interface PushPayload {
  userId: string;
  type: string;       // budget_alert | debt_reminder | weekly_report | gmail_sync | recurring | transaction
  title: string;
  body: string;
  data?: Record<string, string>;
  meta?: Record<string, unknown>;
  refId?: string;     // dedup key for in-app notifications
}

export async function sendPush(payload: PushPayload): Promise<void> {
  const { userId, type, title, body, data, meta, refId } = payload;

  // 1. Always create in-app notification
  await prisma.notification.create({
    data: {
      user_id: userId,
      type,
      title,
      body,
      meta: JSON.stringify({ ref_id: refId ?? "", url: data?.url ?? "", ...(meta ?? {}) }),
    },
  });

  // 2. Check if user has push enabled
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notif_push: true },
  });
  if (!user?.notif_push) return;

  // 3. Get active FCM tokens
  const subs = await prisma.pushSubscription.findMany({
    where: { user_id: userId, is_active: true },
    select: { id: true, fcm_token: true },
  });
  if (subs.length === 0) return;

  // 4. Send via Firebase
  const app = await getFirebaseApp();
  if (!app) return; // Firebase not configured

  const admin = await import("firebase-admin");
  const messaging = admin.default.messaging(app);

  const staleTokenIds: string[] = [];

  for (const sub of subs) {
    try {
      await messaging.send({
        token: sub.fcm_token,
        notification: { title, body },
        data: { type, url: data?.url ?? "/notifications", ...(data ?? {}) },
        webpush: {
          fcmOptions: { link: data?.url ?? "/notifications" },
          notification: {
            icon: "/icons/icon.svg",
            badge: "/icons/icon.svg",
          },
        },
      });
    } catch (err: unknown) {
      const error = err as { code?: string };
      // Token invalid or unregistered — mark for cleanup
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        staleTokenIds.push(sub.id);
      } else {
        console.error(`[Push] FCM send error for user=${userId}:`, err);
      }
    }
  }

  // 5. Cleanup stale tokens
  if (staleTokenIds.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: staleTokenIds } },
      data: { is_active: false },
    });
  }
}

// ── Convenience: Budget alert push ──
export async function pushBudgetAlert(
  userId: string,
  categoryName: string,
  categoryIcon: string,
  pct: number,
  remaining: number,
  budgetId: string
): Promise<void> {
  await sendPush({
    userId,
    type: "budget_alert",
    title: `⚠️ Budget ${categoryName} hampir habis`,
    body: `Budget ${categoryName} sudah ${pct}% terpakai. Sisa ${fmtRp(remaining)}`,
    data: { url: "/budget" },
    meta: { budget_id: budgetId, category_name: categoryName, pct, remaining },
    refId: `push:budget:${budgetId}:${new Date().toISOString().slice(0, 7)}`,
  });
}

// ── Convenience: Debt reminder push ──
export async function pushDebtReminder(
  userId: string,
  debtType: string,
  personName: string,
  amount: number,
  debtId: string
): Promise<void> {
  const typeLabel = debtType === "borrow" ? "Hutang" : "Piutang";
  await sendPush({
    userId,
    type: "debt_reminder",
    title: `⏰ ${typeLabel} jatuh tempo besok`,
    body: `${typeLabel} ke ${personName} ${fmtRp(amount)} jatuh tempo besok`,
    data: { url: "/debts" },
    meta: { debt_id: debtId, person_name: personName, amount },
    refId: `push:debt:${debtId}:${new Date().toISOString().slice(0, 10)}`,
  });
}

// ── Convenience: Gmail sync push ──
export async function pushGmailSync(
  userId: string,
  count: number
): Promise<void> {
  await sendPush({
    userId,
    type: "gmail_sync",
    title: "📧 Transaksi baru terdeteksi",
    body: `Gmail sync menemukan ${count} transaksi baru. Tap untuk review.`,
    data: { url: "/gmail-sync" },
    meta: { count },
    refId: `push:gmail:${userId}:${Date.now()}`,
  });
}

// ── Convenience: Weekly report push ──
export async function pushWeeklyReport(
  userId: string,
  expense: number
): Promise<void> {
  await sendPush({
    userId,
    type: "weekly_report",
    title: "📊 Laporan minggu ini",
    body: `Pengeluaran minggu ini ${fmtRp(expense)}. Tap untuk lihat detail.`,
    data: { url: "/reports" },
    meta: { expense },
    refId: `push:weekly:${userId}:${new Date().toISOString().slice(0, 10)}`,
  });
}

// ── Convenience: Recurring transaction push ──
export async function pushRecurring(
  userId: string,
  description: string,
  amount: number
): Promise<void> {
  await sendPush({
    userId,
    type: "recurring",
    title: "🔁 Transaksi berulang tercatat",
    body: `${description} ${fmtRp(amount)} otomatis tercatat.`,
    data: { url: "/transactions" },
    meta: { description, amount },
    refId: `push:recurring:${userId}:${Date.now()}`,
  });
}
