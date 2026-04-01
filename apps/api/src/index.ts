import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env.js";
import { errorHandler } from "./middleware/error.js";

// Routes
import authRoutes from "./routes/auth.js";
import subscriptionRoutes from "./routes/subscription.js";
import accountRoutes from "./routes/accounts.js";
import categoryRoutes from "./routes/categories.js";
import transactionRoutes from "./routes/transactions.js";
import budgetRoutes from "./routes/budgets.js";
import debtRoutes from "./routes/debts.js";
import recurringRoutes from "./routes/recurring.js";
import reportsRoutes from "./routes/reports.js";
import exportRoutes from "./routes/export.js";
import gmailRoutes from "./routes/gmail.js";
import settingsRoutes from "./routes/settings.js";
import notificationsRoutes from "./routes/notifications.js";
import importRoutes from "./routes/import.js";
import adminRoutes from "./routes/admin.js";
import pushRoutes from "./routes/push.js";
import { startRecurringCron } from "./cron/recurring.js";
import { startGmailCron } from "./cron/gmail.js";
import { startNotificationCron } from "./cron/notifications.js";
import { startSubscriptionCron } from "./cron/subscription.js";

const app = new Hono().basePath("/v1");

// ── Global middleware ──
app.use(
  "*",
  cors({
    origin: [env.FRONTEND_URL],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);
app.use("*", logger());

// ── Health check ──
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── Routes ──
app.route("/auth", authRoutes);
app.route("/subscription", subscriptionRoutes);
app.route("/accounts", accountRoutes);
app.route("/categories", categoryRoutes);
app.route("/transactions", transactionRoutes);
app.route("/budgets", budgetRoutes);
app.route("/debts", debtRoutes);
app.route("/recurring", recurringRoutes);
app.route("/reports", reportsRoutes);
app.route("/export", exportRoutes);
app.route("/gmail", gmailRoutes);
app.route("/settings", settingsRoutes);
app.route("/notifications", notificationsRoutes);
app.route("/import", importRoutes);
app.route("/admin", adminRoutes);
app.route("/push", pushRoutes);

// ── 404 handler ──
app.notFound((c) =>
  c.json({ success: false, error: "Not found", data: null }, 404)
);

// ── Error handler ──
app.onError(errorHandler);

// ── Recurring cron (daily at 00:01) ──
startRecurringCron();

// ── Gmail cron (every 15 minutes) ──
startGmailCron();

// ── Notification cron (every hour) ──
startNotificationCron();

// ── Subscription expiry cron (daily 00:05) ──
startSubscriptionCron();

// ── Start server ──
serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`🚀 DompetAing API running at http://localhost:${info.port}/v1`);
  }
);

export default app;
