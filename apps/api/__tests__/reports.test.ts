import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/reports.js");
  const app = new Hono();
  app.route("/reports", mod.default);
  return app;
};

describe("Reports Routes", () => {
  beforeEach(() => {
    mockPrismaClient.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      user_id: "test-user-id",
      plan: "premium",
      trial_end: new Date("2026-01-01"),
      premium_end: new Date("2027-01-01"),
    });
  });

  describe("GET /reports/monthly", () => {
    it("should return monthly report data", async () => {
      const app = await setupApp();
      // The route fetches transactions with account, comparison via groupBy, budgets
      mockPrismaClient.transaction.findMany.mockResolvedValue([
        {
          id: "txn-1",
          type: "expense",
          amount: BigInt(150000),
          date: new Date("2026-04-05"),
          category_id: "cat-1",
          account_id: "acc-1",
          category: { id: "cat-1", name: "Makanan", icon: "🍔", color: "#FF5722" },
          account: { id: "acc-1", name: "BCA", icon: "🏦", color: "#1E40AF", type: "bank" },
        },
        {
          id: "txn-2",
          type: "income",
          amount: BigInt(5000000),
          date: new Date("2026-04-01"),
          category_id: "cat-2",
          account_id: "acc-1",
          category: { id: "cat-2", name: "Gaji", icon: "💰", color: "#4CAF50" },
          account: { id: "acc-1", name: "BCA", icon: "🏦", color: "#1E40AF", type: "bank" },
        },
      ]);
      // Previous month comparison + 6-month trend
      mockPrismaClient.transaction.groupBy.mockResolvedValue([]);
      // Budget vs actual
      mockPrismaClient.budget.findMany.mockResolvedValue([]);

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const { status, json } = await testRequest(app, "GET", `/reports/monthly?month=${month}&year=${year}`);
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      // Verify new fields exist
      expect(json.data.comparison).toBeDefined();
      expect(json.data.saving_rate).toBeDefined();
      expect(json.data.daily_average).toBeDefined();
      expect(json.data.top_transactions).toBeDefined();
      expect(json.data.budget_vs_actual).toBeDefined();
      expect(json.data.per_account_spending).toBeDefined();
      expect(json.data.monthly_trend).toBeDefined();
      expect(json.data.total_transaction_count).toBe(2);
    });

    it("should restrict free users to current month only", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        user_id: "test-user-id",
        plan: "free",
        trial_end: new Date("2026-01-01"),
        premium_end: null,
      });

      const { status } = await testRequest(app, "GET", "/reports/monthly?month=1&year=2025");
      expect(status).toBe(403);
    });
  });

  describe("GET /reports/trend", () => {
    it("should return trend data for premium", async () => {
      const app = await setupApp();
      // Route calls transaction.groupBy for each month — must return array
      mockPrismaClient.transaction.groupBy.mockResolvedValue([]);

      const { status, json } = await testRequest(app, "GET", "/reports/trend");
      expect(status).toBe(200);
    });

    it("should block free users", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        user_id: "test-user-id",
        plan: "free",
        trial_end: new Date("2026-01-01"),
        premium_end: null,
      });

      const { status, json } = await testRequest(app, "GET", "/reports/trend");
      expect(status).toBe(403);
      expect(json.error).toBe("premium_required");
    });
  });

  describe("GET /reports/yearly", () => {
    it("should return yearly report for premium", async () => {
      const app = await setupApp();
      // Route calls transaction.groupBy for each of 12 months — must return array
      mockPrismaClient.transaction.groupBy.mockResolvedValue([]);

      const { status } = await testRequest(app, "GET", "/reports/yearly?year=2026");
      expect(status).toBe(200);
    });

    it("should block free users", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        user_id: "test-user-id",
        plan: "free",
        trial_end: new Date("2026-01-01"),
        premium_end: null,
      });

      const { status } = await testRequest(app, "GET", "/reports/yearly?year=2026");
      expect(status).toBe(403);
    });
  });
});
