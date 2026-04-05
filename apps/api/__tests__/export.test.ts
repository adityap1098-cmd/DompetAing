import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/export.js");
  const app = new Hono();
  app.route("/export", mod.default);
  return app;
};

describe("Export Routes", () => {
  beforeEach(() => {
    // Premium user for export access
    mockPrismaClient.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      user_id: "test-user-id",
      plan: "premium",
      trial_end: new Date("2026-01-01"),
      premium_end: new Date("2027-01-01"),
    });
  });

  describe("POST /export/csv", () => {
    it("should generate CSV export", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findMany.mockResolvedValue([
        {
          id: "txn-1",
          date: new Date("2026-04-05"),
          description: "Makan siang",
          amount: BigInt(85000),
          type: "expense",
          account: { name: "BCA" },
          category: { name: "Makanan" },
        },
      ]);

      const { status } = await testRequest(app, "POST", "/export/csv", {
        date_from: "2026-04-01",
        date_to: "2026-04-30",
      });
      expect(status).toBe(200);
    });
  });

  describe("POST /export/excel", () => {
    it("should generate Excel export", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findMany.mockResolvedValue([]);
      mockPrismaClient.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: BigInt(5000000) } })
        .mockResolvedValueOnce({ _sum: { amount: BigInt(3000000) } });

      const { status } = await testRequest(app, "POST", "/export/excel", {
        date_from: "2026-04-01",
        date_to: "2026-04-30",
      });
      expect(status).toBe(200);
    });
  });

  describe("Feature gate for export", () => {
    it("should block free users from export", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        user_id: "test-user-id",
        plan: "free",
        trial_end: new Date("2026-01-01"),
        premium_end: null,
      });

      const { status, json } = await testRequest(app, "POST", "/export/csv", {
        date_from: "2026-04-01",
        date_to: "2026-04-30",
      });
      expect(status).toBe(403);
      expect(json.error).toBe("premium_required");
    });
  });
});
