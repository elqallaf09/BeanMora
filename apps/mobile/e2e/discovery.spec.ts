import { test, expect, type Page, type Route } from '@playwright/test';

// All network responses and public keys are isolated test fixtures. SQL behavior
// is tested separately against the actual migration in check-recipe-discovery-sql.
const records = Array.from({ length: 64 }, (_, index) => ({
  id: `77777777-7777-4777-8777-${String(index).padStart(12, '0')}`,
  title: `Discovery recipe ${index}`, title_ar: `وصفة الاكتشاف ${index}`,
  brew_method: 'v60', visibility: 'public', recipe_type: 'official_roaster',
  bean_id: null, roasted_product_id: null, dose_grams: 18, water_grams: 288,
  total_time_seconds: 180, is_incomplete_source: false, flavor_notes: ['jasmine'],
  serving_style: 'hot', source_author_name: index === 63 ? "O'Neil" : 'A creator',
  sources: [{ source_url: 'https://source-fixture.test/recipe', source_name: 'Fixture source' }],
  steps: [], equipment: [], source_brew_parameters: { discovery: {
    creator_country: 'Norway', creator_country_ar: 'النرويج', recipe_country: 'Japan', recipe_country_ar: 'اليابان',
    coffee_origin: 'Kenya', coffee_origin_ar: 'كينيا', coffee_type: 'SL28', coffee_name: 'Coffee_1',
    roaster_name: 'Roaster, Inc.', flavor_notes: ['jasmine'], flavor_notes_ar: ['ياسمين'], flavor_families: ['floral'],
  } },
}));
async function reply(route: Route, rows: unknown[], total = rows.length) {
  await route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${total}`, 'access-control-expose-headers': 'content-range' },
    body: JSON.stringify(rows),
  });
}
async function openLibrary(page: Page, locale: 'ar' | 'en') {
  await page.goto('/');
  if (locale === 'en') {
    await page.getByRole('button', { name: 'تغيير اللغة، العربية', exact: true }).click();
    await page.getByRole('button', { name: 'English', exact: true }).click();
  }
  await page.getByRole('button', { name: locale === 'ar' ? 'تحضير' : 'Brew', exact: true }).click();
  await expect(page.getByRole('button', { name: locale === 'ar' ? records[0].title_ar : records[0].title, exact: true })).toBeVisible();
}

for (const config of [{ width: 320, locale: 'ar' }, { width: 768, locale: 'en' }] as const) {
  test(`${config.locale} ${config.width}: optional filters bind every criterion, reset pagination and find a later-library recipe`, async ({ page }) => {
    await page.setViewportSize({ width: config.width, height: 1024 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const requests: { args: Record<string, string | null>; offset: number }[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://mobilefixture.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/rpc/search_public_recipes')) {
        const args = route.request().postDataJSON();
        const offset = Number(url.searchParams.get('offset') || 0);
        requests.push({ args, offset });
        const matching = args.p_creator_name ? [records[63]] : args.p_query === 'no-match' ? [] : records;
        return reply(route, matching.slice(offset, offset + 30), matching.length);
      }
      return reply(route, url.pathname.endsWith('/recipes') ? [records[0]] : []);
    });
    const ar = config.locale === 'ar';
    await openLibrary(page, config.locale);
    await expect(page.getByTestId('recipe-discovery-filters')).not.toBeVisible();
    await page.getByRole('button', { name: ar ? 'المزيد من الوصفات' : 'More recipes', exact: true }).click();
    await expect.poll(() => requests.at(-1)?.offset).toBe(30);
    await expect(page.getByRole('button', { name: ar ? records[30].title_ar : records[30].title, exact: true })).toBeVisible();
    await page.getByRole('button', { name: ar ? 'تصفية الوصفات' : 'Filter recipes', exact: true }).click();
    const panel = page.getByTestId('recipe-discovery-filters');
    await expect(panel).toBeVisible();
    const settledRequestCount = requests.length;
    await panel.getByRole('button', { name: ar ? 'زهور' : 'Floral', exact: true }).click();
    await panel.getByLabel(ar ? 'إيحاء محدد' : 'Specific tasting note', { exact: true }).fill('jasmine');
    await panel.getByRole('button', { name: ar ? 'ساخن' : 'Hot', exact: true }).click();
    for (const [label, value] of [
      [ar ? 'اسم الوصفة' : 'Recipe name', 'Discovery recipe'],
      [ar ? 'اسم صانع الوصفة' : 'Recipe creator', "O'Neil"],
      [ar ? 'بلد عمل صانع الوصفة' : 'Creator’s operating country', 'Norway'],
      [ar ? 'المنشأ الجغرافي للوصفة' : 'Recipe’s geographic origin', 'Japan'],
      [ar ? 'الموقع أو المصدر' : 'Website or source', 'source-fixture.test'],
      [ar ? 'اسم البن' : 'Coffee name', 'Coffee_1'],
      [ar ? 'نوع البن أو سلالته' : 'Coffee type or variety', 'SL28'],
      [ar ? 'بلد زراعة البن' : 'Coffee growing origin', 'Kenya'],
      [ar ? 'الشركة أو المحمصة' : 'Company or roaster', 'Roaster, Inc.'],
    ]) await panel.getByLabel(label, { exact: true }).fill(value);
    // A complete debounce interval must still issue no requests for a draft.
    await page.waitForTimeout(400);
    expect(requests).toHaveLength(settledRequestCount);
    const box = await panel.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(config.width + 1);
    await panel.getByRole('button', { name: ar ? 'تطبيق التصفية' : 'Apply filters', exact: true }).click();
    await expect(page.getByRole('button', { name: ar ? records[63].title_ar : records[63].title, exact: true })).toBeVisible();
    await expect(panel).not.toBeVisible();
    expect(requests.at(-1)).toEqual({ offset: 0, args: {
      p_query: null, p_method: null, p_source: null, p_model: null,
      p_flavor_note: 'jasmine', p_flavor_family: 'floral', p_creator_name: "O'Neil", p_creator_country: 'Norway',
      p_recipe_country: 'Japan', p_recipe_name: 'Discovery recipe', p_serving_style: 'hot', p_coffee_type: 'SL28',
      p_coffee_name: 'Coffee_1', p_coffee_origin: 'Kenya', p_roaster_name: 'Roaster, Inc.', p_source_name: 'source-fixture.test',
    } });
    await expect(page.getByRole('button', { name: ar ? 'تصفية الوصفات، 12 مفعلة' : 'Filter recipes, 12 active', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: ar ? 'المزيد من الوصفات' : 'More recipes', exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: ar ? 'مسح البحث والتصفية' : 'Clear search and filters', exact: true }).click();
    await expect(page.getByRole('button', { name: ar ? records[0].title_ar : records[0].title, exact: true })).toBeVisible();
    await page.getByLabel(ar ? 'ابحث عن وصفة' : 'Find a recipe', { exact: true }).fill('no-match');
    await expect(page.getByRole('heading', { name: ar ? 'لا توجد نتائج مطابقة.' : 'No matching recipes.', exact: true })).toBeVisible();
    await page.getByRole('button', { name: ar ? 'مسح البحث والتصفية' : 'Clear search and filters', exact: true }).last().click();
    await expect(page.getByRole('button', { name: ar ? records[0].title_ar : records[0].title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('main search debounces text, carries punctuation literally and ignores a superseded response', async ({ page }) => {
  const queries: (string | null)[] = [];
  let releaseOld = () => {};
  const oldGate = new Promise<void>(resolve => { releaseOld = resolve; });
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith('/rpc/search_public_recipes')) return reply(route, url.pathname.endsWith('/recipes') ? [records[0]] : []);
    const query = route.request().postDataJSON().p_query;
    queries.push(query);
    if (query === 'old') {
      await oldGate;
      try { await reply(route, [{ ...records[1], title: 'Stale response recipe' }]); } catch { /* request was intentionally aborted */ }
      return;
    }
    return reply(route, query ? [{ ...records[2], title: 'Current search recipe' }] : [records[0]]);
  });
  await openLibrary(page, 'en');
  const field = page.getByLabel('Find a recipe', { exact: true });
  await field.pressSequentially('fast', { delay: 20 });
  await expect(page.getByRole('button', { name: 'Current search recipe', exact: true })).toBeVisible();
  expect(queries.filter(Boolean)).toEqual(['fast']);
  await field.fill("literal_%'),visibility.eq.private");
  await expect.poll(() => queries.at(-1)).toBe("literal_%'),visibility.eq.private");
  await field.fill('old');
  await expect.poll(() => queries.at(-1)).toBe('old');
  await field.fill('new');
  await expect.poll(() => queries.at(-1)).toBe('new');
  await expect(page.getByRole('button', { name: 'Current search recipe', exact: true })).toBeVisible();
  releaseOld();
  await page.waitForTimeout(150);
  await expect(page.getByRole('button', { name: 'Stale response recipe', exact: true })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Current search recipe', exact: true })).toBeVisible();
  await expect(page.getByText('Could not load recipes.', { exact: true })).not.toBeVisible();
});
