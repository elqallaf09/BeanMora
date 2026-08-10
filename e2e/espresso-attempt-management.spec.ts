import { test, expect } from "@playwright/test";

/**
 * Espresso Dial-In "Previous Attempts" — create/edit/delete, persistence
 * across a refresh, and cross-user isolation.
 *
 * These exercise real Supabase writes against a live project (no mocks, no
 * demo data), so — unlike the rest of this repo's e2e suite, which only
 * covers unauthenticated UI (see i18n-and-navigation.spec.ts, "unauthenticated
 * visitor is redirected away from an app route") — they need a real,
 * already-confirmed test account. There is no seeded test-user fixture
 * anywhere in this repo yet, so these are gated behind env vars and SKIP
 * (not fail) when unset, rather than inventing fake/mocked auth state:
 *
 *   E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD  — a real confirmed account
 *   E2E_TEST_USER_2_EMAIL / E2E_TEST_USER_2_PASSWORD — a second, different
 *     real confirmed account, used only for the cross-user isolation check
 *
 * Run with:
 *   E2E_TEST_USER_EMAIL=... E2E_TEST_USER_PASSWORD=... \
 *   E2E_TEST_USER_2_EMAIL=... E2E_TEST_USER_2_PASSWORD=... \
 *   npx playwright test e2e/espresso-attempt-management.spec.ts
 *
 * The database-level ownership guarantee this UI relies on (RLS blocking
 * cross-user UPDATE/DELETE even if the client-side scoping were removed) is
 * exercised independently and unconditionally in
 * supabase/tests/espresso_attempt_ownership.sql — that file needs no
 * browser and no seeded account, only a Postgres connection string.
 */

const email1 = process.env.E2E_TEST_USER_EMAIL;
const password1 = process.env.E2E_TEST_USER_PASSWORD;
const email2 = process.env.E2E_TEST_USER_2_EMAIL;
const password2 = process.env.E2E_TEST_USER_2_PASSWORD;

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/ar/login");
  await page.getByLabel(/البريد الإلكتروني/).fill(email);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(password);
  await page.getByRole("button", { name: /تسجيل الدخول/ }).click();
  await expect(page).toHaveURL(/\/ar\/home/);
}

test.describe("Espresso attempt management", () => {
  test.skip(!email1 || !password1, "requires E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD — see file header");

  test("create, edit, and delete an attempt, each persisting across a reload", async ({ page }) => {
    await login(page, email1!, password1!);
    await page.goto("/ar/espresso");

    // --- Create ------------------------------------------------------
    const doseInput = page.locator("#dose");
    const yieldInput = page.locator("#yield");
    const timeInput = page.locator("#time");
    await doseInput.fill("19");
    await yieldInput.fill("38");
    await timeInput.fill("30");
    await page.getByRole("button", { name: "سجّل هذه الجرعة" }).click();

    const firstAttempt = page.locator("ol > li").first();
    await expect(firstAttempt).toContainText("19g");
    await expect(firstAttempt).toContainText("38g");
    await expect(firstAttempt).toContainText("30s");

    // --- Edit ----------------------------------------------------------
    await firstAttempt.getByRole("button", { name: "إجراءات المحاولة" }).click();
    await page.getByRole("button", { name: "تعديل المحاولة" }).click();
    await page.getByLabel("الجرعة (g)").fill("20");
    await page.getByRole("button", { name: "حفظ" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(firstAttempt).toContainText("20g");

    // Reload — the update must have hit the real row, not just local state.
    await page.reload();
    await expect(page.locator("ol > li").first()).toContainText("20g");

    // --- Delete ----------------------------------------------------------
    const attemptCountBefore = await page.locator("ol > li").count();
    await page.locator("ol > li").first().getByRole("button", { name: "إجراءات المحاولة" }).click();
    await page.getByRole("button", { name: "حذف المحاولة" }).click();
    await page.getByRole("button", { name: "حذف المحاولة" }).click(); // confirm dialog's destructive button
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator("ol > li")).toHaveCount(attemptCountBefore - 1);

    // Reload — the delete must have hit the real row too.
    await page.reload();
    await expect(page.locator("ol > li")).toHaveCount(attemptCountBefore - 1);
  });
});

test.describe("Espresso attempt cross-user isolation", () => {
  test.skip(
    !email1 || !password1 || !email2 || !password2,
    "requires both E2E_TEST_USER_* and E2E_TEST_USER_2_* pairs — see file header",
  );

  test("a second user's timeline never shows the first user's attempt", async ({ page, context }) => {
    await login(page, email1!, password1!);
    await page.goto("/ar/espresso");
    await page.locator("#dose").fill("21");
    await page.locator("#yield").fill("42");
    await page.locator("#time").fill("31");
    await page.getByRole("button", { name: "سجّل هذه الجرعة" }).click();
    await expect(page.locator("ol > li").first()).toContainText("21g");

    // Fresh, unauthenticated-then-second-user context — not the same
    // session as above, so this is a genuine different-account check, not
    // just a different tab sharing cookies.
    await context.clearCookies();
    const page2 = await context.newPage();
    await login(page2, email2!, password2!);
    await page2.goto("/ar/espresso");

    // The second user's own timeline must not contain the first user's
    // 21g/42g/31s attempt — RLS (tested directly in
    // supabase/tests/espresso_attempt_ownership.sql) means it was never
    // returned by the SELECT that populated this page at all.
    await expect(page2.locator("ol")).not.toContainText("21g → 42g");
  });
});
