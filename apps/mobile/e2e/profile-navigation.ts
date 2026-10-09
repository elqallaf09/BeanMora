import type { Page } from "@playwright/test";

export async function selectProfileExtra(page: Page, name: string, ar = false) {
  await page
    .getByTestId("profile-sections")
    .getByRole("button", {
      name: ar ? "المزيد من أقسام الحساب" : "More profile sections",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
}
