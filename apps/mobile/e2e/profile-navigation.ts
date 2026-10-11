import { expect, type Page } from '@playwright/test';

export async function selectProfileExtra(page: Page, name: string, ar = false) {
  await expect(page.getByTestId('profile-sections')).toBeVisible();
  await page.getByTestId('profile-sections').getByRole('button', { name, exact: true }).click();
  await expect(page.getByTestId('profile-extra-sections')).toHaveCount(0);
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
}
