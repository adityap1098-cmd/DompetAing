import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/budgets.js");
  const app = new Hono();
  app.route("/budgets", mod.default);
  return app;
};

const CAT_ID = "clz00000000000000000000cc";
const BGT_ID = "clz0000000000000000000bgt";

const mockBudget = {
  id: BGT_ID,
  user_id: "test-user-id",
  category_id: CAT_ID,
  amount: BigInt(500000),
  period_type: "monthly",
  period_month: 4,
  period_year: 2026,
  start_date: null,
  end_date: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  category: {
    id: CAT_ID,
    name: "Makanan",
    icon: "🍔",
    color: "#FF5722",
    type: "expense",
    sub_categories: [],
  },
};

describe("Budgets Routes", () => {
  beforeEach(() => {
    mockPrismaClient.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      user_id: "test-user-id",
      plan: "trial",
      trial_end: new Date(Date.now() + 86400000 * 30),
      premium_end: null,
    });
  });

  describe("GET /budgets", () => {
    it("should return budgets for a month", async () => {
      const app = await setupApp();
      mockPrismaClient.budget.findMany.mockResolvedValue([mockBudget]);
      const { computeBudgetSpent } = vi.mocked(await import("../src/lib/computed.js"));
      computeBudgetSpent.mockResolvedValue(250000);

      const { status, json } = await testRequest(app, "GET", "/budgets?month=4&year=2026");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("POST /budgets", () => {
    it("should create a budget", async () => {
      const app = await setupApp();
      mockPrismaClient.budget.count.mockResolvedValue(0);
      mockPrismaClient.budget.findFirst.mockResolvedValue(null); // no duplicate
      mockPrismaClient.budget.create.mockResolvedValue(mockBudget);
      const { computeBudgetSpent } = vi.mocked(await import("../src/lib/computed.js"));
      computeBudgetSpent.mockResolvedValue(0);

      const { status, json } = await testRequest(app, "POST", "/budgets", {
        category_id: CAT_ID,
        amount: 500000,
        period_type: "monthly",
        period_month: 4,
        period_year: 2026,
      });
      expect(status).toBe(201);
    });

    it("should enforce free plan budget limit", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        user_id: "test-user-id",
        plan: "free",
        trial_end: new Date("2026-01-01"),
        premium_end: null,
      });
      mockPrismaClient.budget.count.mockResolvedValue(3);

      const { status } = await testRequest(app, "POST", "/budgets", {
        category_id: CAT_ID,
        amount: 500000,
        period_type: "monthly",
        period_month: 4,
        period_year: 2026,
      });
      expect(status).toBe(403);
    });
  });

  describe("PUT /budgets/:id", () => {
    it("should update budget amount", async () => {
      const app = await setupApp();
      mockPrismaClient.budget.findFirst.mockResolvedValue(mockBudget);
      mockPrismaClient.budget.update.mockResolvedValue({ ...mockBudget, amount: BigInt(750000) });
      const { computeBudgetSpent } = vi.mocked(await import("../src/lib/computed.js"));
      computeBudgetSpent.mockResolvedValue(250000);

      const { status, json } = await testRequest(app, "PUT", `/budgets/${BGT_ID}`, {
        amount: 750000,
      });
      expect(status).toBe(200);
    });
  });

  describe("DELETE /budgets/:id", () => {
    it("should delete a budget", async () => {
      const app = await setupApp();
      mockPrismaClient.budget.findFirst.mockResolvedValue(mockBudget);
      mockPrismaClient.budget.delete.mockResolvedValue(mockBudget);

      const { status } = await testRequest(app, "DELETE", `/budgets/${BGT_ID}`);
      expect(status).toBe(200);
    });
  });

  describe("Spent computation", () => {
    it("should compute and return spent amount", async () => {
      const app = await setupApp();
      mockPrismaClient.budget.findMany.mockResolvedValue([mockBudget]);
      const { computeBudgetSpent } = vi.mocked(await import("../src/lib/computed.js"));
      computeBudgetSpent.mockResolvedValue(420000);

      const { status, json } = await testRequest(app, "GET", "/budgets?month=4&year=2026");
      expect(status).toBe(200);
      if (json.data?.[0]) {
        expect(json.data[0].spent).toBeDefined();
      }
    });
  });
});
