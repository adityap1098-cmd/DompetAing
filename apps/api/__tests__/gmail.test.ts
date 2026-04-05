import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient, testUser } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/gmail.js");
  const app = new Hono();
  app.route("/gmail", mod.default);
  return app;
};

const ACC_ID = "clz00000000000000000000aa";
const CAT_ID = "clz00000000000000000000cc";

describe("Gmail Routes", () => {
  beforeEach(() => {
    mockPrismaClient.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      user_id: "test-user-id",
      plan: "premium",
      trial_end: new Date("2026-01-01"),
      premium_end: new Date("2027-01-01"),
    });
  });

  describe("GET /gmail/status", () => {
    it("should return gmail connection status", async () => {
      const app = await setupApp();
      mockPrismaClient.gmailSource.findMany.mockResolvedValue([]);
      mockPrismaClient.pendingReview.count.mockResolvedValue(0);
      mockPrismaClient.transaction.count.mockResolvedValue(0);

      const { status, json } = await testRequest(app, "GET", "/gmail/status");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("GET /gmail/pending", () => {
    it("should return pending reviews list", async () => {
      const app = await setupApp();
      mockPrismaClient.pendingReview.findMany.mockResolvedValue([
        {
          id: "pr-1",
          user_id: "test-user-id",
          gmail_message_id: "msg-1",
          raw_subject: "Transaksi BCA",
          bank_name: "BCA",
          parsed_amount: BigInt(500000),
          parsed_type: "expense",
          parsed_merchant: "Tokopedia",
          parsed_description: "Charger USB-C",
          parsed_date: new Date(),
          status: "pending",
          suggested_category_id: CAT_ID,
          suggested_account_id: ACC_ID,
          created_at: new Date(),
        },
      ]);
      // resolveRefs in pending route calls category.findMany and account.findMany
      mockPrismaClient.category.findMany.mockResolvedValue([
        { id: CAT_ID, name: "Belanja", icon: "🛒", color: "#FF5722" },
      ]);
      mockPrismaClient.account.findMany.mockResolvedValue([
        { id: ACC_ID, name: "BCA", type: "bank", icon: "🏦", color: "#4CAF50" },
      ]);

      const { status, json } = await testRequest(app, "GET", "/gmail/pending");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("PATCH /gmail/pending/:id/approve", () => {
    it("should approve and create transaction", async () => {
      const app = await setupApp();
      mockPrismaClient.pendingReview.findFirst.mockResolvedValue({
        id: "pr-1",
        user_id: "test-user-id",
        parsed_amount: BigInt(500000),
        parsed_type: "expense",
        parsed_merchant: "Tokopedia",
        parsed_description: "Charger USB-C",
        parsed_date: new Date(),
        status: "pending",
        gmail_message_id: "msg-1",
        bank_name: "BCA",
      });
      mockPrismaClient.account.findFirst.mockResolvedValue({ id: ACC_ID, user_id: "test-user-id" });
      // Route uses array-form $transaction([create, update])
      // Mock returns the resolved values of the array elements
      mockPrismaClient.$transaction.mockResolvedValue([
        { id: "txn-1" }, // transaction.create result
        { id: "pr-1", status: "approved" }, // pendingReview.update result
      ]);
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(500000);

      const { status } = await testRequest(app, "PATCH", "/gmail/pending/pr-1/approve", {
        account_id: ACC_ID,
        amount: 500000,
        type: "expense",
        description: "Tokopedia: Charger USB-C",
        date: "2026-04-05T00:00:00+07:00",
      });
      expect(status).toBe(200);
    });
  });

  describe("PATCH /gmail/pending/:id/skip", () => {
    it("should skip a pending review", async () => {
      const app = await setupApp();
      mockPrismaClient.pendingReview.findFirst.mockResolvedValue({
        id: "pr-1",
        user_id: "test-user-id",
        status: "pending",
      });
      mockPrismaClient.pendingReview.update.mockResolvedValue({ id: "pr-1", status: "skipped" });

      const { status } = await testRequest(app, "PATCH", "/gmail/pending/pr-1/skip");
      expect(status).toBe(200);
    });
  });

  describe("Feature gate", () => {
    it("should block free users from Gmail sync", async () => {
      const app = await setupApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        user_id: "test-user-id",
        plan: "free",
        trial_end: new Date("2026-01-01"),
        premium_end: null,
      });

      const { status, json } = await testRequest(app, "POST", "/gmail/sync");
      expect(status).toBe(403);
      expect(json.error).toBe("premium_required");
    });
  });
});
