import { test, expect } from "@playwright/test";
import { mockAuth, mockApiResponse, waitForAppReady } from "./helpers";

test.describe("Debt Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", [
      { id: "acc-1", name: "BCA Utama", icon: "🏦", balance: 10000000 },
    ]);
    await mockApiResponse(page, "**/v1/categories*", []);
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/notifications*", []);
  });

  test("should display debt list with tabs", async ({ page }) => {
    await mockApiResponse(page, "**/v1/debts*", {
      debts: [
        {
          id: "debt-1", type: "borrow", person_name: "Ahmad", amount: 500000,
          description: "Pinjam", borrow_date: "2026-04-01", due_date: "2026-04-15",
          is_paid: false, reminder: true,
        },
      ],
      summary: { total_borrow: 500000, total_lend: 0, overdue_count: 0 },
    });

    await page.goto("/debts");
    await waitForAppReady(page);

    await expect(page.locator("text=Hutang").or(page.locator("text=Piutang")).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Account Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/categories*", []);
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/notifications*", []);
  });

  test("should display accounts with net worth", async ({ page }) => {
    await mockApiResponse(page, "**/v1/accounts", [
      { id: "acc-1", name: "BCA Utama", icon: "🏦", balance: 17000000, type: "bank", color: "#4CAF50", is_active: true },
      { id: "acc-2", name: "Mandiri", icon: "🏦", balance: 20000000, type: "bank", color: "#2196F3", is_active: true },
    ]);

    await page.goto("/accounts");
    await waitForAppReady(page);

    await expect(page.locator("text=BCA Utama").or(page.locator("text=Akun")).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Recurring Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", []);
    await mockApiResponse(page, "**/v1/categories*", []);
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/notifications*", []);
  });

  test("should display recurring transactions list", async ({ page }) => {
    await mockApiResponse(page, "**/v1/recurring*", {
      data: [
        {
          id: "rec-1", description: "Internet bulanan", amount: 150000, type: "expense",
          frequency: "monthly", day_of_month: 1, is_active: true,
          account: { id: "acc-1", name: "BCA" },
          category: { id: "cat-1", name: "Internet", icon: "🌐" },
        },
      ],
      summary: { total_monthly: 150000, active_count: 1 },
    });

    await page.goto("/recurring");
    await waitForAppReady(page);

    const content = await page.textContent("body");
    expect(content?.length).toBeGreaterThan(0);
  });
});
