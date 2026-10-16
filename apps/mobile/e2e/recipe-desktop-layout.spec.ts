import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import { openRecipeLibrary } from './navigation';
import { setLanguage } from './settings';

// Isolated layout fixture, never written to the production catalog.
const recipe = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  slug: 'desktop-layout-fixture',
  title: 'Desktop recipe layout', title_ar: 'وصفة لاختبار عرض الكمبيوتر',
  visibility: 'public', brew_method: 'v60', recipe_type: 'official_roaster',
  source_author_name: 'Layout fixture',
  serving_style: 'hot', dose_grams: 20, water_grams: 300,
  water_temp_c: 90, total_time_seconds: 210,
  flavor_notes: ['orange', 'brown sugar', 'jasmine'],
  source_brew_parameters: {
    manual: {
      source_ratio_text: '1:15', equipment: 'Hario V60',
      best_roast_age_min_days: 7, best_roast_age_max_days: 20,
    },
    discovery: { serving_style: 'hot' },
  },
  pours: Array.from({ length: 5 }, (_, i) => ({
    pour_number: i + 1, water_grams: 60, start_at_seconds: i * 35, is_bloom: i === 0,
  })),
  steps: [], sources: [], equipment: [],
};

async function reply(route: Route, data: unknown[]) {
  await route.fulfill({
    status: 200, contentType: 'application/json',
    headers: {
      'content-range': data.length ? `0-${data.length - 1}/${data.length}` : '*/0',
      'access-control-expose-headers': 'content-range',
    },
    body: JSON.stringify(data),
  });
}

async function openRecipe(page: Page, locale: 'ar' | 'en', width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    return reply(route, path.endsWith('/rpc/search_public_recipes') || path.endsWith('/recipes') ? [recipe] : []);
  });
  await page.goto('/');
  if (locale !== 'ar') await setLanguage(page, locale);
  await openRecipeLibrary(page, locale);
  await page.getByTestId('recipe-catalog').getByRole('button', {
    name: locale === 'ar' ? recipe.title_ar : recipe.title, exact: true,
  }).click();
  await expect(page.getByTestId('recipe-detail')).toBeVisible();
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value!;
}

async function expectNoOverflow(page: Page) {
  const detail = page.getByTestId('recipe-detail');
  expect(await detail.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

for (const locale of ['ar', 'en'] as const) {
  for (const width of [1024, 1440, 1920]) {
    test(`recipe uses desktop columns (${locale}, ${width}px)`, async ({ page }) => {
      await openRecipe(page, locale, width);
      const overview = await box(page.getByTestId('recipe-overview'));
      const prep = await box(page.getByTestId('recipe-preparation'));
      const layout = await box(page.getByTestId('recipe-detail-layout'));
      const photo = await box(page.getByTestId('recipe-visual'));
      const timer = await box(page.getByTestId('brew-elapsed'));
      expect(Math.abs(overview.y - prep.y)).toBeLessThan(2);
      expect(layout.width).toBeGreaterThan(900);
      expect(layout.width).toBeLessThanOrEqual(1440);
      expect(overview.width).toBeGreaterThan(400);
      expect(prep.width).toBeGreaterThan(400);
      if (locale === 'ar') expect(overview.x).toBeGreaterThan(prep.x);
      else expect(overview.x).toBeLessThan(prep.x);
      expect(photo.width).toBeLessThanOrEqual(144);
      expect(photo.height).toBeLessThanOrEqual(150);
      expect(timer.y + timer.height).toBeLessThan(350);
      await expect(page.getByTestId('recipe-source-facts')).toContainText('20 g');
      await expect(page.getByTestId('recipe-source-facts')).toContainText('300 g');
      await expect(page.getByTestId('recipe-supplemental-facts')).toContainText('Hario V60');
      await expect(page.getByTestId('guided-brew')).toHaveCount(1);
      await expectNoOverflow(page);
    });
  }
  for (const width of [320, 390, 900, 1023]) {
    test(`recipe remains stacked on narrow web (${locale}, ${width}px)`, async ({ page }) => {
      await openRecipe(page, locale, width);
      const overview = await box(page.getByTestId('recipe-overview'));
      const prep = await box(page.getByTestId('recipe-preparation'));
      expect(prep.y).toBeGreaterThanOrEqual(overview.y + overview.height);
      expect(Math.abs(overview.x - prep.x)).toBeLessThan(2);
      await expect(page.getByTestId('guided-brew')).toHaveCount(1);
      await expectNoOverflow(page);
    });
  }
}

test('resize preserves a running brew and saving still works', async ({ page }) => {
  await page.clock.install();
  await openRecipe(page, 'ar', 1440);
  const detail = page.getByTestId('recipe-detail');
  await detail.getByRole('button', { name: 'ابدأ التحضير', exact: true }).click();
  await page.clock.fastForward(5000);
  await expect(page.getByTestId('brew-elapsed')).toHaveText('0:05');
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByTestId('brew-elapsed')).toHaveText('0:05');
  await page.clock.fastForward(3000);
  await expect(page.getByTestId('brew-elapsed')).toHaveText('0:08');
  await page.setViewportSize({ width: 1440, height: 900 });
  await detail.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();
  await expect(page.getByTestId('brew-elapsed')).toHaveText('0:08');
  await detail.getByRole('button', { name: 'حفظ الوصفة على الجهاز', exact: true }).click();
  await expect(detail.getByRole('button', { name: 'إزالة الوصفة من المحفوظة', exact: true })).toBeVisible();
  await expectNoOverflow(page);
});
