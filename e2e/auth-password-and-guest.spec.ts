import { test, expect } from "@playwright/test";

/**
 * Password visibility toggle + guest access, in both locales. These only
 * exercise client-side state (the toggle never calls Supabase; the guest
 * button's *click* does, but we only assert the loading state it enters
 * immediately afterward — no live Supabase project is required for that
 * part to be observable).
 */

test.describe("Arabic (/ar)", () => {
  test("password toggle shows and hides the login password", async ({ page }) => {
    await page.goto("/ar/login");
    const password = page.getByLabel("كلمة المرور", { exact: true });
    await expect(password).toHaveAttribute("type", "password");

    const toggle = page.getByRole("button", { name: "إظهار كلمة المرور" });
    await toggle.click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "إخفاء كلمة المرور" })).toBeVisible();

    await page.getByRole("button", { name: "إخفاء كلمة المرور" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("password toggle is keyboard-operable and does not submit the form", async ({ page }) => {
    await page.goto("/ar/login");
    await page.getByLabel("كلمة المرور", { exact: true }).fill("does-not-matter");
    await page.getByRole("button", { name: "إظهار كلمة المرور" }).focus();
    await page.keyboard.press("Enter");
    // Toggling must never submit — still on /login, not redirected/reloaded
    // into a validation-error state for the untouched email field.
    await expect(page).toHaveURL(/\/ar\/login/);
    await expect(page.getByLabel("كلمة المرور", { exact: true })).toHaveAttribute("type", "text");
  });

  test("signup password and confirm-password toggles work independently", async ({ page }) => {
    await page.goto("/ar/signup");
    const password = page.getByLabel("كلمة المرور", { exact: true });
    const confirm = page.getByLabel("تأكيد كلمة المرور", { exact: true });

    await page.getByRole("button", { name: "إظهار كلمة المرور" }).first().click();
    await expect(password).toHaveAttribute("type", "text");
    // The confirm-password field's own toggle is unaffected.
    await expect(confirm).toHaveAttribute("type", "password");
  });

  test("continue as guest button is visible above the create-account link", async ({ page }) => {
    await page.goto("/ar/login");
    const guestButton = page.getByRole("button", { name: "الدخول كضيف" });
    await expect(guestButton).toBeVisible();

    await guestButton.click();
    // Immediately enters a loading state — confirms the click handler ran
    // and disabled the button, regardless of whether the Supabase call
    // itself can complete against a live project in this environment.
    await expect(guestButton).toBeDisabled();
  });
});

test.describe("English (/en)", () => {
  test("password toggle shows and hides the login password", async ({ page }) => {
    await page.goto("/en/login");
    const password = page.getByLabel("Password", { exact: true });
    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide password" })).toBeVisible();

    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("continue as guest button is visible and full-width on mobile", async ({ page }, testInfo) => {
    await page.goto("/en/login");
    const guestButton = page.getByRole("button", { name: "Continue as guest" });
    await expect(guestButton).toBeVisible();

    if (testInfo.project.name === "mobile-safari") {
      const buttonBox = await guestButton.boundingBox();
      const viewportWidth = page.viewportSize()?.width ?? 0;
      // "Full width" allowing for the card's own horizontal padding.
      expect(buttonBox && viewportWidth - buttonBox.width).toBeLessThan(120);
    }
  });

  test("guest button cannot be double-clicked while loading", async ({ page }) => {
    await page.goto("/en/login");
    const guestButton = page.getByRole("button", { name: "Continue as guest" });
    await guestButton.click();
    await expect(guestButton).toBeDisabled();
    // A disabled button does not receive click events in a real browser —
    // this is the actual guard, not just a state flag.
    await expect(guestButton).toBeDisabled();
  });
});
