import { expect, test, type Page } from '@playwright/test';
import { openCoffeeShortcut } from './navigation';
import { setLanguage } from './settings';

async function settleScreen(page: Page, id: string) {
  await expect.poll(() => page.getByTestId(id).evaluate(node => {
    for (let current: Element | null = node; current; current = current.parentElement) {
      if (Number(getComputedStyle(current).opacity) < 1) return false;
    }
    return true;
  })).toBe(true);
}

async function fixture(page: Page) {
  const queries: { p_query?: string; p_method?: string }[] = [];
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    if (new URL(route.request().url()).pathname.endsWith('/rpc/search_public_recipes')) {
      queries.push(route.request().postDataJSON());
    }
    await route.fulfill({ contentType: 'application/json', body: '[]', headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' } });
  });
  return queries;
}

for (const width of [320, 430, 834]) test(`home actions open destinations after typing, ${width}px`, async ({ page }, info) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width, height: 932 });
  const queries = await fixture(page);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const home = () => page.getByTestId('bottom-navigation').getByRole('button', { name: 'الرئيسية', exact: true }).click();
  for (const [label, destination] of [
    ['البن والإيحاءات', 'beans'], ['مكتبة الوصفات', 'recipes'], ['أدوات القهوة', 'equipment'], ['المحامص', 'roasters'],
    ['الكبسولات', 'capsules'], ['مختبر التحميص', 'roastLab'], ['خبير القهوة', 'assistant'],
    ['البن المحفوظ', 'favorites'], ['وصفاتي المحفوظة', 'savedRecipes'], ['وصفاتي المضافة', 'myRecipes'], ['معداتـي', 'myEquipment'],
  ]) {
    // Filling keeps the input focused. A single click must open the page.
    await page.getByTestId('home-search-input').fill('عنب');
    await page.getByTestId('home-scroll').getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByTestId('screen-' + destination)).toBeVisible();
    await expect(page.getByTestId('home-scroll')).toHaveCount(0);
    await expect(page.getByTestId('screen-recovery')).toHaveCount(0);
    await expect(page.getByTestId('bottom-navigation').getByRole('button', { name: 'اكتشف', exact: true })).toHaveAttribute('aria-selected', 'true');
    if (destination !== 'assistant') await expect(page.getByTestId('library-navigation').getByRole('button')).toHaveCount(5);
    await home();
  }
  await page.getByTestId('home-search-input').fill('عنب');
  await page.getByRole('button', { name: 'ابحث الآن', exact: true }).click();
  await expect(page.getByTestId('screen-search')).toBeVisible();
  await expect.poll(() => queries.at(-1)?.p_query).toBe('عنب');
  await expect(page.getByTestId('screen-recovery')).toHaveCount(0);
  await home();
  // The full-height home viewport must end at the bottom bar after returning.
  await expect.poll(async () => {
    const content = await page.getByTestId('home-scroll').boundingBox();
    const bar = await page.getByTestId('bottom-navigation').boundingBox();
    return Math.abs(content!.y + content!.height - bar!.y);
  }).toBeLessThan(2);
  await page.getByTestId('brew-method-espresso').click();
  await expect(page.getByTestId('screen-recipes')).toBeVisible();
  await expect.poll(() => queries.at(-1)?.p_method).toBe('espresso');
  await expect(page.getByTestId('home-scroll')).toHaveCount(0);
  await settleScreen(page, 'screen-recipes');
  await page.screenshot({ path: info.outputPath('espresso-recipes.png'), animations: 'disabled' });
  await openCoffeeShortcut(page, 'وصفاتي المحفوظة');
  await expect(page.getByTestId('screen-savedRecipes')).toBeVisible();
  await home();
  const methods = page.getByRole('heading', { name: 'اختر طريقة التحضير', exact: true }).locator('..');
  await methods.getByRole('button', { name: 'عرض الكل', exact: true }).click();
  await expect(page.getByTestId('brew-methods-screen')).toBeVisible();
  await expect(page.getByTestId('brew-method-cards').getByRole('button')).toHaveCount(15);
  await settleScreen(page, 'screen-methods');
  await page.screenshot({ path: info.outputPath('all-brew-methods.png'), animations: 'disabled' });
  await page.getByTestId('brew-method-moka_pot').click();
  await expect.poll(() => queries.at(-1)?.p_method).toBe('moka_pot');
  await expect(page.getByTestId('screen-recipes')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('English dark method chooser retains the theme and returns to search', async ({ page }, info) => {
  const queries = await fixture(page);
  await page.goto('/');
  await setLanguage(page, 'en');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByTestId('settings-screen').getByRole('button', { name: 'Dark', exact: true }).click();
  await page.getByTestId('settings-screen').getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('heading', { name: 'Choose your brew method' }).locator('..').getByRole('button', { name: 'View all', exact: true }).click();
  await expect.poll(() => page.getByTestId('brew-method-espresso').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(32, 27, 23)');
  await settleScreen(page, 'screen-methods');
  await page.screenshot({ path: info.outputPath('brew-methods-dark.png'), animations: 'disabled' });
  await page.getByTestId('bottom-navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByTestId('home-search-input').fill('grape');
  await page.getByTestId('home-search-input').press('Enter');
  await expect.poll(() => queries.at(-1)?.p_query).toBe('grape');
});
