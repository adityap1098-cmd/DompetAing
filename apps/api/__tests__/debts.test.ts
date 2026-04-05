import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/debts.js");
  const app = new Hono();
  app.route("/debts", mod.default);
  return app;
};

const DEBT_ID = "clz000000000000000000debt";
const ACC_ID = "clz00000000000000000000aa";
const ISO_DATE = "2026-04-01T00:00:00+07:00";
const ISO_DUE = "2026-04-15T00:00:00+07:00";

const mockDebt = {
  id: DEBT_ID,
  user_id: "test-user-id",
  type: "hutang",
  person_name: "Ahmad",
  amount: BigInt(500000),
  description: "Pinjam untuk makan",
  borrow_date: new Date("2026-04-01"),
  due_date: new Date("2026-04-15"),
  is_paid: false,
  paid_at: null,
  auto_record: true,
  account_id: ACC_ID,
  transaction_id: null,
  reminder_enabled: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("Debts Routes", () => {
  describe("GET /debts", () => {
    it("should return user debts with summary", async () => {
      const app = await setupApp();
      mockPrismaClient.debt.findMany.mockResolvedValue([mockDebt]);
      mockPrismaClient.debt.aggregate
        .mockResolvedValueOnce({ _sum: { amount: BigInt(500000) } })
        .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } });
      mockPrismaClient.debt.count.mockResolvedValue(0);

      const { status, json } = await testRequest(app, "GET", "/debts");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("POST /debts", () => {
    it("should create a new debt", async () => {
      const app = await setupApp();
      mockPrismaClient.debt.create.mockResolvedValue(mockDebt);

      const { status, json } = await testRequest(app, "POST", "/debts", {
        type: "hutang",
        person_name: "Ahmad",
        amount: 500000,
        description: "Pinjam untuk makan",
        borrow_date: ISO_DATE,
        due_date: ISO_DUE,
        auto_record: true,
        reminder_enabled: true,
      });
      expect(status).toBe(201);
      expect(json.success).toBe(true);
    });
  });

  describe("PATCH /debts/:id/pay — Tandai Lunas", () => {
    it("should mark debt as paid without auto-record", async () => {
      const app = await setupApp();
      mockPrismaClient.debt.findFirst.mockResolvedValue(mockDebt);
      mockPrismaClient.debt.update.mockResolvedValue({ ...mockDebt, is_paid: true });

      const { status, json } = await testRequest(app, "PATCH", `/debts/${DEBT_ID}/pay`, {
        auto_record: false,
      });
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("should auto-record transaction when marking as paid", async () => {
      const app = await setupApp();
      mockPrismaClient.debt.findFirst.mockResolvedValue(mockDebt);
      mockPrismaClient.account.findFirst.mockResolvedValue({ id: ACC_ID, user_id: "test-user-id" });
      mockPrismaClient.category.findFirst.mockResolvedValue({ id: "cat-hutang" });
      mockPrismaClient.transaction.create.mockResolvedValue({
        id: "txn-auto-1",
        type: "expense",
        amount: BigInt(500000),
        description: "Pelunasan hutang ke Ahmad",
        date: new Date(),
      });
      mockPrismaClient.debt.update.mockResolvedValue({
        ...mockDebt,
        is_paid: true,
        paid_at: new Date(),
        transaction_id: "txn-auto-1",
      });
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(500000);

      const { status } = await testRequest(app, "PATCH", `/debts/${DEBT_ID}/pay`, {
        auto_record: true,
        account_id: ACC_ID,
      });
      expect(status).toBe(200);
    });
  });

  describe("PATCH /debts/:id/unpay — Batal Lunas", () => {
    it("should revert paid status", async () => {
      const paidDebt = {
        ...mockDebt,
        is_paid: true,
        transaction_id: "txn-auto-1",
        paid_at: new Date(),
      };
      const app = await setupApp();
      mockPrismaClient.debt.findFirst.mockResolvedValue(paidDebt);
      // Route uses findMany to get linked transactions (not findFirst)
      mockPrismaClient.transaction.findMany.mockResolvedValue([{ id: "txn-auto-1", account_id: ACC_ID }]);
      mockPrismaClient.transaction.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.debt.update.mockResolvedValue({
        ...paidDebt,
        is_paid: false,
        paid_at: null,
        transaction_id: null,
      });
      const { computeAccountBalance } = vi.mocked(await import("../src/lib/computed.js"));
      computeAccountBalance.mockResolvedValue(1000000);

      const { status } = await testRequest(app, "PATCH", `/debts/${DEBT_ID}/unpay`);
      expect(status).toBe(200);
    });
  });

  describe("DELETE /debts/:id", () => {
    it("should delete a debt", async () => {
      const app = await setupApp();
      mockPrismaClient.debt.findFirst.mockResolvedValue(mockDebt);
      mockPrismaClient.debt.delete.mockResolvedValue(mockDebt);

      const { status } = await testRequest(app, "DELETE", `/debts/${DEBT_ID}`);
      expect(status).toBe(200);
    });
  });
});
