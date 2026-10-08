import { expect, type Page } from '@playwright/test';
export async function setLanguage(page: Page, locale: 'ar' | 'en') {
  await page.getByRole('button', { name: /^(الإعدادات|Settings)$/, exact: true }).first().click();
  const panel = page.getByTestId('settings-screen');
  await panel.getByRole('button', { name: locale === 'ar' ? 'العربية' : 'English', exact: true }).click();
  await panel.getByRole('button', { name: locale === 'ar' ? 'تم' : 'Done', exact: true }).click();
  await expect(panel).toHaveCount(0);
}
