import { setLanguage } from './settings';
import { test, expect, type Page, type Route } from '@playwright/test';
import { openRecipeLibrary } from './navigation';

// Only isolated API responses and accounts; live SQL is checked separately.
const bean = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'offline-coffee', name_ar: 'بن اختبار الاتصال', name_en: 'Connection test coffee', requires_review: false, is_published: true, suitable_for_v60: true, flavors: [], roaster: { name_ar: 'محمصة التجربة', name_en: 'Test roaster' } };
const recipe = (index: number, serving = 'hot') => ({
  id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(index).padStart(12, '0')}`, title: `BOMBE recipe ${index}`, title_ar: `وصفة بومب ${index}`,
  visibility: 'public', brew_method: 'v60', recipe_type: 'official_roaster', bean_id: bean.id, roasted_product_id: null,
  serving_style: serving, dose_grams: 18, water_grams: 288, total_time_seconds: 180, flavor_notes: [],
  steps: [{ step_number: 1, title: 'Pour', title_ar: 'الصب', description: 'Use the source steps.', description_ar: 'اتّبع خطوات المصدر.' }],
  equipment: [], sources: [], source_brew_parameters: { discovery: { serving_style: serving } },
});
const records = [...Array.from({ length: 42 }, (_, i) => recipe(i)), recipe(100, 'iced'), recipe(101, 'cold'), recipe(102, 'unknown')];
async function reply(route: Route, data: unknown, status = 200, total?: number) {
  await route.fulfill({ status, contentType: 'application/json', headers: total === undefined ? {} : {
    'content-range': Array.isArray(data) && data.length ? `0-${data.length - 1}/${total}` : `*/${total}`,
    'access-control-expose-headers': 'content-range',
  }, body: JSON.stringify(data) });
}
async function chooseEnglish(page: Page) {
  await setLanguage(page, 'en');
  await expect(page.getByRole('button', { name: 'Close language selection', includeHidden: true, exact: true })).toHaveCount(0);
}
function normalize(text: string) { return text.normalize('NFKD').replace(/\p{M}/gu, '').replace(/ة/g, 'ه').toLowerCase(); }

test('coffee cards appear while recipe reads are delayed and language changes do not repeat catalog requests', async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const calls: string[] = [];
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (['beans', 'roasted_products', 'recipes', 'xbloom_recipe_profiles'].some(table => path.endsWith('/' + table))) calls.push(path);
    if (path.endsWith('/recipes') || path.endsWith('/xbloom_recipe_profiles')) await gate;
    try { await reply(route, path.endsWith('/beans') ? [bean] : path.endsWith('/recipes') ? [records[0]] : []); } catch {}
  });
  try {
    await page.goto('/');
    await expect(page.getByRole('button', { name: bean.name_ar, exact: true })).toBeVisible();
    await expect.poll(() => calls.length).toBe(5);
    await setLanguage(page, 'en');
    await expect(page.getByRole('button', { name: bean.name_en, exact: true })).toBeVisible();
    await setLanguage(page, 'ar');
    await expect(page.getByRole('button', { name: bean.name_ar, exact: true })).toBeVisible();
    expect(calls).toHaveLength(5);
    release();
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('beanmora-public-catalog-v2:')).length)).toBe(1);
    await setLanguage(page, 'en');
    await expect(page.getByRole('button', { name: bean.name_en, exact: true })).toBeVisible();
    expect(calls).toHaveLength(5);
  } finally { release(); }
});

test('suggested serving style is labelled in results and recipe detail', async ({ page }) => {
  const suggested = { ...records[0], source_brew_parameters: { discovery: {
    serving_style: 'hot', serving_style_evidence: { classification: 'inferred' },
  } } };
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    return reply(route, path.endsWith('/beans') ? [bean] : path.endsWith('/recipes') || path.endsWith('/rpc/search_public_recipes') ? [suggested] : [], 200);
  });
  await page.goto('/');
  await chooseEnglish(page);
  await openRecipeLibrary(page, 'en');
  await page.getByRole('button', { name: 'Serving: Hot', exact: true }).click();
  await expect(page.getByText('Hot · Suggested', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: suggested.title, exact: true }).click();
  await expect(page.getByText('Serving style is suggested from the preparation method; the publisher did not specify it.', { exact: true })).toBeVisible();
  await expect(page.getByText('18 g', { exact: true })).toBeVisible();
  await expect(page.getByText('288 g', { exact: true })).toBeVisible();
});

for (const { locale, width } of [{ locale: 'ar', width: 320 }, { locale: 'en', width: 768 }] as const) {
  test(`${locale}: quick serving filters combine with text and reset pagination`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1024 });
    const calls: { style: string | null; query: string | null; offset: number }[] = [];
    await page.route('https://mobilefixture.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/rpc/search_public_recipes')) {
        const args = route.request().postDataJSON(); const offset = Number(url.searchParams.get('offset') ?? 0);
        calls.push({ style: args.p_serving_style, query: args.p_query, offset });
        const matching = records.filter(row => (!args.p_serving_style || (args.p_serving_style === 'cold_or_iced' ? ['iced', 'cold'].includes(row.serving_style) : row.serving_style === args.p_serving_style))
          && (!args.p_query || normalize(row.title + ' ' + row.title_ar).includes(normalize(args.p_query))));
        return reply(route, matching.slice(offset, offset + 30), 200, matching.length);
      }
      return reply(route, url.pathname.endsWith('/recipes') ? [records[0]] : url.pathname.endsWith('/beans') ? [bean] : []);
    });
    await page.goto('/'); if (locale === 'en') await chooseEnglish(page);
    await openRecipeLibrary(page, locale);
    const ar = locale === 'ar';
    await page.getByRole('button', { name: ar ? 'المزيد من الوصفات' : 'More recipes', exact: true }).click();
    await expect.poll(() => calls.at(-1)?.offset).toBe(30);
    for (const [style, label, index] of [['hot', ar ? 'حار' : 'Hot', 0], ['cold_or_iced', ar ? 'بارد ومثلّج' : 'Cold & iced', 100]] as const) {
      await page.getByRole('button', { name: ar ? `تقديم: ${label}` : `Serving: ${label}`, exact: true }).click();
      await expect.poll(() => calls.at(-1)).toEqual({ style, query: null, offset: 0 });
      await expect(page.getByRole('button', { name: ar ? `وصفة بومب ${index}` : `BOMBE recipe ${index}`, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: ar ? 'وصفة بومب 102' : 'BOMBE recipe 102', exact: true })).toHaveCount(0);
    }
    await page.getByLabel(ar ? 'ابحث عن وصفة' : 'Find a recipe', { exact: true }).fill(ar ? 'بُومب' : 'BOMBE');
    await expect.poll(() => calls.at(-1)?.query).toBe(ar ? 'بُومب' : 'BOMBE');
    expect(calls.at(-1)?.style).toBe('cold_or_iced');
    await expect(page.getByRole('button', { name: ar ? 'وصفة بومب 101' : 'BOMBE recipe 101', exact: true })).toBeVisible();
    await page.getByRole('button', { name: ar ? 'تقديم: بارد ومثلّج' : 'Serving: Cold & iced', exact: true }).click();
    await expect(page.getByRole('button', { name: ar ? 'وصفة بومب 100' : 'BOMBE recipe 100', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: ar ? 'وصفة بومب 101' : 'BOMBE recipe 101', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`serving-${locale}-${width}.png`) });
  });
}

test('a superseded serving request cannot overwrite the latest choice', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let hotStarted = false;
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/rpc/search_public_recipes')) {
      const style = route.request().postDataJSON().p_serving_style;
      if (style === 'hot') { hotStarted = true; await gate; try { await reply(route, [records[0]], 200, 1); } catch {} return; }
      return reply(route, [style === 'cold_or_iced' ? records[42] : records[0]], 200, 1);
    }
    return reply(route, path.endsWith('/recipes') ? [records[0]] : []);
  });
  try {
    await page.goto('/'); await openRecipeLibrary(page, 'ar');
    await page.getByRole('button', { name: 'تقديم: حار', exact: true }).click();
    await expect.poll(() => hotStarted).toBe(true);
    await page.getByRole('button', { name: 'تقديم: بارد ومثلّج', exact: true }).click();
    await expect(page.getByRole('button', { name: 'وصفة بومب 100', exact: true })).toBeVisible();
    release();
    await expect(page.getByRole('button', { name: 'وصفة بومب 0', exact: true })).toHaveCount(0);
  } finally { release(); }
});

test('last-good catalog opens offline and a successful empty reconnect removes old records', async ({ page }) => {
  let phase: 'online' | 'offline' | 'empty' = 'online';
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (phase === 'offline') return reply(route, { message: 'isolated outage' }, 503);
    return reply(route, phase === 'empty' ? [] : path.endsWith('/beans') ? [bean] : path.endsWith('/recipes') ? [records[0]] : []);
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: bean.name_ar, exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('beanmora-public-catalog-v2:')).length)).toBe(1);
  phase = 'offline'; await page.reload();
  await expect(page.getByRole('button', { name: bean.name_ar, exact: true })).toBeVisible();
  await expect(page.getByTestId('catalog-connection-status')).toContainText('آخر بيانات متاحة');
  await expect(page.getByRole('button', { name: 'إعادة الاتصال', exact: true })).toBeVisible();
  phase = 'empty'; await page.getByRole('button', { name: 'إعادة الاتصال', exact: true }).click();
  await expect(page.getByTestId('catalog-connection-status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: bean.name_ar, exact: true })).toHaveCount(0);
});

test('saved recipe amounts and steps survive a reload and failed network, then can be removed', async ({ page }, info) => {
  let offline = false;
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (offline) return reply(route, { message: 'isolated offline response' }, 503);
    return reply(route, path.endsWith('/recipes') || path.endsWith('/rpc/search_public_recipes') ? [records[42]] : [], 200, 1);
  });
  await page.goto('/'); await openRecipeLibrary(page, 'ar');
  await page.getByRole('button', { name: 'وصفة بومب 100', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ الوصفة على الجهاز', exact: true }).click();
  await expect(page.getByRole('button', { name: 'إزالة الوصفة من المحفوظة', exact: true })).toBeEnabled();
  offline = true; await page.reload();
  await page.getByRole('button', { name: 'وصفاتي المحفوظة', exact: true }).click();
  await page.getByRole('button', { name: 'وصفة بومب 100', exact: true }).click();
  await expect(page.getByTestId('recipe-detail')).toContainText('288');
  await expect(page.getByTestId('recipe-detail')).toContainText('اتّبع خطوات المصدر.');
  await page.screenshot({ path: info.outputPath('saved-recipe-offline.png') });
  await page.getByRole('button', { name: 'إزالة الوصفة من المحفوظة', exact: true }).click();
  await expect(page.getByRole('button', { name: 'حفظ الوصفة على الجهاز', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'رجوع', exact: true }).click();
  await expect(page.getByRole('button', { name: 'وصفة بومب 100', exact: true })).toHaveCount(0);
});

const user = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-10-01T00:00:00Z', identities: [], is_anonymous: false };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
async function signIn(page: Page) {
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(user.email);
  await page.getByLabel('كلمة المرور', { exact: true }).fill('isolated-password');
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
}
function authReply(route: Route, path: string) {
  if (path.endsWith('/token')) return reply(route, { access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'isolated_fixture', user });
  if (path.endsWith('/user')) return reply(route, user);
  return null;
}
test('guest login returns to the chosen brew review without writing a result automatically', async ({ page }) => {
  let writes = 0;
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    const auth = authReply(route, path); if (auth) return auth;
    if (route.request().method() === 'POST' && path.includes('record_brew')) writes++;
    return reply(route, path.endsWith('/recipes') || path.endsWith('/rpc/search_public_recipes') ? [records[0]] : [], 200, 1);
  });
  await page.goto('/'); await openRecipeLibrary(page, 'ar');
  await page.getByRole('button', { name: 'وصفة بومب 0', exact: true }).click();
  await page.getByRole('button', { name: 'سجّل نتيجة تحضيري', exact: true }).click();
  await page.getByRole('button', { name: 'رجوع', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'وصفة بومب 0', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'سجّل نتيجة تحضيري', exact: true }).click();
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'شلون كان الكوب؟', exact: true })).toBeVisible();
  expect(writes).toBe(0);
});

test('bag serving filters find a recipe beyond page one and Arabic decimal weights stay exact', async ({ page }) => {
  const bag = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', legacy_bean_id: bean.id, roasted_product_id: null, preferred_recipe_id: null, remaining_weight_grams: 100, original_weight_grams: 250, opened_at: null, updated_at: '2026-10-06T00:00:00Z', created_at: '2026-10-06T00:00:00Z', brew_count: 0 };
  const calls: URL[] = []; const writes: any[] = [];
  const lateIced = { ...recipe(100, 'unknown'), source_brew_parameters: { discovery: { serving_style: 'iced' } } };
  const bagRecords = [...records.slice(0, 42), lateIced, records[43]];
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const url = new URL(route.request().url()); const path = url.pathname;
    const auth = authReply(route, path); if (auth) return auth;
    if (path.endsWith('/user_bean_inventory')) {
      if (route.request().method() === 'PATCH') { writes.push(route.request().postDataJSON()); return reply(route, []); }
      expect(url.searchParams.get('archived_at')).toBe('is.null');
      return reply(route, [bag]);
    }
    if (path.endsWith('/rpc/recipes_for_coffee')) {
      expect(route.request().postDataJSON()).toEqual({ p_bean_id: bean.id }); calls.push(url);
      const style = url.searchParams.get('or')?.includes('serving_style.in.(iced,cold)') ? 'cold_or_iced' : url.searchParams.get('or')?.match(/serving_style.eq.(hot|iced|cold)/)?.[1];
      const method = url.searchParams.get('brew_method')?.replace(/^eq\./, '');
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const matching = bagRecords.filter(row => { const serving = ['hot', 'iced', 'cold'].includes(row.serving_style) ? row.serving_style : row.source_brew_parameters.discovery.serving_style; return (!style || (style === 'cold_or_iced' ? ['iced','cold'].includes(serving) : serving === style)) && (!method || row.brew_method === method); });
      return reply(route, matching.slice(offset, offset + 30), 200, matching.length);
    }
    return reply(route, path.endsWith('/beans') ? [bean] : path.endsWith('/recipes') ? [records[0]] : []);
  });
  await page.goto('/'); await page.getByRole('button', { name: 'حسابي', exact: true }).click(); await signIn(page);
  await expect(page.getByRole('button', { name: 'تسجيل الخروج', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'تحضير', exact: true }).click();
  await page.getByRole('button', { name: 'بارد ومثلّج', exact: true }).click();
  await expect(page.getByText('وصفة بومب 100', { exact: true })).toBeVisible();
  await expect(page.getByText('وصفة بومب 0', { exact: true })).toHaveCount(0);
  expect(calls.at(-1)?.searchParams.get('offset')).toBe('0');
  await expect(page.getByText('وصفة بومب 101', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'الرئيسية', exact: true }).click();
  await page.getByRole('button', { name: /^أكياسي —/ }).click();
  await page.getByRole('button', { name: 'تعديل بيانات الكيس', exact: true }).click();
  await page.getByLabel('وزن الكيس الأصلي (غرام)', { exact: true }).fill('٢٥٠٫٥');
  await page.getByLabel('الكمية المتبقية (غرام)', { exact: true }).fill('٣٠٠');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(page.getByText('أدخل وزنًا صحيحًا؛ المتبقي لا يتجاوز وزن الكيس الأصلي.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByLabel('الكمية المتبقية (غرام)', { exact: true }).fill('١٨٫٥');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].original_weight_grams).toBe(250.5);
  expect(writes[0].remaining_weight_grams).toBe(18.5);
});

test('device storage failure is visible and does not report a recipe as saved', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('beanmora-recipe-shelf-v1:')) throw new DOMException('Isolated fixture quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    return reply(route, path.endsWith('/recipes') || path.endsWith('/rpc/search_public_recipes') ? [records[0]] : [], 200, 1);
  });
  await page.goto('/'); await openRecipeLibrary(page, 'ar');
  await page.getByRole('button', { name: 'وصفة بومب 0', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ الوصفة على الجهاز', exact: true }).click();
  await expect(page.getByText(/تعذّر الحفظ/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'حفظ الوصفة على الجهاز', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'إزالة الوصفة من المحفوظة', exact: true })).toHaveCount(0);
});
