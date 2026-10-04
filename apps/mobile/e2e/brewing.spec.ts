import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Reviewed catalog in isolated network fixtures. No production auth or database writes.
const { recipes: catalog } = JSON.parse(readFileSync(resolve(process.cwd(), '../../supabase/research/manual-brewing/recipes.json'), 'utf8'));
const rows = catalog.map((r: any, i: number) => ({ ...r, id: `66666666-6666-4666-8666-${String(i).padStart(12, '0')}`, bean_id: null, roasted_product_id: null, visibility: 'public', is_incomplete_source: false, flavor_notes: [], equipment: [], steps: r.steps.map((s: any, n: number) => ({ ...s, step_number: n + 1 })), sources: [{ source_url: r.source_url, source_name: r.source_author_name, data_confidence: 'official', last_verified_at: '2026-10-04T00:00:00Z' }] }));
const guideCases = [
  { method: 'aeropress', label: 'إيروبرس', slug: 'tim-wendelboe-aeropress-filter', time: 'نقع 60 ثانية ثم الكبس؛ الإجمالي غير محدد', video: 'Jjc34jyBlTM' },
  { method: 'french_press', label: 'فرنش برس', slug: 'coffee-collective-french-press-guide', time: 'نقع 4:00 ثم ترسيب 0:30 والكبس', video: '4RJPwdaeO7E' },
  { method: 'origami', label: 'أوريغامي', slug: 'kurasu-origami', time: '1:20', video: 'epkWs-Eo4m4' },
  { method: 'kalita_wave', label: 'كاليتا ويف', slug: 'drop-coffee-kalita-155', time: '2:45–3:00', video: 'JcKtGV7pRzM' },
];
for (const guide of guideCases) test(`${guide.method}: Arabic guide, source units/time, original image and working video action`, async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await context.route('https://www.youtube.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Isolated link target</p>' }));
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const u = new URL(route.request().url()); const m = u.searchParams.get('brew_method')?.replace('eq.', '');
    const data = u.pathname.endsWith('/recipes') ? rows.filter((r: any) => !m || r.brew_method === m) : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'تحضير', exact: true }).click();
  await page.getByRole('button', { name: guide.label, exact: true }).click();
  const recipe = rows.find((r: any) => r.slug === guide.slug);
  await page.getByRole('button', { name: recipe.title_ar, exact: true }).click();
  await expect(page.getByText(guide.time, { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId(`method-photo-${guide.method}`)).toBeVisible();
  if (guide.method === 'french_press') await expect(page.getByText('1000 ml', { exact: true })).toBeVisible();
  if (guide.method === 'kalita_wave') await expect(page.getByText('الخطة مثال باستخدام حدود نطاق المصدر؛ اتبع النطاق والتدفق المذكورين.', { exact: true })).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: /شاهد شرح التحضير على يوتيوب/ }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(`https://www.youtube.com/watch?v=${guide.video}`); await popup.close();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for (const width of [320, 390, 1536]) {
  test(`Chemex ${width}: method guide, Arabic steps, gram targets and stopwatch`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Install before the app caches timer APIs for its press/animation handlers.
    await page.clock.install();
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const writes: string[] = [];
    await page.route('https://mobilefixture.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      if (route.request().method() !== 'GET') writes.push(url.pathname);
      let data: unknown[] = url.pathname.endsWith('/recipes') ? rows : [];
      const method = url.searchParams.get('brew_method')?.replace('eq.', '');
      if (method) data = rows.filter((r: any) => r.brew_method === method);
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${data.length - 1}/${data.length}` }, body: JSON.stringify(data) });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'اكتشف', exact: true }).click();
    await page.getByRole('button', { name: 'كيمكس', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'دليل الكيمكس', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'وصفات هذه الطريقة', exact: true }).click();
    await page.getByRole('button', { name: 'إكواتور — كيمكس 45 g / 720 g', exact: true }).click();
    await expect(page.getByText('عند 0:30 أضف 210 g؛ الميزان: 300 g.', { exact: true })).toBeVisible();
    await page.getByLabel('جرعة البن للحساب (g)').fill('20');
    await expect(page.getByText('إجمالي ماء التحضير: 320 g', { exact: true })).toBeVisible();
    await expect(page.getByTestId('brew-pour-1').getByText('+40 g', { exact: true })).toBeVisible();
    await expect(page.getByTestId('brew-pour-1').getByText('40 g', { exact: true })).toBeVisible();
    await page.getByLabel('جرعة البن للحساب (g)').fill('80');
    await expect(page.getByRole('button', { name: 'ابدأ التحضير', exact: true })).toBeDisabled();
    await page.getByLabel('جرعة البن للحساب (g)').fill('20');
    await page.getByRole('button', { name: 'ابدأ التحضير', exact: true }).click();
    await page.clock.fastForward(65000);
    await expect(page.getByTestId('brew-elapsed')).toHaveText('1:05');
    await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();
    await page.clock.fastForward(10000);
    await expect(page.getByTestId('brew-elapsed')).toHaveText('1:05');
    await page.getByRole('button', { name: 'استئناف المؤقت', exact: true }).click();
    await page.clock.fastForward(5000);
    await page.getByRole('button', { name: 'أنهيت التحضير', exact: true }).click();
    await expect(page.getByTestId('brew-elapsed')).toHaveText('1:10');
    expect(writes).toEqual([]);
    await page.getByRole('button', { name: 'تصفير المؤقت', exact: true }).click();
    await expect(page.getByTestId('brew-elapsed')).toHaveText('0:00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
test('Moka: model-specific ranges, no scaling, unspecified fields remain written guidance', async ({ page }) => {
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const url = new URL(route.request().url()); const method = url.searchParams.get('brew_method')?.replace('eq.', '');
    const data = url.pathname.endsWith('/recipes') ? rows.filter((r: any) => !method || r.brew_method === method) : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${data.length - 1}/${data.length}` }, body: JSON.stringify(data) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'تحضير', exact: true }).click();
  await page.getByRole('button', { name: 'موكا بوت', exact: true }).click();
  await page.getByRole('button', { name: 'بلو بوتل — موكا بوت 6 أكواب', exact: true }).click();
  await expect(page.getByText('20–22 g', { exact: true })).toBeVisible();
  await expect(page.getByText('345 g', { exact: true })).toBeVisible();
  await expect(page.getByTestId('recipe-source-facts').getByText('3:00–6:00', { exact: true })).toBeVisible();
  await expect(page.getByLabel('جرعة البن للحساب (g)')).toHaveCount(0);
  await page.getByRole('button', { name: 'رجوع', exact: true }).click();
  await page.getByRole('button', { name: 'باكت — موكا بوت 240 ml', exact: true }).click();
  await expect(page.getByText('240 ml', { exact: true })).toBeVisible();
  await expect(page.getByTestId('recipe-source-facts').getByText('حسب انتهاء التدفق', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'رجوع', exact: true }).click();
  await page.getByRole('button', { name: 'بياليتي — دليل موكا إكسبريس الرسمي', exact: true }).click();
  await expect(page.getByText('ماء بحرارة الغرفة', { exact: true })).toBeVisible();
  await expect(page.getByText('سلة ممتلئة بلا كبس', { exact: true })).toBeVisible();
});
test('English preserves recipe instructions and source temperature ranges', async ({ page }) => {
  await page.route('https://mobilefixture.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(new URL(route.request().url()).pathname.endsWith('/recipes') ? rows : []) }));
  await page.goto('/');
  await page.getByRole('button', { name: 'تغيير اللغة، العربية', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Brew', exact: true }).click();
  await page.getByRole('button', { name: 'Blue Bottle — Chemex 600 g', exact: true }).click();
  await expect(page.getByText('36–46 g', { exact: true })).toBeVisible();
  await expect(page.getByText('93.3–98.9°C', { exact: true })).toBeVisible();
  await expect(page.getByText('At 0:45 pour to 300 g by 1:00.', { exact: true })).toBeVisible();
  await expect(page.getByText('عند 0:45 اسكب حتى 300 g بحلول 1:00.', { exact: true })).toHaveCount(0);
});

test('measured time reaches explicit outcome review without silently recording a scaled brew', async ({ page }) => {
  await page.clock.install();
  const user = { id: '33333333-3333-4333-8333-333333333333', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-09-01T00:00:00Z', identities: [], is_anonymous: false };
  const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
  const writes: any[] = [];
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/token')) data = { access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'isolated_refresh_fixture', user };
    else if (path.endsWith('/user')) data = user;
    else if (path.endsWith('/recipes')) data = rows;
    else if (path.endsWith('/rpc/record_brew_outcome_v1')) { const body = route.request().postDataJSON(); writes.push(body); data = body.p_request_id; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'تغيير اللغة، العربية', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('isolated-fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Brew', exact: true }).click();
  await page.getByRole('button', { name: 'Equator Coffees — Chemex 45 g / 720 g', exact: true }).click();
  await page.getByLabel('Coffee dose to calculate (g)').fill('20');
  await page.getByRole('button', { name: 'Start brewing', exact: true }).click();
  await page.clock.fastForward(65000);
  await page.getByRole('button', { name: 'Finish brewing', exact: true }).click();
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Record with measured time', exact: true }).click();
  await expect(page.getByLabel('Actual time (seconds, optional)', { exact: true })).toHaveValue('65');
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  expect(writes).toHaveLength(0);
  await page.getByLabel('Coffee (g)', { exact: true }).fill('20');
  await page.getByLabel('Water / output (g)', { exact: true }).fill('320');
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await page.getByRole('switch', { name: 'I changed the recipe', exact: true }).click();
  await page.getByRole('switch', { name: 'I actually brewed this cup', exact: true }).click();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Your brew was saved.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].p_payload).toMatchObject({ dose_grams: 20, water_grams: 320, actual_time_seconds: 65, status: 'brewed_with_modifications', share_with_community: false, brewed: true });
});
