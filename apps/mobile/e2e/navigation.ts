import { expect, type Page } from '@playwright/test';

/** Measure only after the native screen transition finishes. */
export async function settleScreen(page: Page, id: string) {
  await expect.poll(() => page.getByTestId(id).evaluate(node => {
    for (let current: Element | null = node; current; current = current.parentElement) {
      if (Number(getComputedStyle(current).opacity) < 1) return false;
    }
    return true;
  })).toBe(true);
}

export async function openCoffeeShortcut(page: Page, label: string) {
  const homeShortcut = page.getByTestId('home-scroll').getByRole('button', { name: label, exact: true });
  if (await homeShortcut.isVisible()) {
    await homeShortcut.click();
    return;
  }
  const menu = page.getByTestId('library-navigation').getByRole('button', { name: /^(اختصارات القهوة|Coffee shortcuts)$/ });
  if (!(await menu.isVisible())) {
    await page.getByTestId('bottom-navigation').getByRole('button', { name: /^(اكتشف|Discover)$/ }).click();
  }
  await menu.click();
  await page.getByTestId('quick-library-menu').getByRole('button', { name: label, exact: true }).click();
}

/** The Brew tab opens My Coffee; the public recipe library is under Discover. */
export async function openRecipeLibrary(page: Page, locale: 'ar' | 'en') {
  await page.getByRole('button', { name: locale === 'ar' ? 'اكتشف' : 'Discover', exact: true }).last().click();
  await page.getByRole('button', { name: locale === 'ar' ? 'مكتبة الوصفات' : 'Recipe library', exact: true }).click();
}

/** Home cards and the catalog menu both expose every brew method. */
export async function chooseMethod(page: Page, locale: 'ar' | 'en', label: string) {
  if (await page.getByTestId('home-scroll').isVisible()) {
    const cards = page.getByTestId('brew-method-cards');
    if (!(await cards.getByRole('button', { name: label, exact: true }).isVisible())) {
      await page.getByRole('heading', { name: locale === 'ar' ? 'اختر طريقة التحضير' : 'Choose your brew method', exact: true })
        .locator('..').getByRole('button', { name: locale === 'ar' ? 'عرض الكل' : 'View all', exact: true }).click();
    }
    await cards.getByRole('button', { name: label, exact: true }).click();
    return;
  }
  await page.getByTestId('method-picker').getByRole('button', { name: locale === 'ar' ? /^كل طرق التحضير/ : /^All methods/ }).click();
  await page.getByRole('button', { name: label, exact: true }).last().click();
}
