import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrismaClient, testUser, mockSession } from "./setup";

describe("Security Tests", () => {
  describe("SQL Injection Protection", () => {
    it("should safely handle SQL injection in search", async () => {
      const { Hono } = await import("hono");
      const mod = await import("../src/routes/transactions.js");
      const app = new Hono();
      app.route("/transactions", mod.default);

      mockPrismaClient.transaction.findMany.mockResolvedValue([]);
      mockPrismaClient.transaction.count.mockResolvedValue(0);

      const res = await app.request(
        "http://localhost/transactions?search=' OR 1=1 --",
        { method: "GET", headers: { Cookie: "dompetaing_session=mock" } }
      );
      // Prisma parameterizes queries — should return normally
      expect(res.status).toBe(200);
    });

    it("should safely handle SQL injection in account name", async () => {
      const { Hono } = await import("hono");
      const mod = await import("../src/routes/accounts.js");
      const app = new Hono();
      app.route("/accounts", mod.default);

      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        plan: "trial",
        trial_end: new Date(Date.now() + 86400000 * 30),
        premium_end: null,
      });
      mockPrismaClient.account.count.mockResolvedValue(0);
      mockPrismaClient.account.findFirst.mockResolvedValue(null);
      // Route uses aggregate for maxOrder — must return { _max: { sort_order } }
      mockPrismaClient.account.aggregate.mockResolvedValue({ _max: { sort_order: null } });
      mockPrismaClient.account.create.mockResolvedValue({
        id: "acc-1",
        user_id: "test-user-id",
        name: "'; DROP TABLE users; --",
        type: "bank",
        bank_name: null,
        account_type: null,
        last_four: null,
        initial_balance: BigInt(0),
        color: "#000000",
        icon: "🏦",
        is_active: true,
        sort_order: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(0);

      const res = await app.request("http://localhost/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "dompetaing_session=mock" },
        body: JSON.stringify({
          name: "'; DROP TABLE users; --",
          type: "bank",
          initial_balance: 0,
          color: "#000000",
          icon: "🏦",
        }),
      });
      // Stored safely as literal string, not executed
      expect(res.status).toBe(201);
    });
  });

  describe("XSS Injection Protection", () => {
    it("should store XSS payload as literal text", async () => {
      const { Hono } = await import("hono");
      const mod = await import("../src/routes/transactions.js");
      const app = new Hono();
      app.route("/transactions", mod.default);

      const ACC_ID = "clz00000000000000000000aa";
      const CAT_ID = "clz00000000000000000000cc";
      const xssPayload = '<script>alert("XSS")</script>';

      mockPrismaClient.account.findFirst.mockResolvedValue({ id: ACC_ID, user_id: "test-user-id" });
      mockPrismaClient.transaction.create.mockResolvedValue({
        id: "txn-1",
        user_id: "test-user-id",
        description: xssPayload,
        amount: BigInt(1000),
        type: "expense",
        category_id: CAT_ID,
        sub_category_id: null,
        account_id: ACC_ID,
        to_account_id: null,
        notes: null,
        date: new Date(),
        source: "manual",
        gmail_message_id: null,
        recurring_id: null,
        debt_id: null,
        is_verified: true,
        category: { id: CAT_ID, name: "Belanja", icon: "🛒", color: "#FF5722" },
        sub_category: null,
        account: { id: ACC_ID, name: "BCA", type: "bank", icon: "🏦", color: "#4CAF50" },
        to_account: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(999000);

      const res = await app.request("http://localhost/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "dompetaing_session=mock" },
        body: JSON.stringify({
          account_id: ACC_ID,
          category_id: CAT_ID,
          type: "expense",
          amount: 1000,
          description: xssPayload,
          date: "2026-04-05T00:00:00+07:00",
        }),
      });
      expect(res.status).toBe(201);
    });
  });

  describe("Unauthorized Access", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession.userId = "";

      const { Hono } = await import("hono");
      const mod = await import("../src/routes/accounts.js");
      const app = new Hono();
      app.route("/accounts", mod.default);

      const res = await app.request("http://localhost/accounts", {
        method: "GET",
        headers: { Cookie: "dompetaing_session=mock" },
      });
      expect(res.status).toBe(401);
    });

    it("should prevent user from accessing other users data", async () => {
      const { Hono } = await import("hono");
      const mod = await import("../src/routes/accounts.js");
      const app = new Hono();
      app.route("/accounts", mod.default);

      // findFirst with user_id filter returns null
      mockPrismaClient.account.findFirst.mockResolvedValue(null);

      const res = await app.request("http://localhost/accounts/other-user-acc", {
        method: "DELETE",
        headers: { Cookie: "dompetaing_session=mock" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("Admin Endpoint Protection", () => {
    it("should return 403 for non-admin accessing admin endpoints", async () => {
      const { Hono } = await import("hono");
      const mod = await import("../src/routes/admin.js");
      const app = new Hono();
      app.route("/admin", mod.default);

      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      const res = await app.request("http://localhost/admin/stats", {
        method: "GET",
        headers: { Cookie: "dompetaing_session=mock" },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Rapid Request Handling", () => {
    it("should handle 50 concurrent requests without crashing", async () => {
      const { Hono } = await import("hono");
      const mod = await import("../src/routes/accounts.js");
      const app = new Hono();
      app.route("/accounts", mod.default);

      mockPrismaClient.account.findMany.mockResolvedValue([]);
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(0);

      const requests = Array.from({ length: 50 }, () =>
        app.request("http://localhost/accounts", {
          method: "GET",
          headers: { Cookie: "dompetaing_session=mock" },
        })
      );

      const results = await Promise.all(requests);
      results.forEach((res) => expect(res.status).toBe(200));
    });
  });

  describe("Invalid Session", () => {
    it("should handle deleted user gracefully", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const { Hono } = await import("hono");
      const mod = await import("../src/routes/accounts.js");
      const app = new Hono();
      app.route("/accounts", mod.default);

      const res = await app.request("http://localhost/accounts", {
        method: "GET",
        headers: { Cookie: "dompetaing_session=mock" },
      });
      expect(res.status).toBe(401);
    });
  });
});
