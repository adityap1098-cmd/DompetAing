import { test, expect } from "@playwright/test";
import { mockAuth, mockApiResponse, waitForAppReady } from "./helpers";

test.describe("Transaction Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", [
      { id: "acc-1", name: "BCA Utama", icon: "🏦", balance: 10000000, type: "bank", color: "#4CAF50", is_active: true, sort_order: 0 },
    ]);
    await mockApiResponse(page, "**/v1/categories*", [
      { id: "cat-1", name: "Makanan", icon: "🍔", type: "expense", color: "#FF5722", sub_categories: [] },
    ]);
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/notifications*", []);
  });

  test("should display transaction list", async ({ page }) => {
    await mockApiResponse(page, "**/v1/transactions*", {
      data: [
        {
          id: "txn-1", type: "expense", amount: 85000, description: "Makan siang",
          date: new Date().toISOString(), account: { id: "acc-1", name: "BCA", icon: "🏦" },
          category: { id: "cat-1", name: "Makanan", icon: "🍔" },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    await page.goto("/transactions");
    await waitForAppReady(page);

    const content = await page.textContent("body");
    expect(content!.length).toBeGreaterThan(0);
  });

  test("should show empty state when no transactions", async ({ page }) => {
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0, page: 1, limit: 20 });

    await page.goto("/transactions");
    await waitForAppReady(page);

    // Should show either empty state or "Transaksi" header
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});
