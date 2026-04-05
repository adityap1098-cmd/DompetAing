import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient, testUser } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/transactions.js");
  const app = new Hono();
  app.route("/transactions", mod.default);
  return app;
};

// CUID-like IDs for validation
const ACC_ID = "clz00000000000000000000aa";
const CAT_ID = "clz00000000000000000000cc";
const TXN_ID = "clz00000000000000000000tt";
const ISO_DATE = "2026-04-05T12:00:00+07:00";

const mockTransaction = {
  id: TXN_ID,
  user_id: "test-user-id",
  account_id: ACC_ID,
  to_account_id: null,
  category_id: CAT_ID,
  sub_category_id: null,
  type: "expense",
  amount: BigInt(85000),
  description: "Makan siang",
  date: new Date("2026-04-05T12:00:00+07:00"),
  notes: null,
  source: "manual",
  is_verified: true,
  recurring_id: null,
  debt_id: null,
  gmail_message_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  account: { id: ACC_ID, name: "BCA", icon: "🏦", color: "#4CAF50" },
  category: { id: CAT_ID, name: "Makanan", icon: "🍔", color: "#FF5722" },
};

describe("Transactions Routes", () => {
  describe("GET /transactions", () => {
    it("should return paginated transactions", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrismaClient.transaction.count.mockResolvedValue(1);

      const { status, json } = await testRequest(app, "GET", "/transactions");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("should filter by type", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findMany.mockResolvedValue([]);
      mockPrismaClient.transaction.count.mockResolvedValue(0);

      const { status } = await testRequest(app, "GET", "/transactions?type=expense");
      expect(status).toBe(200);
    });

    it("should filter by date range", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findMany.mockResolvedValue([]);
      mockPrismaClient.transaction.count.mockResolvedValue(0);

      const { status } = await testRequest(app, "GET", "/transactions?date_from=2026-04-01&date_to=2026-04-30");
      expect(status).toBe(200);
    });

    it("should filter by category", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findMany.mockResolvedValue([]);
      mockPrismaClient.transaction.count.mockResolvedValue(0);

      const { status } = await testRequest(app, "GET", `/transactions?category_id=${CAT_ID}`);
      expect(status).toBe(200);
    });

    it("should search by description", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrismaClient.transaction.count.mockResolvedValue(1);

      const { status } = await testRequest(app, "GET", "/transactions?search=makan");
      expect(status).toBe(200);
    });
  });

  describe("POST /transactions", () => {
    it("should create an expense transaction", async () => {
      const app = await setupApp();
      mockPrismaClient.account.findFirst.mockResolvedValue({ id: ACC_ID, user_id: "test-user-id" });
      mockPrismaClient.transaction.create.mockResolvedValue(mockTransaction);
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(9915000);

      const { status, json } = await testRequest(app, "POST", "/transactions", {
        account_id: ACC_ID,
        category_id: CAT_ID,
        type: "expense",
        amount: 85000,
        description: "Makan siang",
        date: ISO_DATE,
      });
      expect(status).toBe(201);
      expect(json.success).toBe(true);
    });

    it("should create a transfer transaction", async () => {
      const ACC_ID2 = "clz00000000000000000000bb";
      const app = await setupApp();
      mockPrismaClient.account.findFirst
        .mockResolvedValueOnce({ id: ACC_ID, user_id: "test-user-id" })
        .mockResolvedValueOnce({ id: ACC_ID2, user_id: "test-user-id" });
      mockPrismaClient.transaction.create.mockResolvedValue({
        ...mockTransaction,
        type: "transfer",
        to_account_id: ACC_ID2,
      });
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(5000000);

      const { status } = await testRequest(app, "POST", "/transactions", {
        account_id: ACC_ID,
        to_account_id: ACC_ID2,
        type: "transfer",
        amount: 5000000,
        description: "Transfer antar akun",
        date: ISO_DATE,
      });
      expect(status).toBe(201);
    });

    it("should reject transaction without required fields", async () => {
      const app = await setupApp();
      const { status } = await testRequest(app, "POST", "/transactions", {
        type: "expense",
      });
      expect(status).toBe(400);
    });
  });

  describe("PUT /transactions/:id", () => {
    it("should update a transaction", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrismaClient.account.findFirst.mockResolvedValue({ id: ACC_ID, user_id: "test-user-id" });
      mockPrismaClient.transaction.update.mockResolvedValue({ ...mockTransaction, description: "Makan malam" });
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(9915000);

      const { status } = await testRequest(app, "PUT", `/transactions/${TXN_ID}`, {
        description: "Makan malam",
        amount: 85000,
        type: "expense",
        account_id: ACC_ID,
        date: ISO_DATE,
      });
      expect(status).toBe(200);
    });
  });

  describe("DELETE /transactions/:id", () => {
    it("should delete and recompute balance", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrismaClient.transaction.delete.mockResolvedValue(mockTransaction);
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(10000000);

      const { status, json } = await testRequest(app, "DELETE", `/transactions/${TXN_ID}`);
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("Timezone handling (WIB)", () => {
    it("should accept ISO dates in WIB offset", async () => {
      const app = await setupApp();
      mockPrismaClient.transaction.findMany.mockResolvedValue([]);
      mockPrismaClient.transaction.count.mockResolvedValue(0);

      const { status } = await testRequest(app, "GET", "/transactions?date_from=2026-04-01T00:00:00%2B07:00");
      expect(status).toBe(200);
    });
  });
});
