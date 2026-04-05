import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient, testUser, adminUser } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/admin.js");
  const app = new Hono();
  app.route("/admin", mod.default);
  return app;
};

describe("Admin Routes", () => {
  describe("Admin middleware", () => {
    it("should block non-admin users", async () => {
      const app = await setupApp();
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      const { status } = await testRequest(app, "GET", "/admin/stats");
      expect(status).toBe(403);
    });

    it("should allow admin users", async () => {
      const app = await setupApp();
      // requireAuth + requireAdmin both call user.findUnique; return admin for all
      mockPrismaClient.user.findUnique.mockResolvedValue(adminUser);
      mockPrismaClient.user.count.mockResolvedValue(2);
      mockPrismaClient.transaction.count.mockResolvedValue(10);
      mockPrismaClient.payment.findMany.mockResolvedValue([]);
      mockPrismaClient.subscription.findMany.mockResolvedValue([]);
      // Route also queries recent signups via user.findMany
      mockPrismaClient.user.findMany.mockResolvedValue([]);

      const { status, json } = await testRequest(app, "GET", "/admin/stats");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("Grant/Revoke premium", () => {
    it("should grant premium to user", async () => {
      const app = await setupApp();
      // requireAuth calls user.findUnique with session userId → admin
      // Route also calls user.findUnique with { email } → target user
      mockPrismaClient.user.findUnique
        .mockResolvedValueOnce(adminUser) // requireAuth
        .mockResolvedValueOnce(testUser); // target user lookup by email
      mockPrismaClient.subscription.upsert.mockResolvedValue({
        id: "sub-1",
        plan: "premium",
      });

      // Route expects { email, duration } not { user_id, days }
      const { status } = await testRequest(app, "POST", "/admin/grant-premium", {
        email: "test@example.com",
        duration: "monthly",
      });
      expect(status).toBe(200);
    });

    it("should revoke premium from user", async () => {
      const app = await setupApp();
      mockPrismaClient.user.findUnique
        .mockResolvedValueOnce(adminUser) // requireAuth
        .mockResolvedValueOnce(testUser); // target user lookup by email
      mockPrismaClient.subscription.updateMany.mockResolvedValue({ count: 1 });

      // Route expects { email } not { user_id }
      const { status } = await testRequest(app, "POST", "/admin/revoke-premium", {
        email: "test@example.com",
      });
      expect(status).toBe(200);
    });
  });
});
