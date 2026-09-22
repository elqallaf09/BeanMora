import { test, expect } from '@playwright/test';
// Isolated fixtures only. Never used by App.tsx, Supabase production, or a published build.
const recipeId = '11111111-1111-4111-8111-111111111111';
const bean = { id: '22222222-2222-4222-8222-222222222222', slug: 'fixture', name_ar: 'بن الاختبار المعزول', name_en: 'Isolated coffee fixture', requires_review: false, is_published: true, suitable_for_v60: true, suitable_for_espresso: false, suitable_for_xbloom: false, roast_level: 'light', last_verified_at: null, roaster: { name_ar: 'محمصة الاختبار', name_en: 'Test roaster' }, flavors: [{ flavor: 'chocolate' }], origin_country: 'Test origin' };
const recipe = { id: recipeId, title: 'Isolated recipe fixture', title_ar: 'وصفة الاختبار المعزولة', brew_method: 'v60', visibility: 'public', bean_id: bean.id, roasted_product_id: null, flavor_notes: ['chocolate'], difficulty: 'beginner', is_incomplete_source: false, dose_grams: 18, water_grams: 300, total_time_seconds: 180, steps: [{ step_number: 1, title: 'Pour water', description: 'A written test instruction' }], equipment: [] };
for (const locale of ['ar', 'en'] as const) {
  test(`${locale}: native-web catalog, detail, recommendation and login surfaces`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://mobilefixture.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      const data = url.pathname.endsWith('/beans') ? [bean] : url.pathname.endsWith('/recipes') ? [recipe] : [];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto('/');
    if (locale === 'en') await page.getByRole('button', { name: 'English', exact: true }).click();
    const coffeeName = locale === 'ar' ? bean.name_ar : bean.name_en;
    await page.getByRole('button', { name: coffeeName, exact: true }).click();
    await expect(page.getByRole('heading', { name: coffeeName })).toBeVisible();
    await page.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back', exact: true }).click();
    await page.getByRole('button', { name: locale === 'ar' ? 'الوصفات' : 'Recipes', exact: true }).click();
    await page.getByRole('button', { name: locale === 'ar' ? recipe.title_ar : recipe.title, exact: true }).click();
    await expect(page.getByText('A written test instruction')).toBeVisible();
    await page.getByRole('button', { name: locale === 'ar' ? 'سجّل نتيجة تحضيري' : 'Record my brew', exact: true }).click();
    await expect(page.getByLabel(locale === 'ar' ? 'البريد الإلكتروني' : 'Email', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: locale === 'ar' ? 'لك أنت' : 'For you', exact: true }).click();
    await expect(page.getByText(locale === 'ar' ? /مطابقة بقواعد واضحة/ : /Explainable matching/)).toBeVisible();
    await expect(page.getByRole('button', { name: coffeeName, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
test('failed reads surface a failure rather than invented records', async ({ page }) => {
  await page.route('https://mobilefixture.supabase.co/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"fixture failure"}' }));
  await page.goto('/');
  await expect(page.getByText(/تعذّر تحميل بعض البيانات/).first()).toBeVisible();
});
