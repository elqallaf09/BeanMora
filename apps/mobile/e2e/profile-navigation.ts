import { expect, type Page } from '@playwright/test';

export async function selectProfileExtra(page: Page, name: string, ar = false) {
  await expect(page.getByTestId('profile-sections')).toBeVisible();
  const more = page.getByTestId('profile-sections').getByRole('button', { name: ar ? 'المزيد من أقسام الحساب' : 'More profile sections', exact: true });
  if (!(await page.getByTestId('profile-extra-sections').isVisible())) await more.click();
  await page.getByTestId('profile-extra-sections').getByRole('button', { name, exact: true }).click();
}
