import type { Page } from '@playwright/test';

export async function openCoffeeShortcut(page: Page, label: string) {
  if (!(await page.getByTestId('library-navigation').isVisible())) {
    await page.getByTestId('bottom-navigation').getByRole('button', { name: /^(اكتشف|Discover)$/ }).click();
  }
  await page.getByTestId('library-navigation').getByRole('button', { name: /^(اختصارات القهوة|Coffee shortcuts)$/ }).click();
  await page.getByTestId('quick-library-menu').getByRole('button', { name: label, exact: true }).click();
}

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
