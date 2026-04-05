import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient, testUser } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/accounts.js");
  const app = new Hono();
  app.route("/accounts", mod.default);
  return app;
};

const ACC_ID = "clz00000000000000000000aa";

const mockAccount = {
  id: ACC_ID,
  user_id: "test-user-id",
  name: "BCA Utama",
  type: "bank",
  bank_name: "BCA",
  account_type: "savings",
  last_four: "1234",
  initial_balance: BigInt(10000000),
  color: "#4CAF50",
  icon: "🏦",
  is_active: true,
  sort_order: 0,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("Accounts Routes", () => {
  beforeEach(() => {
    mockPrismaClient.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      user_id: "test-user-id",
      plan: "trial",
      trial_end: new Date(Date.now() + 86400000 * 30),
      premium_end: null,
    });
  });

  describe("GET /accounts", () => {
    it("should return list of user accounts", async () => {
      const app = await setupApp();
      mockPrismaClient.account.findMany.mockResolvedValue([mockAccount]);
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(10000000);

      const { status, json } = await testRequest(app, "GET", "/accounts");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  describe("POST /accounts", () => {
    it("should create a new account", async () => {
      const app = await setupApp();
      mockPrismaClient.account.count.mockResolvedValue(0);
      // aggregate returns { _max: { sort_order: null } } when no rows exist
      mockPrismaClient.account.aggregate.mockResolvedValue({ _max: { sort_order: null } });
      mockPrismaClient.account.create.mockResolvedValue(mockAccount);
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(10000000);

      const { status, json } = await testRequest(app, "POST", "/accounts", {
        name: "BCA Utama",
        type: "bank",
        initial_balance: 10000000,
        color: "#4CAF50",
        icon: "🏦",
      });
      expect(status).toBe(201);
      expect(json.success).toBe(true);
    });

    it("should enforce free plan account limit", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        user_id: "test-user-id",
        plan: "free",
        trial_end: new Date("2026-01-01"),
        premium_end: null,
      });
      mockPrismaClient.account.count.mockResolvedValue(2);

      const { status, json } = await testRequest(app, "POST", "/accounts", {
        name: "Third Account",
        type: "bank",
        initial_balance: 0,
        color: "#000000",
        icon: "🏦",
      });
      expect(status).toBe(403);
      expect(json.error).toBe("limit_reached");
    });
  });

  describe("PUT /accounts/:id", () => {
    it("should update an account", async () => {
      const app = await setupApp();
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.account.update.mockResolvedValue({ ...mockAccount, name: "BCA Updated" });
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(10000000);

      const { status, json } = await testRequest(app, "PUT", `/accounts/${ACC_ID}`, {
        name: "BCA Updated",
      });
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("should return 404 for non-existent account", async () => {
      const app = await setupApp();
      mockPrismaClient.account.findFirst.mockResolvedValue(null);

      const { status } = await testRequest(app, "PUT", "/accounts/nonexistent", {
        name: "Test",
      });
      expect(status).toBe(404);
    });
  });

  describe("DELETE /accounts/:id", () => {
    it("should delete account", async () => {
      const app = await setupApp();
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.transaction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.account.delete.mockResolvedValue(mockAccount);

      const { status, json } = await testRequest(app, "DELETE", `/accounts/${ACC_ID}`);
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("should return 404 for non-existent account", async () => {
      const app = await setupApp();
      mockPrismaClient.account.findFirst.mockResolvedValue(null);

      const { status } = await testRequest(app, "DELETE", "/accounts/nonexistent");
      expect(status).toBe(404);
    });
  });

  describe("Balance computation", () => {
    it("should include computed balance in response", async () => {
      const app = await setupApp();
      mockPrismaClient.account.findMany.mockResolvedValue([mockAccount]);
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(15000000);

      const { status, json } = await testRequest(app, "GET", "/accounts");
      expect(status).toBe(200);
      if (json.data?.[0]) {
        expect(json.data[0].balance).toBe(15000000);
      }
    });
  });
});
