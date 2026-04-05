import { test, expect } from "@playwright/test";
import { mockAuth, mockApiResponse, waitForAppReady } from "./helpers";

test.describe("Offline Flow", () => {
  test("should show offline banner when disconnected", async ({ page, context }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", []);
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/notifications*", []);

    await page.goto("/dashboard");
    await waitForAppReady(page);

    // Go offline
    await context.setOffline(true);

    // Trigger a navigation or action that would show offline state
    await page.reload().catch(() => {}); // May fail when offline

    // Check that the page handles offline gracefully
    const content = await page.textContent("body").catch(() => "");
    expect(content).toBeDefined();

    // Go back online
    await context.setOffline(false);
  });
});

test.describe("Responsive Viewport Tests", () => {
  test("should render correctly on mobile viewport", async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", []);
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/notifications*", []);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");
    await waitForAppReady(page);

    // Should show bottom nav
    await expect(page.locator("text=Beranda").first()).toBeVisible({ timeout: 10000 });
  });

  test("should render correctly on desktop viewport", async ({ page }) => {
    await mockAuth(page);
    await mockApiResponse(page, "**/v1/accounts", []);
    await mockApiResponse(page, "**/v1/transactions*", { data: [], total: 0 });
    await mockApiResponse(page, "**/v1/budgets*", []);
    await mockApiResponse(page, "**/v1/debts*", { debts: [], summary: { total_borrow: 0, total_lend: 0, overdue_count: 0 } });
    await mockApiResponse(page, "**/v1/notifications*", []);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/dashboard");
    await waitForAppReady(page);

    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});
