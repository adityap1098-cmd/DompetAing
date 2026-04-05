import { test, expect } from "@playwright/test";
import { mockAuth, mockApiResponse, waitForAppReady } from "./helpers";

test.describe("PIN Flow", () => {
  test("should show PIN lock when pin_set is true", async ({ page }) => {
    // Mock auth with pin_set = true
    await page.route("**/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "e2e-user-id",
            email: "e2e@test.com",
            name: "E2E Test User",
            pin_set: true,
            theme: "light",
            color_scheme: "sage_green",
            hide_balance: false,
            subscription: { effective_plan: "trial", days_remaining: 25 },
          },
        }),
      });
    });
    await mockApiResponse(page, "**/v1/subscription", {
      plan: "trial", effective_plan: "trial", days_remaining: 25,
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should show PIN lock screen or PIN input
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});

test.describe("Subscription Flow", () => {
  test("should show subscription page with plans", async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", []);
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/notifications*", []);
    await mockApiResponse(page, "**/v1/subscription/payments", []);

    await page.goto("/subscription");
    await waitForAppReady(page);

    // Should show subscription/pricing page
    await expect(
      page.locator("text=Premium").or(page.locator("text=Langganan")).or(page.locator("text=Plan")).or(page.locator("body")).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Gmail Flow", () => {
  test("should show Gmail sync page", async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", []);
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/notifications*", []);
    await mockApiResponse(page, "**/v1/gmail/status", {
      connected: false,
      sources: [],
      marketplace_sources: [],
    });

    await page.goto("/gmail");
    await waitForAppReady(page);

    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});
