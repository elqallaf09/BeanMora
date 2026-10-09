import { setLanguage } from './settings';
import { test, expect, type Route } from '@playwright/test';
import { openRecipeLibrary } from './navigation';

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


// Browser-only isolated fixtures. No real identity, token or database is involved.
for (const unit of ['g', 'ml'] as const) test(`signed-in brew with source water in ${unit} requires measured grams and retries identically`, async ({ page }) => {
  const user = { id: '33333333-3333-4333-8333-333333333333', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-09-01T00:00:00Z', identities: [], is_anonymous: false };
  const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
  const recipe = { id: '11111111-1111-4111-8111-111111111111', title: 'Isolated outcome recipe', title_ar: 'وصفة اختبار الحفظ', brew_method: 'v60', visibility: 'public', bean_id: null, roasted_product_id: null, flavor_notes: [], difficulty: 'beginner', is_incomplete_source: false, dose_grams: 18, water_grams: unit === 'g' ? 300 : null, source_brew_parameters: unit === 'ml' ? { water_ml: 300 } : {}, total_time_seconds: 180, steps: [], equipment: [] };
  const writes: { p_request_id: string; p_payload: Record<string, unknown> }[] = [];
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, [recipe]);
    if (path.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, [recipe]);
    let data: unknown = []; let status = 200;
    if (path.endsWith('/token')) data = { access_token: accessToken, token_type: 'bearer', expires_in: 3600, refresh_token: 'isolated_refresh_fixture', user };
    else if (path.endsWith('/user')) data = user;
    else if (path.endsWith('/recipes')) data = [recipe];
    else if (path.endsWith('/rpc/record_brew_outcome_v1')) {
      const body = route.request().postDataJSON(); writes.push(body);
      status = writes.length === 1 ? 503 : 200;
      data = writes.length === 1 ? { message: 'isolated temporary failure' } : body.p_request_id;
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/'); await setLanguage(page, 'en');
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('isolated-fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByTestId('account-screen')).toBeVisible();
  await openRecipeLibrary(page, 'en');
  await page.getByRole('button', { name: recipe.title, exact: true }).click();
  await page.getByRole('button', { name: 'Record my brew', exact: true }).click();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Check quantities, time, result and actual-brew confirmation.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(0);
  if (unit === 'ml') {
    await expect(page.getByLabel('Water / output (g)', { exact: true })).toHaveValue('');
    await page.getByLabel('Water / output (g)', { exact: true }).fill('300');
  }
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await page.getByRole('switch', { name: 'I actually brewed this cup', exact: true }).click();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Save was not confirmed. Retry the same request.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('Your brew was saved.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
  expect(writes[0].p_payload).toMatchObject({ outcome: 'good', share_with_community: false, actual_time_seconds: null, brewed: true, taste_scores: {} });
  expect(writes[0].p_payload).not.toHaveProperty('user_id');
  const persisted = await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('auth-token')));
  expect(persisted.length).toBe(1);
  expect(persisted[0]).toContain('auth-token');
});
