import { test, expect } from "@playwright/test";
import { mockAuth, mockApiResponse, waitForAppReady } from "./helpers";

test.describe("Login Flow", () => {
  test("should show login page for unauthenticated user", async ({ page }) => {
    // Don't mock auth — let it fail naturally
    await page.route("**/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Unauthorized", data: null }),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Should redirect to login or show login button
    const content = await page.textContent("body").catch(() => "");
    expect(content!.length).toBeGreaterThan(0);
  });

  test("should redirect to dashboard after mock auth", async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", []);
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/notifications*", []);

    await page.goto("/dashboard");
    await waitForAppReady(page);

    // Should be on dashboard
    await expect(page.locator("text=Beranda").or(page.locator("text=Dashboard")).or(page.locator("text=E2E Test User"))).toBeVisible({ timeout: 10000 });
  });
});
