import type { Page } from '@playwright/test';

/** The Brew tab opens My Coffee; the public recipe library is under Discover. */
export async function openRecipeLibrary(page: Page, locale: 'ar' | 'en') {
  await page.getByRole('button', { name: locale === 'ar' ? 'اكتشف' : 'Discover', exact: true }).last().click();
  await page.getByRole('button', { name: locale === 'ar' ? 'الوصفات' : 'Recipes', exact: true }).click();
}
