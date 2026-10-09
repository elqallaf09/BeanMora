import { expect, type Page } from '@playwright/test';
export async function setLanguage(page: Page, locale: 'ar' | 'en' | 'ja') {
  await page.getByRole('button', { name: /^(الإعدادات|Settings|設定)$/, exact: true }).first().click();
  const panel = page.getByTestId('settings-screen');
  await panel.getByRole('button', { name: locale === 'ar' ? 'العربية' : locale === 'ja' ? '日本語' : 'English', exact: true }).click();
  await panel.getByRole('button', { name: locale === 'ar' ? 'تم' : locale === 'ja' ? '完了' : 'Done', exact: true }).click();
  await expect(panel).toHaveCount(0);
  // The Settings contents unmount before React Native Web finishes its closing
  // animation. Its focus trap stays active until the modal host also unmounts.
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
}
