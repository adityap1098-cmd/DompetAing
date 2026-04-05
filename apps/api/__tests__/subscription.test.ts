import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient, testUser } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/subscription.js");
  const app = new Hono();
  app.route("/subscription", mod.default);
  return app;
};

const mockSubscription = {
  id: "sub-1",
  user_id: "test-user-id",
  plan: "trial",
  trial_start: new Date("2026-03-29"),
  trial_end: new Date("2026-04-28"),
  premium_start: null,
  premium_end: null,
  midtrans_subscription_id: null,
  is_active: true,
  auto_renew: false,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("Subscription Routes", () => {
  describe("GET /subscription", () => {
    it("should return subscription status", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue(mockSubscription);

      const { status, json } = await testRequest(app, "GET", "/subscription");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });

    it("should compute trial plan correctly", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue(mockSubscription);

      const { json } = await testRequest(app, "GET", "/subscription");
      expect(json.data.effective_plan).toBe("trial");
    });

    it("should compute expired trial as free", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        trial_end: new Date("2026-01-01"),
      });

      const { json } = await testRequest(app, "GET", "/subscription");
      expect(json.data.effective_plan).toBe("free");
    });

    it("should compute premium plan correctly", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        plan: "premium",
        premium_start: new Date("2026-04-01"),
        premium_end: new Date("2027-04-01"),
      });

      const { json } = await testRequest(app, "GET", "/subscription");
      expect(json.data.effective_plan).toBe("premium");
    });
  });

  describe("Feature gate (unit)", () => {
    it("trial user should have full access", async () => {
      const { getEffectivePlan } = await import("../src/middleware/subscription.js");
      const plan = getEffectivePlan({
        plan: "trial",
        trial_end: new Date(Date.now() + 86400000),
        premium_end: null,
      });
      expect(plan).toBe("trial");
    });

    it("expired trial should be free", async () => {
      const { getEffectivePlan } = await import("../src/middleware/subscription.js");
      const plan = getEffectivePlan({
        plan: "trial",
        trial_end: new Date("2026-01-01"),
        premium_end: null,
      });
      expect(plan).toBe("free");
    });

    it("premium should have full access", async () => {
      const { getEffectivePlan } = await import("../src/middleware/subscription.js");
      const plan = getEffectivePlan({
        plan: "premium",
        trial_end: new Date("2026-01-01"),
        premium_end: new Date(Date.now() + 86400000 * 365),
      });
      expect(plan).toBe("premium");
    });

    it("expired premium should be free", async () => {
      const { getEffectivePlan } = await import("../src/middleware/subscription.js");
      const plan = getEffectivePlan({
        plan: "premium",
        trial_end: new Date("2026-01-01"),
        premium_end: new Date("2026-01-01"),
      });
      expect(plan).toBe("free");
    });

    it("null subscription should be free", async () => {
      const { getEffectivePlan } = await import("../src/middleware/subscription.js");
      const plan = getEffectivePlan(null);
      expect(plan).toBe("free");
    });
  });
});
