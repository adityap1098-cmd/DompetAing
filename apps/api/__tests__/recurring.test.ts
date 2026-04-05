import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/recurring.js");
  const app = new Hono();
  app.route("/recurring", mod.default);
  return app;
};

const ACC_ID = "clz00000000000000000000aa";
const CAT_ID = "clz00000000000000000000cc";
const REC_ID = "clz000000000000000000recc";

const mockRecurring = {
  id: REC_ID,
  user_id: "test-user-id",
  account_id: ACC_ID,
  category_id: CAT_ID,
  sub_category_id: null,
  type: "expense",
  amount: BigInt(150000),
  description: "Internet bulanan",
  frequency: "monthly",
  day_of_month: 1,
  day_of_week: null,
  active_days: null,
  is_active: true,
  next_run: new Date("2026-05-01"),
  last_run: null,
  created_at: new Date(),
  updated_at: new Date(),
  account: { id: ACC_ID, name: "BCA", icon: "🏦" },
  category: { id: CAT_ID, name: "Internet", icon: "🌐" },
};

describe("Recurring Routes", () => {
  // resolveRefs() in the route calls category.findMany and account.findMany
  // to resolve references for serialization
  beforeEach(() => {
    mockPrismaClient.category.findMany.mockResolvedValue([
      { id: CAT_ID, name: "Internet", icon: "🌐", color: "#2196F3" },
    ]);
    mockPrismaClient.account.findMany.mockResolvedValue([
      { id: ACC_ID, name: "BCA", type: "bank", icon: "🏦", color: "#4CAF50" },
    ]);
  });

  describe("GET /recurring", () => {
    it("should return recurring transactions", async () => {
      const app = await setupApp();
      mockPrismaClient.recurringTransaction.findMany.mockResolvedValue([mockRecurring]);

      const { status, json } = await testRequest(app, "GET", "/recurring");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("POST /recurring", () => {
    it("should create a monthly recurring transaction", async () => {
      const app = await setupApp();
      mockPrismaClient.recurringTransaction.create.mockResolvedValue(mockRecurring);

      const { status, json } = await testRequest(app, "POST", "/recurring", {
        account_id: ACC_ID,
        category_id: CAT_ID,
        type: "expense",
        amount: 150000,
        description: "Internet bulanan",
        frequency: "monthly",
        day_of_month: 1,
      });
      expect(status).toBe(201);
    });

    it("should create a daily recurring with active_days", async () => {
      const app = await setupApp();
      mockPrismaClient.recurringTransaction.create.mockResolvedValue({
        ...mockRecurring,
        frequency: "daily",
        active_days: "1,2,3,4,5",
      });

      const { status } = await testRequest(app, "POST", "/recurring", {
        account_id: ACC_ID,
        category_id: CAT_ID,
        type: "expense",
        amount: 50000,
        description: "Makan siang kerja",
        frequency: "daily",
        active_days: "1,2,3,4,5",
      });
      expect(status).toBe(201);
    });
  });

  describe("PATCH /recurring/:id/toggle", () => {
    it("should toggle active status", async () => {
      const app = await setupApp();
      mockPrismaClient.recurringTransaction.findFirst.mockResolvedValue(mockRecurring);
      mockPrismaClient.recurringTransaction.update.mockResolvedValue({
        ...mockRecurring,
        is_active: false,
      });

      const { status } = await testRequest(app, "PATCH", `/recurring/${REC_ID}/toggle`);
      expect(status).toBe(200);
    });
  });

  describe("DELETE /recurring/:id", () => {
    it("should delete a recurring transaction", async () => {
      const app = await setupApp();
      mockPrismaClient.recurringTransaction.findFirst.mockResolvedValue(mockRecurring);
      mockPrismaClient.recurringTransaction.delete.mockResolvedValue(mockRecurring);

      const { status } = await testRequest(app, "DELETE", `/recurring/${REC_ID}`);
      expect(status).toBe(200);
    });
  });
});
