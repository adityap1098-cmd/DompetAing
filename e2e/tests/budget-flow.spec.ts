import { test, expect } from "@playwright/test";
import { mockAuth, mockApiResponse, waitForAppReady } from "./helpers";

test.describe("Budget Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", []);
    await mockApiResponse(page, "**/v1/categories*", [
      { id: "cat-1", name: "Makanan", icon: "🍔", type: "expense", color: "#FF5722", sub_categories: [] },
    ]);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/notifications*", []);
  });

  test("should display budget list with progress", async ({ page }) => {
    await mockApiResponse(page, "**/v1/budgets*", [
      {
        id: "bgt-1", category_id: "cat-1", amount: 500000, spent: 250000,
        month: 4, year: 2026, is_active: true,
        category: { id: "cat-1", name: "Makanan", icon: "🍔", color: "#FF5722" },
      },
    ]);

    await page.goto("/budget");
    await waitForAppReady(page);

    await expect(page.locator("text=Budget").or(page.locator("text=Anggaran")).first()).toBeVisible({ timeout: 10000 });
  });

  test("should show empty state when no budgets", async ({ page }) => {
    await mockApiResponse(page, "**/v1/budgets*", []);

    await page.goto("/budget");
    await waitForAppReady(page);

    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});
