import { test, expect, type Page, type Route } from "@playwright/test";
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


// Isolated browser fixtures. These never become production catalog or reviews.
const roasterId = "44444444-4444-4444-8444-444444444444";
const modelId = "55555555-5555-4555-8555-555555555555";
const bean = {
  id: "22222222-2222-4222-8222-222222222222",
  roaster_id: roasterId,
  name_ar: "بن المحمصة المعزول",
  name_en: "Isolated roaster coffee",
  requires_review: false,
  is_published: true,
  suitable_for_xbloom: true,
  suitable_for_v60: true,
  roast_level: "light",
  roaster: { name_ar: "محمصة معزولة", name_en: "Isolated roaster" },
  images: [],
  flavors: [],
};
const model = {
  id: modelId,
  name: "Bialetti Moka Express",
  category: "other",
  requires_review: false,
  source_url: "https://manufacturer-fixture.test/moka",
  image_url: "https://photo-fixture.test/moka.jpg",
  image_usage_status: "source_linked",
  suitable_brew_methods: [],
  specifications: {},
};
const roaster = {
  id: roasterId,
  name_ar: "محمصة معزولة",
  name_en: "Isolated roaster",
  country: "Kuwait",
  requires_review: false,
  locations: [],
  description_ar: "وصف المحمصة المعزولة",
  description_en: "Isolated roaster description",
};
const recipes = Array.from({ length: 64 }, (_, i) => ({
  id: "11111111-1111-4111-8111-" + String(i).padStart(12, "0"),
  title: `Source recipe ${i}`,
  title_ar: `وصفة المصدر ${i}`,
  brew_method: "xbloom",
  visibility: "public",
  recipe_type: i % 2 ? "community" : "official_manufacturer",
  bean_id: i === 0 ? bean.id : null,
  dose_grams: 18,
  water_grams: null,
  total_time_seconds: null,
  source_author_name: "Isolated publisher",
  source_brew_parameters: {
    water_ml: 288,
    ratio: 16,
    grind_size: 48,
    // Vary source and machine independently, so each filter excludes its own rows.
    model: i % 4 < 2 ? "Studio" : "Original",
    pours: [
      {
        volume: 288,
        temperature: 99.44,
        pause_seconds: 0,
        flow_rate: null,
        pattern_code: 2,
      },
    ],
  },
  sources: [
    {
      source_url: "https://source-fixture.test/recipe/" + i,
      source_name: "Isolated publisher",
    },
  ],
  steps: [],
  equipment: [],
  flavor_notes: [],
}));

async function english(page: Page) {
  await page
    .getByRole("button", { name: "تغيير اللغة، العربية", exact: true })
    .click();
  await page.getByRole("button", { name: "English", exact: true }).click();
}
async function response(
  route: Route,
  data: unknown,
  status = 200,
  count?: number,
) {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers:
      count === undefined
        ? {}
        : {
            "content-range": `0-${Math.max(0, (data as unknown[]).length - 1)}/${count}`,
            "access-control-expose-headers": "content-range",
          },
    body: JSON.stringify(data),
  });
}

for (const width of [320, 768]) {
  test(`equipment and roaster details are browsable without signing in at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1024 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://photo-fixture.test/**", (r) => r.abort());
    await page.route("https://mobilefixture.supabase.co/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, [recipes[0]], [bean]);
      if (path.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, [recipes[0]]);
      await response(
        route,
        path.endsWith("/beans")
          ? [bean]
          : path.endsWith("/recipes")
            ? [recipes[0]]
            : path.endsWith("/equipment_models")
              ? [model]
              : path.endsWith("/roasters")
                ? [roaster]
                : path.endsWith("/equipment_review_summary")
                  ? [{ review_count: 0, average_rating: null }]
                  : [],
      );
    });
    await page.goto("/");
    await english(page);
    await page.getByRole("button", { name: "Equipment", exact: true }).click();
    await page.getByRole("button", { name: model.name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Tradeoffs", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Model photo unavailable", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("No published opinions yet. Share the first experience.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Sign in to write a review",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Roasteries", exact: true }).click();
    await page
      .getByRole("button", { name: roaster.name_en, exact: true })
      .click();
    await page.getByRole("button", { name: bean.name_en, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: bean.name_en }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: roaster.name_en }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "Change language, English",
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("full recipe pagination retries a failed page and filters sources and machine models", async ({
  page,
}) => {
  let allowNextPage = false;
  const requestedOffsets: number[] = [];
  const requestedParameters: Record<string, string | null>[] = [];
  await page.route("https://mobilefixture.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    // Keep home and related-coffee reads on the table endpoint.
    if (url.pathname.endsWith('/recipes')) return response(route, recipes.slice(0, 2));
    if (url.pathname.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, recipes);
    if (!url.pathname.endsWith('/rpc/search_public_recipes')) return response(route, []);
    const result = discoveryPage(route, recipes, [bean]);
    const { offset } = result;
    expect(result.limit).toBe(30);
    requestedOffsets.push(offset);
    requestedParameters.push(result.params);
    if (offset === 30 && !allowNextPage)
      return response(route, { message: "Isolated page failure" }, 503);
    return route.fulfill({ status: 200, contentType: 'application/json', headers: result.headers, body: JSON.stringify(result.data) });
  });
  await page.goto("/");
  await english(page);
  await openRecipeLibrary(page, 'en');
  await expect(
    page.getByRole("button", { name: "Source recipe 0", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More recipes", exact: true }).click();
  await expect(
    page.getByText("Could not load recipes.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "More recipes", exact: true }),
  ).toBeDisabled();
  allowNextPage = true;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("button", { name: "More recipes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Source recipe 63", exact: true }),
  ).toBeVisible();
  expect(requestedOffsets[0]).toBe(0);
  expect(
    requestedOffsets.filter((offset) => offset === 30).length,
  ).toBeGreaterThanOrEqual(2);
  expect(requestedOffsets.filter((offset) => offset === 60)).toHaveLength(1);
  await page
    .getByTestId("recipe-catalog")
    .getByRole("button", { name: "xBloom", exact: true })
    .click();
  await page.getByRole("button", { name: "Official", exact: true }).click();
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Source recipe 0", exact: true }),
  ).toBeVisible();
  await expect.poll(() => requestedParameters.some(params => params.p_method === 'xbloom' && params.p_source === 'official' && params.p_model === 'Studio')).toBe(true);
  await expect(page.getByRole('button', { name: 'Source recipe 1', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Source recipe 2', exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Source recipe 0", exact: true })
    .click();
  await expect(page.getByText("288 ml", { exact: true })).toBeVisible();
  await expect(
    page.getByTestId('recipe-source-facts').getByText('99.44°C across pours', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Isolated publisher", exact: true }),
  ).toBeVisible();
});

test("members can save, edit and delete their own equipment opinion with confirmed writes", async ({
  page,
}) => {
  const user = {
    id: "33333333-3333-4333-8333-333333333333",
    aud: "authenticated",
    role: "authenticated",
    email: "review-fixture@example.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-09-01T00:00:00Z",
    identities: [],
    is_anonymous: false,
  };
  const encode = (v: object) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
  let own: Record<string, unknown> | null = null;
  const mutations: string[] = [];
  await page.route("https://mobilefixture.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (path.endsWith('/rpc/search_public_recipes')) return replyDiscovery(route, []);
    if (path.endsWith('/rpc/recipes_for_coffee')) return replyCoffeeRecipes(route, []);
    if (path.endsWith("/token"))
      return response(route, {
        access_token: token,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "isolated_review_fixture",
        user,
      });
    if (path.endsWith("/user")) return response(route, user);
    if (path.endsWith("/equipment_models")) return response(route, [model]);
    if (path.endsWith("/equipment_review_summary"))
      return response(route, [
        { review_count: own ? 1 : 0, average_rating: own ? own.rating : null },
      ]);
    if (path.endsWith("/equipment_reviews")) {
      if (req.method() !== "GET") {
        mutations.push(req.method());
        if (req.method() === "DELETE") own = null;
        else
          own = {
            id: "66666666-6666-4666-8666-666666666666",
            user_id: user.id,
            status: "published",
            created_at: "2026-10-03T00:00:00Z",
            ...req.postDataJSON(),
          };
        return response(route, { id: "66666666-6666-4666-8666-666666666666" });
      }
      return response(
        route,
        url.searchParams.has("user_id") ? own : own ? [own] : [],
      );
    }
    return response(route, []);
  });
  await page.route("https://photo-fixture.test/**", (r) => r.abort());
  await page.goto("/");
  await english(page);
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("isolated-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await page.getByRole("button", { name: model.name, exact: true }).click();
  await page.getByRole("button", { name: "Rate 4/5", exact: true }).click();
  await page
    .getByLabel("Your review", { exact: true })
    .fill("An isolated, useful brewing experience.");
  await page
    .getByRole("button", { name: "Save my review", exact: true })
    .click();
  await expect(
    page.getByText("Your review was saved.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Edit your review", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Your review", { exact: true })
    .fill("Updated isolated brewing experience.");
  await page
    .getByRole("button", { name: "Save my review", exact: true })
    .click();
  await expect(
    page.getByText("Updated isolated brewing experience.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete my review", exact: true })
    .click();
  await expect(
    page.getByText("Your review was deleted.", { exact: true }),
  ).toBeVisible();
  expect(mutations).toEqual(["POST", "PATCH", "DELETE"]);
});
