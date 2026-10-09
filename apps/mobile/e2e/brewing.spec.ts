import { setLanguage } from './settings';
import { test, expect, type Route } from '@playwright/test';
import { openRecipeLibrary } from './navigation';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Independent network-fixture contract; production SQL is tested separately.
// Search text is JSON data, never a PostgREST expression.
type DiscoveryFixture = Record<string, any>;
function discoveryPage(route: Route, fixtures: DiscoveryFixture[], coffees: DiscoveryFixture[] = []) {
  expect(route.request().method()).toBe('POST');
  const url = new URL(route.request().url());
  expect(url.searchParams.has('or')).toBe(false);
  const params = route.request().postDataJSON() as Record<string, string | null>;
  const normalize = (value: unknown): string => String(value ?? '').toLowerCase()
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[ـًٌٍَُِّْٰ]/g, '').replace(/\s+/g, ' ').trim();
  const join = (...values: unknown[]) => normalize(values.flat(Infinity).filter(value => value != null).join(' '));
  const aliases: Record<string, string[]> = {
    chocolate: ['chocolate', 'cocoa', 'cacao', 'شوكولاتة', 'شوكولاته', 'كاكاو'],
    nutty: ['nutty', 'nuts', 'hazelnut', 'almond', 'مكسرات', 'بندق', 'لوز'],
    fruity: ['fruity', 'fruit', 'berry', 'berries', 'strawberry', 'blueberry', 'فواكه', 'فراولة', 'توت'],
    citrus: ['citrus', 'lemon', 'orange', 'grapefruit', 'حمضيات', 'ليمون', 'برتقال'],
    floral: ['floral', 'jasmine', 'rose', 'زهور', 'ياسمين', 'ورد'],
    caramel: ['caramel', 'toffee', 'كراميل', 'توفي'],
    spice: ['spice', 'spicy', 'cinnamon', 'cardamom', 'توابل', 'قرفة', 'هيل'],
  };
  const items = fixtures.filter(row => {
    if (row.visibility !== 'public') return false;
    if (params.p_method && row.brew_method !== params.p_method) return false;
    if (params.p_source && params.p_source !== 'all' &&
      !(params.p_source === 'official' ? ['official_manufacturer', 'official_roaster', 'verified_barista'].includes(row.recipe_type) : params.p_source === 'community' && row.recipe_type === 'community')) return false;
    if (params.p_method === 'xbloom' && params.p_model && params.p_model !== 'all' && row.source_brew_parameters?.model !== params.p_model) return false;
    const metadata = row.source_brew_parameters?.discovery ?? {};
    const coffee = coffees.find(item => item.id === row.bean_id && item.requires_review === false && item.is_published === true);
    const style = [row.serving_style, metadata.serving_style].find(value => ['hot', 'iced', 'cold'].includes(value)) ?? '';
    if (params.p_serving_style && !(params.p_serving_style === 'cold_or_iced' ? ['cold', 'iced'].includes(style) : style === params.p_serving_style)) return false;
    const terms: Record<string, string> = {
      p_recipe_name: join(row.title, row.title_ar),
      p_creator_name: join(row.source_author_name, metadata.creator_name, metadata.creator_name_ar),
      p_creator_country: join(metadata.creator_country, metadata.creator_country_ar),
      p_recipe_country: join(metadata.recipe_country, metadata.recipe_country_ar),
      p_coffee_type: join(row.source_varietal, coffee?.varietal, metadata.coffee_type, metadata.coffee_type_ar),
      p_coffee_name: join(row.source_coffee_name, coffee?.name_en, coffee?.name_ar, metadata.coffee_name, metadata.coffee_name_ar),
      p_coffee_origin: join(row.source_origin_country, coffee?.origin_country, metadata.coffee_origin, metadata.coffee_origin_ar),
      p_roaster_name: join(row.source_roaster_name, coffee?.roaster?.name_en, coffee?.roaster?.name_ar, metadata.roaster_name, metadata.roaster_name_ar),
      p_source_name: join(row.sources?.flatMap((source: DiscoveryFixture) => [source.source_name, source.source_url]), metadata.source_urls),
      p_flavor_note: join(row.flavor_notes, row.source_tasting_notes, coffee?.flavors?.map((flavor: DiscoveryFixture) => flavor.flavor), metadata.flavor_notes, metadata.flavor_notes_ar, metadata.flavor_families),
    };
    if (Object.entries(terms).some(([key, text]) => params[key] && !text.includes(normalize(params[key])))) return false;
    if (params.p_flavor_family) {
      const words = terms.p_flavor_note.split(/[^\p{L}\p{N}]+/u);
      if (!(aliases[params.p_flavor_family] ?? []).some(alias => words.includes(normalize(alias)))) return false;
    }
    const text = join(Object.values(terms), style, style === 'hot' ? 'ساخن حار' : style === 'iced' ? 'مثلج' : style === 'cold' ? 'بارد' : '');
    return normalize(params.p_query).split(' ').filter(Boolean).every(term => text.includes(term));
  }).sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')) || a.id.localeCompare(b.id));
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 30);
  expect(Number.isInteger(offset) && offset >= 0).toBe(true);
  expect(Number.isInteger(limit) && limit > 0).toBe(true);
  const data = items.slice(offset, offset + limit);
  const headers = {
    'content-range': data.length ? `${offset}-${offset + data.length - 1}/${items.length}` : `*/${items.length}`,
    'access-control-expose-headers': 'content-range',
  };
  return { data, headers, offset, limit, total: items.length, params };
}

function replyCoffeeRecipes(route: Route, fixtures: DiscoveryFixture[]) {
  expect(route.request().method()).toBe('POST');
  const params = route.request().postDataJSON() as { p_bean_id?: string; p_product_id?: string };
  expect(Object.keys(params)).toHaveLength(1);
  expect(Boolean(params.p_bean_id) !== Boolean(params.p_product_id)).toBe(true);
  const target = params.p_bean_id ?? params.p_product_id!;
  expect(target).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  const url = new URL(route.request().url());
  const items = fixtures.filter(row => row.visibility === 'public' &&
    (params.p_bean_id ? row.bean_id === target : row.roasted_product_id === target))
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')) || a.id.localeCompare(b.id));
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const data = items.slice(offset, offset + limit);
  return route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'content-range': data.length ? `${offset}-${offset + data.length - 1}/${items.length}` : `*/${items.length}`, 'access-control-expose-headers': 'content-range' },
    body: JSON.stringify(data),
  });
}

function replyDiscovery(route: Route, fixtures: DiscoveryFixture[], coffees: DiscoveryFixture[] = []) {
  const result = discoveryPage(route, fixtures, coffees);
  return route.fulfill({ status: 200, contentType: 'application/json', headers: result.headers, body: JSON.stringify(result.data) });
}

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
    if (u.pathname.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, rows);
    if (u.pathname.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, rows);
    const data = u.pathname.endsWith('/recipes') ? rows.filter((r: any) => !m || r.brew_method === m) : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  await openRecipeLibrary(page, 'ar');
  await page.getByRole('button', { name: guide.label, exact: true }).click();
  const recipe = rows.find((r: any) => r.slug === guide.slug);
  await page.getByRole('button', { name: recipe.title_ar, exact: true }).click();
  await expect(page.getByText(guide.time, { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId(`method-photo-${guide.method}`)).toBeVisible();
  if (guide.method === 'french_press') await expect(page.getByText('1000 ml', { exact: true })).toBeVisible();
  if (guide.method === 'kalita_wave') await expect(page.getByText('الخطة مثال باستخدام حدود نطاق المصدر؛ اتبع النطاق والتدفق المذكورين.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'دليل طريقة التحضير', exact: true }).click();
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
      // These two RPCs are read-only POSTs; every other non-GET still counts as a write.
      if (url.pathname.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, rows);
      if (url.pathname.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, rows);
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
    if (url.pathname.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, rows);
    if (url.pathname.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, rows);
    const data = url.pathname.endsWith('/recipes') ? rows.filter((r: any) => !method || r.brew_method === method) : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${data.length - 1}/${data.length}` }, body: JSON.stringify(data) });
  });
  await page.goto('/');
  await openRecipeLibrary(page, 'ar');
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
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, rows);
    if (path.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, rows);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(path.endsWith('/recipes') ? rows : []) });
  });
  await page.goto('/');
  await setLanguage(page, 'en');
  await openRecipeLibrary(page, 'en');
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
    if (path.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, rows);
    if (path.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, rows);
    let data: unknown = [];
    if (path.endsWith('/token')) data = { access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'isolated_refresh_fixture', user };
    else if (path.endsWith('/user')) data = user;
    else if (path.endsWith('/recipes')) data = rows;
    else if (path.endsWith('/rpc/record_brew_outcome_v1')) { const body = route.request().postDataJSON(); writes.push(body); data = body.p_request_id; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  await setLanguage(page, 'en');
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('isolated-fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByTestId('account-screen')).toBeVisible();
  await openRecipeLibrary(page, 'en');
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

for (const locale of ['ar', 'en'] as const) {
  test(`${locale} 320 px: published ice, per-shot milk and phase temperatures retain their separate meanings`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 960 });
    const { recipes: reviewed } = JSON.parse(readFileSync(resolve(process.cwd(), '../../supabase/research/global-roasters/catalog.json'), 'utf8'));
    const slugs = ['kurasu-august-2026-comparison-flash-brew', 'ona-aspen-espresso', 'friedhats-lex-wenneker-cool-bloom-origami'];
    const fixtures = slugs.map((slug, index) => {
      const published = reviewed.find((row: DiscoveryFixture) => row.slug === slug);
      expect(published).toBeDefined();
      return { ...published, id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, '0')}`, bean_id: null, roasted_product_id: null,
        visibility: 'public', equipment: [], sources: [{ source_url: published.source_url, source_name: published.source_author_name, data_confidence: 'official' }],
      };
    });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://mobilefixture.supabase.co/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, fixtures);
      if (url.pathname.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, fixtures);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.pathname.endsWith('/recipes') ? fixtures : []) });
    });
    await page.goto('/');
    if (locale === 'en') {
      await setLanguage(page, 'en');
    }
    await openRecipeLibrary(page, locale);
    for (const fixture of fixtures) {
      await page.getByRole('button', { name: locale === 'ar' ? fixture.title_ar : fixture.title, exact: true }).click();
      const facts = page.getByTestId('recipe-source-facts');
      if (fixture.slug === slugs[0]) {
        await expect(facts.getByText('150 g', { exact: true })).toBeVisible();
        await expect(page.getByTestId('recipe-fact-ice')).toContainText('65–70 g');
        await expect(facts.getByText('1:40–1:45', { exact: true })).toBeVisible();
        await expect(page.getByTestId('recipe-fact-milk-single-shot')).toHaveCount(0);
      } else if (fixture.slug === slugs[1]) {
        await expect(facts.getByText('35–40 g', { exact: true })).toBeVisible();
        await expect(page.getByTestId('recipe-fact-milk-single-shot')).toContainText('120 g');
        await expect(page.getByTestId('recipe-fact-milk-single-shot')).toContainText(locale === 'ar' ? 'الحليب لكل شوت إسبريسو منفرد' : 'Milk per single espresso shot');
        await expect(page.getByTestId('recipe-fact-yield-scope')).toContainText('two espresso shots combined');
        await expect(page.getByTestId('recipe-fact-ice')).toHaveCount(0);
      } else {
        const phaseTemperature = facts.getByText(locale === 'ar' ? '62°C للتزهير · 90°C للصبات التالية' : '62°C bloom · 90°C main pours', { exact: true });
        await expect(phaseTemperature).toBeVisible();
        await expect(page.getByTestId('recipe-fact-bloom-temperature')).toContainText('62°C');
        await expect(page.getByTestId('recipe-fact-main-temperature')).toContainText('90°C');
        await facts.scrollIntoViewIfNeeded();
        expect(await phaseTemperature.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`${locale}-friedhats-temperatures-320.png`) });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back', exact: true }).click();
    }
    expect(errors).toEqual([]);
  });
}
