import { test, expect } from "@playwright/test";

/**
 * Smoke coverage for the two requirements that are easy to silently break:
 * default-Arabic + RTL, and the language switch actually flipping dir/lang.
 * Extend this file per-feature as Phase 2+ ships rather than adding new
 * top-level spec files for every route.
 */

test("root redirects to the Arabic locale with RTL", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar\/?$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

test("language switcher flips to English/LTR", async ({ page }) => {
  await page.goto("/ar");
  await page.getByRole("button", { name: /English/i }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("unauthenticated visitor is redirected away from an app route", async ({ page }) => {
  await page.goto("/ar/home");
  await expect(page).toHaveURL(/\/ar\/login/);
});

test("signup and login pages render their forms", async ({ page }) => {
  await page.goto("/ar/signup");
  await expect(page.getByLabel(/البريد الإلكتروني/)).toBeVisible();

  await page.goto("/ar/login");
  await expect(page.getByLabel(/البريد الإلكتروني/)).toBeVisible();
});
