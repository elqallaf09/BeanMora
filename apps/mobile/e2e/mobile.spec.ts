import { test, expect, type Page, type Route } from '@playwright/test';
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
    if (params.p_serving_style && style !== params.p_serving_style) return false;
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

async function expectHomeHeroContained(page: Page) {
  const hero = page.getByTestId('home-hero');
  await expect(hero).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const clipped = await hero.evaluate(element => {
    const outer = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll('[role="heading"], [role="button"]')).flatMap(child => {
      const box = child.getBoundingClientRect();
      return box.top < outer.top - 1 || box.bottom > outer.bottom + 1 || box.left < outer.left - 1 || box.right > outer.right + 1
        ? [child.textContent] : [];
    });
  });
  expect(clipped, 'The hero heading and CTA fit inside their clipping container').toEqual([]);
}

// Isolated fixtures only. Never used by App.tsx, Supabase production, or a published build.
const recipeId = '11111111-1111-4111-8111-111111111111';
const bean = { id: '22222222-2222-4222-8222-222222222222', slug: 'fixture', name_ar: 'بن الاختبار المعزول', name_en: 'Isolated coffee fixture', requires_review: false, is_published: true, suitable_for_v60: true, suitable_for_espresso: false, suitable_for_xbloom: false, roast_level: 'light', last_verified_at: null, roaster: { name_ar: 'محمصة الاختبار', name_en: 'Test roaster' }, flavors: [{ flavor: 'chocolate' }], origin_country: 'Test origin' };
const recipe = { id: recipeId, title: 'Isolated recipe fixture', title_ar: 'وصفة الاختبار المعزولة', brew_method: 'v60', visibility: 'public', bean_id: bean.id, roasted_product_id: null, flavor_notes: ['chocolate'], difficulty: 'beginner', is_incomplete_source: false, dose_grams: 18, water_grams: 300, total_time_seconds: 180, steps: [{ step_number: 1, title: 'Pour water', description: 'A written test instruction' }], equipment: [] };
for (const locale of ['ar', 'en'] as const) {
  test(`${locale}: native-web catalog, detail, recommendation and login surfaces`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://mobilefixture.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, [recipe], [bean]);
      if (url.pathname.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, [recipe]);
      const data = url.pathname.endsWith('/beans') ? [bean] : url.pathname.endsWith('/recipes') ? [recipe] : [];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto('/');
    if (locale === 'en') { await page.getByRole('button', { name: 'تغيير اللغة، العربية', exact: true }).click(); await page.getByRole('button', { name: 'English', exact: true }).click(); }
    await expectHomeHeroContained(page);
    const coffeeName = locale === 'ar' ? bean.name_ar : bean.name_en;
    await page.getByRole('button', { name: coffeeName, exact: true }).click();
    await expect(page.getByRole('heading', { name: coffeeName })).toBeVisible();
    await page.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back', exact: true }).click();
    await page.getByRole('button', { name: locale === 'ar' ? 'تحضير' : 'Brew', exact: true }).click();
    await expect(page.getByRole('heading', { name: locale === 'ar' ? 'حضّر قهوتي' : 'Brew my coffee', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: locale === 'ar' ? 'تسجيل الدخول' : 'Sign in', exact: true })).toBeVisible();
    await openRecipeLibrary(page, locale);
    await page.getByRole('button', { name: locale === 'ar' ? recipe.title_ar : recipe.title, exact: true }).click();
    await expect(page.getByText('A written test instruction')).toBeVisible();
    await page.getByRole('button', { name: locale === 'ar' ? 'سجّل نتيجة تحضيري' : 'Record my brew', exact: true }).click();
    await expect(page.getByLabel(locale === 'ar' ? 'البريد الإلكتروني' : 'Email', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back', exact: true }).click();
    await page.getByRole('button', { name: locale === 'ar' ? 'اكتشف' : 'Discover', exact: true }).click();
    await page.getByRole('button', { name: locale === 'ar' ? 'لك أنت' : 'For you', exact: true }).click();
    await expect(page.getByText(locale === 'ar' ? /مطابقة بقواعد واضحة/ : /Explainable matching/)).toBeVisible();
    await expect(page.getByRole('button', { name: coffeeName, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
test('320 px UUID coffee detail accepts Toby’s verified shared recipe and preserves its roast-age yields', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 960 });
  const brunswick = { ...bean, name_en: 'Brunswick', name_ar: 'برونزويك', suitable_for_v60: false, suitable_for_espresso: true,
    roaster: { name_en: "Toby's Estate", name_ar: 'توبيز إستيت' },
  };
  const catalog = JSON.parse(readFileSync(resolve(process.cwd(), '../../supabase/research/global-roasters/catalog.json'), 'utf8'));
  const toby = catalog.recipes.find((row: DiscoveryFixture) => row.slug === 'tobys-estate-broadway-espresso');
  expect(toby).toBeDefined();
  const shared = { ...toby, id: '77777777-7777-4777-8777-777777777777',
    bean_id: '44444444-4444-4444-8444-444444444444', roasted_product_id: null, visibility: 'public', recipe_type: 'official_roaster',
    equipment: [], sources: [{ source_name: toby.source_author_name, source_url: toby.source_url, data_confidence: 'official' }],
  };
  const unrelated = { ...recipe, id: '88888888-8888-4888-8888-888888888888', title: 'Another coffee method', bean_id: '55555555-5555-4555-8555-555555555555' };
  const generic = { ...recipe, id: '99999999-9999-4999-8999-999999999999', title: 'Generic guide outside this coffee', bean_id: null };
  const requests: unknown[] = [];
  await page.route('https://mobilefixture.supabase.co/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/rpc/recipes_for_coffee')) {
      expect(route.request().method()).toBe('POST');
      const params = route.request().postDataJSON(); requests.push(params);
      expect(params).toEqual({ p_bean_id: brunswick.id });
      expect(url.searchParams.get('order')).toBe('updated_at.desc,id.asc');
      expect(url.searchParams.get('limit')).toBe('30');
      expect(Number(url.searchParams.get('offset') ?? 0)).toBe(0);
      // Server-verified sharing may legitimately have a different primary bean FK.
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify([shared]) });
    }
    if (url.pathname.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, [unrelated, generic]);
    const rows = url.pathname.endsWith('/beans') ? [brunswick] : url.pathname.endsWith('/recipes') ? [unrelated, generic] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'تغيير اللغة، العربية', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expectHomeHeroContained(page);
  await page.getByRole('button', { name: brunswick.name_en, exact: true }).click();
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: unrelated.title, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: generic.title, exact: true })).toHaveCount(0);
  const peakYield = page.getByText('40 g · peak (Days 11–15 after roast)', { exact: true });
  await expect(peakYield).toBeVisible();
  await page.getByRole('heading', { name: 'Selected recipe', exact: true }).locator('..').scrollIntoViewIfNeeded();
  expect(await peakYield.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('toby-coffee-detail-320.png') });
  const start = page.getByRole('button', { name: 'Start brewing with Espresso', exact: true });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByRole('heading', { name: shared.title, exact: true })).toBeVisible();
  await expect(page.getByTestId('roast-age-yield-0')).toContainText('48 g');
  await expect(page.getByTestId('roast-age-yield-1')).toContainText('44 g');
  await expect(page.getByTestId('roast-age-yield-2')).toContainText('40 g');
  await expect(page.getByTestId('roast-age-yield-2')).toContainText('Source peak window');
  await expect(page.getByTestId('roast-age-yield-3')).toContainText('36 g');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('recipe-roast-age-yields').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('toby-roast-age-yields-320.png') });
});

test('failed reads surface a failure rather than invented records', async ({ page }) => {
  await page.route('https://mobilefixture.supabase.co/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"fixture failure"}' }));
  await page.goto('/');
  await expect(page.getByText(/تعذّر تحميل بعض البيانات/).first()).toBeVisible();
});
