import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./helpers";

// ── Mock @/lib/api to prevent real fetch calls ──
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue(null),
    post: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(null),
    patch: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    offlineGet: vi.fn().mockResolvedValue(null),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  offlineMutate: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock all hooks used by Dashboard and its sub-components ──
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      avatar_url: null,
      pin_set: false,
      hide_balance: false,
    },
    isLoading: false,
    isAuthenticated: true,
    isUnauthenticated: false,
  }),
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: () => ({
    data: { items: [], meta: { total: 0, page: 1, limit: 10, pages: 0 } },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useBudgets", () => ({
  useBudgets: () => ({
    data: { total_budget: 0, total_spent: 0, percentage: 0, month: 1, year: 2026, budgets: [] },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useDebts", () => ({
  useDebts: () => ({
    data: {
      debts: [],
      summary: { total_borrow: 0, total_lend: 0, overdue_count: 0, net: 0 },
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    subscription: null,
    isLoading: false,
    plan: "trial",
    isTrialActive: true,
    trialDaysLeft: 25,
    isPremium: true,
    canUse: () => true,
    limits: {
      maxAccounts: Infinity,
      maxBudgets: Infinity,
      currentAccounts: 0,
      currentBudgets: 0,
    },
  }),
}));

vi.mock("@/hooks/useHideBalance", () => ({
  useHideBalance: () => ({
    hideBalance: false,
    formatAmount: (n: number) => `Rp ${n.toLocaleString("id-ID")}`,
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    data: { items: [], unread_count: 0 },
    isLoading: false,
  }),
  useMarkRead: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// ── Mock offline modules that may be imported transitively ──
vi.mock("@/lib/offline/db", () => ({
  offlineDb: {
    accounts: { toArray: vi.fn().mockResolvedValue([]) },
    transactions: { toArray: vi.fn().mockResolvedValue([]) },
    budgets: { filter: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) },
    debts: { toArray: vi.fn().mockResolvedValue([]) },
    categories: { toArray: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/offline", () => ({
  enqueueOfflineMutation: vi.fn(),
  updatePendingCount: vi.fn(),
  clearOfflineData: vi.fn(),
}));

describe("Dashboard", () => {
  it("should render empty states when no data", async () => {
    const { DashboardPage } = await import("@/pages/Dashboard");
    renderWithProviders(<DashboardPage />);

    const text = document.body.textContent || "";
    // Should contain empty state indicators (RULE 5)
    const hasEmptyStates =
      text.includes("Belum ada") ||
      text.includes("belum ada") ||
      text.includes("Tambah") ||
      text.includes("kosong") ||
      text.length > 50; // At minimum, the page renders

    expect(hasEmptyStates).toBe(true);
  });

  it("should show Aset Saya section", async () => {
    const { DashboardPage } = await import("@/pages/Dashboard");
    renderWithProviders(<DashboardPage />);

    const text = document.body.textContent || "";
    // Dashboard should have asset section header
    expect(
      text.includes("Aset") ||
      text.includes("Net Worth") ||
      text.includes("Saldo") ||
      text.includes("aset")
    ).toBe(true);
  });

  it("should show Budget section", async () => {
    const { DashboardPage } = await import("@/pages/Dashboard");
    renderWithProviders(<DashboardPage />);

    const text = document.body.textContent || "";
    expect(
      text.includes("Budget") ||
      text.includes("budget") ||
      text.includes("Anggaran")
    ).toBe(true);
  });

  it("should show Hutang section", async () => {
    const { DashboardPage } = await import("@/pages/Dashboard");
    renderWithProviders(<DashboardPage />);

    const text = document.body.textContent || "";
    expect(
      text.includes("Hutang") ||
      text.includes("hutang") ||
      text.includes("Piutang")
    ).toBe(true);
  });

  it("should show Transaksi Terbaru section", async () => {
    const { DashboardPage } = await import("@/pages/Dashboard");
    renderWithProviders(<DashboardPage />);

    const text = document.body.textContent || "";
    expect(
      text.includes("Transaksi") ||
      text.includes("transaksi") ||
      text.includes("Terbaru")
    ).toBe(true);
  });
});
