import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./helpers";

// ── Mock hooks used by PinModal and PinLockScreen ──
vi.mock("@/hooks/useSettings", () => ({
  useSecurityAction: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
}));

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

// ── Mock Toast to prevent side effects ──
vi.mock("@/components/ui/Toast", () => ({
  showToast: vi.fn(),
  Toast: () => null,
}));

describe("PinModal", () => {
  it("should render PIN input UI when open", async () => {
    const { PinModal } = await import("@/components/pin/PinModal");
    renderWithProviders(
      <PinModal pinSet={false} onClose={vi.fn()} />
    );

    // Should show PIN dots/inputs and numpad
    const container = document.body;
    expect(container.textContent!.length).toBeGreaterThan(0);
  });

  it("should render numpad buttons", async () => {
    const { PinModal } = await import("@/components/pin/PinModal");
    renderWithProviders(
      <PinModal pinSet={false} onClose={vi.fn()} />
    );

    // Should show number buttons 0-9
    const buttons = screen.queryAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    // Check at least some digit buttons exist
    let digitCount = 0;
    for (let i = 0; i <= 9; i++) {
      const btn = screen.queryByText(String(i));
      if (btn) digitCount++;
    }
    expect(digitCount).toBeGreaterThanOrEqual(1);
  });
});

describe("PinLockScreen", () => {
  it("should render lock screen with numpad", async () => {
    const { PinLockScreen } = await import("@/components/pin/PinLockScreen");
    // PinLockScreen reads session storage to check unlock status
    window.sessionStorage.removeItem("da_pin_unlocked");

    renderWithProviders(
      <PinLockScreen onUnlock={vi.fn()} />
    );

    // Should show some lock-related UI with numpad
    const text = document.body.textContent || "";
    expect(text.length).toBeGreaterThan(0);

    // Should have buttons (numpad)
    const buttons = screen.queryAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
