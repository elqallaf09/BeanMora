import { setLanguage } from './settings';
import { expect, test, type Route } from '@playwright/test';
import { openRecipeLibrary } from './navigation';

const bean = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  slug: 'strawberry-coffee', name_ar: 'بن الفراولة', name_en: 'Strawberry coffee',
  requires_review: false, is_published: true,
  roaster_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  flavors: [{ flavor: 'strawberry' }],
  roaster: { name_ar: 'محمصة التجربة', name_en: 'Test roaster' },
};
const roaster = {
  id: bean.roaster_id, slug: 'test-roaster',
  name_ar: 'محمصة التجربة', name_en: 'Test roaster',
  country: 'GB', requires_review: false,
};
const recipe = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  title: 'Strawberry recipe', title_ar: 'وصفة الفراولة',
  visibility: 'public', brew_method: 'xbloom', recipe_type: 'official_roaster',
  bean_id: bean.id, serving_style: 'iced', dose_grams: 18, water_grams: 288,
  flavor_notes: ['strawberry'], source_tasting_notes: 'strawberries',
  source_brew_parameters: { discovery: { serving_style: 'iced' } },
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

for (const locale of ['ar', 'en'] as const) {
  for (const width of [390, 800]) {
    test(`recipe search stays recipe-only before and after filters (${locale}, ${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1100 });
      const ar = locale === 'ar';
      const queries: Record<string, string | null>[] = [];
      let roasterReads = 0;
      await page.route('https://mobilefixture.supabase.co/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/rpc/search_public_recipes')) {
          const args = route.request().postDataJSON();
          queries.push(args);
          return reply(route, args.p_query === 'no-match' ? [] : [recipe]);
        }
        if (path.endsWith('/roasters')) roasterReads += 1;
        return reply(route, path.endsWith('/beans') ? [bean] : path.endsWith('/roasters') ? [roaster] : []);
      });
      await page.goto('/');
      if (!ar) await setLanguage(page, 'en');
      await expect(page.getByRole('button', { name: ar ? bean.name_ar : bean.name_en, exact: true }).first()).toBeVisible();
      const readsBeforeRecipes = roasterReads;
      await openRecipeLibrary(page, locale);
      const results = page.getByTestId('recipe-catalog');
      const field = page.getByLabel(ar ? 'ابحث عن وصفة' : 'Find a recipe', { exact: true });
      const recipeTitle = ar ? recipe.title_ar : recipe.title;
      await expect(results.getByRole('button', { name: recipeTitle, exact: true })).toBeVisible();
      await field.fill(ar ? 'فراولة' : 'strawberry');
      await expect.poll(() => queries.at(-1)?.p_query).toBe(ar ? 'فراولة' : 'strawberry');
      await expect(results.getByRole('button', { name: recipeTitle, exact: true })).toBeVisible();
      await expect(results.getByRole('button', { name: ar ? bean.name_ar : bean.name_en, exact: true })).toHaveCount(0);
      await expect(page.getByTestId('universal-search-results')).toHaveCount(0);
      await expect(page.getByRole('button', { name: ar ? 'عرض كل نتائج المحامص' : 'View all roaster results', exact: true })).toHaveCount(0);
      await page.getByTestId('method-picker').getByRole('button', { name: 'xBloom', exact: true }).click();
      await page.getByRole('button', { name: ar ? 'تقديم: بارد ومثلّج' : 'Serving: Cold & iced', exact: true }).click();
      await expect.poll(() => queries.at(-1)?.p_method).toBe('xbloom');
      await expect.poll(() => queries.at(-1)?.p_serving_style).toBe('cold_or_iced');
      await expect(results.getByRole('button', { name: recipeTitle, exact: true })).toBeVisible();
      await expect(page.getByTestId('universal-search-results')).toHaveCount(0);
      await field.fill('no-match');
      await expect(page.getByRole('heading', { name: ar ? 'لا توجد نتائج مطابقة.' : 'No matching recipes.', exact: true })).toBeVisible();
      await expect(page.getByTestId('universal-search-results')).toHaveCount(0);
      await page.getByRole('button', { name: ar ? 'مسح البحث والتصفية' : 'Clear search and filters', exact: true }).last().click();
      await expect(field).toHaveValue('');
      await expect.poll(() => queries.at(-1)?.p_method).toBeNull();
      await expect.poll(() => queries.at(-1)?.p_serving_style).toBeNull();
      await expect(results.getByRole('button', { name: recipeTitle, exact: true })).toBeVisible();
      expect(roasterReads).toBe(readsBeforeRecipes);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
