import { test, expect } from "@playwright/test";
import * as path from "path";

const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");

// ── M001 Acceptance Criteria Tests ──

test.describe("M001 Acceptance Criteria", () => {
  // ── TC-01: Login page renders correctly ──
  test("TC-01: Login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Screenshot for evidence
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-01-login-page.png"),
      fullPage: true,
    });

    // 1. DompetAing branding — h1 with app name
    const heading = page.locator("h1");
    await expect(heading).toContainText("DompetAing");

    // 2. Tagline
    const tagline = page.locator("text=Catat keuangan, hidup lebih tenang");
    await expect(tagline).toBeVisible();

    // 3. Google login button
    const googleButton = page.locator("button", {
      hasText: "Lanjutkan dengan Google",
    });
    await expect(googleButton).toBeVisible();

    // 4. Four feature bullets — verify each one
    await expect(
      page.locator("text=Pantau pemasukan & pengeluaran")
    ).toBeVisible();
    await expect(page.locator("text=Budget per kategori")).toBeVisible();
    await expect(
      page.locator("text=Auto-sync dari email bank (Gmail)")
    ).toBeVisible();
    await expect(
      page.locator("text=Kelola hutang & piutang")
    ).toBeVisible();

    // 5. Trial text
    await expect(
      page.locator("text=Trial 30 hari gratis")
    ).toBeVisible();
  });

  // ── TC-02: Onboarding page — 4 slides, dots, skip, Selanjutnya ──
  test("TC-02: Onboarding page loads with slide 1", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-02-onboarding-slide1.png"),
      fullPage: true,
    });

    // Slide 1 title is visible
    await expect(
      page.locator("text=Selamat Datang di DompetAing!")
    ).toBeVisible();

    // "Selanjutnya" button present on first slide (not last)
    const nextButton = page.locator("button", { hasText: "Selanjutnya" });
    await expect(nextButton).toBeVisible();

    // Skip button present (not on last slide)
    const skipButton = page.locator("button", { hasText: "Lewati" });
    await expect(skipButton).toBeVisible();

    // Dots navigation — 4 dot buttons
    const dots = page.locator('button[aria-label^="Go to slide"]');
    await expect(dots).toHaveCount(4);
  });

  test("TC-02b: Onboarding — can navigate through all 4 slides", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const expectedTitles = [
      "Selamat Datang di DompetAing!",
      "Pantau Keuangan Setiap Saat",
      "Auto-Sync dari Email Bank",
      "Siap Mulai?",
    ];

    // Slide 1 — already on it
    await expect(page.locator("h2")).toContainText(expectedTitles[0]);

    // Slide 2
    await page.locator("button", { hasText: "Selanjutnya" }).click();
    await expect(page.locator("h2")).toContainText(expectedTitles[1]);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-02b-onboarding-slide2.png"),
      fullPage: true,
    });

    // Slide 3
    await page.locator("button", { hasText: "Selanjutnya" }).click();
    await expect(page.locator("h2")).toContainText(expectedTitles[2]);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-02b-onboarding-slide3.png"),
      fullPage: true,
    });

    // Slide 4 — last slide
    await page.locator("button", { hasText: "Selanjutnya" }).click();
    await expect(page.locator("h2")).toContainText(expectedTitles[3]);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-02b-onboarding-slide4.png"),
      fullPage: true,
    });

    // On last slide: skip button is gone, "Mulai Sekarang" appears
    await expect(
      page.locator("button", { hasText: "Lewati" })
    ).toHaveCount(0);
    await expect(
      page.locator("button", { hasText: "Mulai Sekarang" })
    ).toBeVisible();
  });

  test("TC-02c: Onboarding — dot navigation jumps slides", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    // Click dot 3 (index 2) to jump to slide 3
    await page.locator('button[aria-label="Go to slide 3"]').click();
    await expect(page.locator("h2")).toContainText(
      "Auto-Sync dari Email Bank"
    );
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-02c-onboarding-dot-nav.png"),
      fullPage: true,
    });
  });

  // ── TC-03: Unauthenticated access to /dashboard redirects to /login ──
  test("TC-03: Dashboard redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Allow time for auth check + redirect
    await page.waitForURL("**/login", { timeout: 10_000 });

    await page.screenshot({
      path: path.join(
        SCREENSHOTS_DIR,
        "TC-03-dashboard-redirect-to-login.png"
      ),
      fullPage: true,
    });

    // Must be on /login now
    expect(page.url()).toContain("/login");

    // Login page content must be visible
    await expect(page.locator("h1")).toContainText("DompetAing");
    await expect(
      page.locator("button", { hasText: "Lanjutkan dengan Google" })
    ).toBeVisible();
  });

  // ── TC-04: Root path "/" redirects unauthenticated user to login ──
  test("TC-04: Root path redirects unauthenticated user to login", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForURL("**/login", { timeout: 10_000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-04-root-redirect.png"),
      fullPage: true,
    });

    expect(page.url()).toContain("/login");
  });

  // ── TC-05: Login page dark mode CSS support ──
  test("TC-05: Login page has dark mode CSS classes", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check the root wrapper has dark: Tailwind classes by inspecting DOM
    const rootDiv = page.locator("div").first();

    // Verify the page HTML contains dark: class references in a dark-mode-capable element
    const pageHTML = await page.content();
    const hasDarkClasses = pageHTML.includes("dark:");
    expect(hasDarkClasses).toBe(true);

    // Simulate dark mode by adding 'dark' class to <html>
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-05-login-dark-mode.png"),
      fullPage: true,
    });

    // Verify dark background element exists (gradient uses dark:from-gray-950)
    const darkBg = page.locator(".dark\\:from-gray-950, .dark\\:from-gray-900");
    // Just confirm it's in DOM (not necessarily visible in CI)
    const darkBgCount = await darkBg.count();
    expect(darkBgCount).toBeGreaterThan(0);
  });

  // ── TC-06: Onboarding skip button navigates toward dashboard ──
  test("TC-06: Onboarding skip button navigates away from onboarding", async ({
    page,
  }) => {
    // Watch for navigation away from /onboarding
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const skipButton = page.locator("button", { hasText: "Lewati" });
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    // Skip navigates to /dashboard which then redirects to /login (unauthenticated)
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 10_000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "TC-06-onboarding-skip.png"),
      fullPage: true,
    });

    // Should NOT be on /onboarding anymore
    expect(page.url()).not.toContain("/onboarding");
  });
});
