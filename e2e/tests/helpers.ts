/**
 * E2E Test Helpers — mock auth, page helpers, etc.
 * Since DompetAing uses Google OAuth, we mock the auth flow
 * by intercepting routes and setting cookies.
 */
import { Page, BrowserContext, expect } from "@playwright/test";

/**
 * Mock the auth flow — intercept /v1/auth/me and /v1/auth/google
 * to bypass real Google OAuth during E2E tests.
 */
export async function mockAuth(page: Page) {
  // Intercept the auth/me endpoint to return a test user
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
          avatar_url: null,
          theme: "light",
          color_scheme: "sage_green",
          pin_set: false,
          hide_balance: false,
          currency: "IDR",
          gmail_connected: false,
          notif_push: false,
          subscription: {
            effective_plan: "trial",
            days_remaining: 25,
          },
        },
      }),
    });
  });

  // Intercept subscription status
  await page.route("**/v1/subscription", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            plan: "trial",
            effective_plan: "trial",
            trial_end: new Date(Date.now() + 86400000 * 25).toISOString(),
            premium_end: null,
            is_active: true,
            auto_renew: false,
            days_remaining: 25,
            limits: {
              max_accounts: 999,
              max_budgets: 999,
            },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock API responses for specific endpoints.
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string,
  data: unknown,
  status = 200
) {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });
}

/**
 * Wait for app to be fully loaded (main content visible).
 */
export async function waitForAppReady(page: Page) {
  await page.waitForLoadState("networkidle");
  // Wait for any loading spinner to disappear
  const spinner = page.locator('[data-testid="loading"]');
  if (await spinner.isVisible().catch(() => false)) {
    await spinner.waitFor({ state: "hidden", timeout: 10000 });
  }
}

/**
 * Format currency for assertions.
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}
