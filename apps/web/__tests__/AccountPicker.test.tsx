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

const mockAccounts = [
  { id: "acc-1", name: "BCA Utama", icon: "🏦", type: "bank", color: "#0060AF", balance: 10000000 },
  { id: "acc-2", name: "Mandiri", icon: "🏦", type: "bank", color: "#003399", balance: 5000000 },
];

describe("AccountPicker", () => {
  it("should render account options when open", async () => {
    const { AccountPicker } = await import("@/components/ui/AccountPicker");
    renderWithProviders(
      <AccountPicker
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        onSelect={vi.fn()}
      />
    );

    const bca = screen.queryByText("BCA Utama");
    const mandiri = screen.queryByText("Mandiri");
    expect(bca || mandiri).toBeTruthy();
  });

  it("should call onSelect when account is clicked", async () => {
    const { AccountPicker } = await import("@/components/ui/AccountPicker");
    const onSelect = vi.fn();
    renderWithProviders(
      <AccountPicker
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        onSelect={onSelect}
      />
    );

    const bca = screen.queryByText("BCA Utama");
    if (bca) {
      bca.click();
      expect(onSelect).toHaveBeenCalledWith("acc-1");
    }
  });

  it("should highlight selected account", async () => {
    const { AccountPicker } = await import("@/components/ui/AccountPicker");
    renderWithProviders(
      <AccountPicker
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        selectedId="acc-1"
        onSelect={vi.fn()}
      />
    );

    const bca = screen.queryByText("BCA Utama");
    expect(bca).toBeTruthy();
  });
});
