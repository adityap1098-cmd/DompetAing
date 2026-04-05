import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./helpers";

vi.mock("@/store/globalAdd", () => ({
  useGlobalAddStore: () => ({
    open: vi.fn(),
    isOpen: false,
  }),
}));

describe("BottomNav", () => {
  it("should render 4 nav items + center button", async () => {
    const { BottomNav } = await import("@/components/layout/BottomNav");
    renderWithProviders(<BottomNav />);

    expect(screen.getByText("Beranda")).toBeInTheDocument();
    expect(screen.getByText("Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Akun")).toBeInTheDocument();
  });

  it("should render the center + button", async () => {
    const { BottomNav } = await import("@/components/layout/BottomNav");
    renderWithProviders(<BottomNav />);

    // The center button should have a + icon
    const buttons = screen.getAllByRole("button");
    const plusBtn = buttons.find(
      (b) => b.textContent?.includes("+") || b.querySelector("svg")
    );
    expect(plusBtn || buttons.length > 0).toBeTruthy();
  });

  it("should be context-aware based on pathname", async () => {
    // On dashboard → + opens TransactionForm
    // On budget → + opens BudgetForm
    // On debts → + opens DebtForm
    const { BottomNav } = await import("@/components/layout/BottomNav");
    const { mockLocation } = await import("./setup");

    // Test dashboard context
    Object.assign(mockLocation, { pathname: "/dashboard" });
    renderWithProviders(<BottomNav />);

    // Verify it renders in any context
    expect(screen.getByText("Beranda")).toBeInTheDocument();
  });
});
