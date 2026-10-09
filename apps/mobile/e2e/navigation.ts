import type { Page } from '@playwright/test';

/** The Brew tab opens My Coffee; the public recipe library is under Discover. */
export async function openRecipeLibrary(page: Page, locale: 'ar' | 'en') {
  await page.getByRole('button', { name: locale === 'ar' ? 'اكتشف' : 'Discover', exact: true }).last().click();
  await page.getByRole('button', { name: locale === 'ar' ? 'مكتبة الوصفات' : 'Recipe library', exact: true }).click();
}

/** The compact method menu exposes every method, including those off the rail. */
export async function chooseMethod(page: Page, locale: 'ar' | 'en', label: string) {
  await page.getByTestId('method-picker').getByRole('button', { name: locale === 'ar' ? /^كل طرق التحضير/ : /^All methods/ }).click();
  await page.getByRole('button', { name: label, exact: true }).last().click();
}
