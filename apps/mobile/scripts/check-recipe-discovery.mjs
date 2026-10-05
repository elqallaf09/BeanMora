import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';

const temp = mkdtempSync(tmpdir() + '/beanmora-discovery-');
mkdirSync(temp + '/core');
after(() => rmSync(temp, { recursive: true, force: true }));
for (const file of [
  'localizedContent.ts',
  'foreignTitles.ts',
  'copy.ts',
  'recipeDiscovery.ts',
  'guards.ts',
  'core/engine.ts',
]) {
  const source = readFileSync(
    new URL('../src/' + file, import.meta.url),
    'utf8',
  );
  const output = ts
    .transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'");
  writeFileSync(temp + '/' + file.replace('.ts', '.mjs'), output);
}
const {
  emptyRecipeFilters,
  recipeFilterCount,
  recipeSearchParams,
  recipePageQuery,
  readRecipeDiscovery,
} = await import(pathToFileURL(temp + '/recipeDiscovery.mjs').href);
const search = (filters = {}) => ({
  query: '',
  method: undefined,
  source: 'all',
  model: 'all',
  filters: { ...emptyRecipeFilters(), ...filters },
});

test('all discovery fields become independent bound parameters without filter-string interpolation', () => {
  const criteria = search({
    flavorNote: 'orange blossom',
    flavorFamily: 'floral',
    creatorName: "O'Neil",
    creatorCountry: 'United States',
    recipeCountry: 'Japan',
    recipeName: 'A 100% recipe',
    servingStyle: 'iced',
    coffeeType: 'Bourbon',
    coffeeName: 'Coffee_1',
    coffeeOrigin: 'Kenya',
    roasterName: 'Roaster, Inc.',
    sourceName: 'source.example/guide',
  });
  criteria.query = "coffee'),visibility.eq.private,or=(name.ilike.%)";
  const args = recipeSearchParams(criteria);
  assert.deepEqual(args, {
    p_query: criteria.query,
    p_method: null,
    p_source: null,
    p_model: null,
    p_flavor_note: 'orange blossom',
    p_flavor_family: 'floral',
    p_creator_name: "O'Neil",
    p_creator_country: 'United States',
    p_recipe_country: 'Japan',
    p_recipe_name: 'A 100% recipe',
    p_serving_style: 'iced',
    p_coffee_type: 'Bourbon',
    p_coffee_name: 'Coffee_1',
    p_coffee_origin: 'Kenya',
    p_roaster_name: 'Roaster, Inc.',
    p_source_name: 'source.example/guide',
  });
});

test('trims and bounds input without stripping Arabic, accents, or literal punctuation', () => {
  const criteria = search({
    creatorName: '  جيمس هوفمان  ',
    recipeName: '   ',
  });
  criteria.query = '  قَهْوَة café_%  ';
  assert.equal(recipeSearchParams(criteria).p_query, 'قَهْوَة café_%');
  assert.equal(recipeSearchParams(criteria).p_creator_name, 'جيمس هوفمان');
  assert.equal(recipeSearchParams(criteria).p_recipe_name, null);
  criteria.query = 'a'.repeat(500);
  assert.equal(recipeSearchParams(criteria).p_query.length, 160);
});

test('preserves method and official/community filters; xBloom model cannot restrict another method', () => {
  const criteria = {
    ...search(),
    method: 'xbloom',
    source: 'official',
    model: 'Studio',
  };
  assert.equal(recipeSearchParams(criteria).p_model, 'Studio');
  assert.equal(recipeSearchParams(criteria).p_source, 'official');
  criteria.method = 'chemex';
  criteria.source = 'community';
  assert.equal(recipeSearchParams(criteria).p_model, null);
  assert.equal(recipeSearchParams(criteria).p_method, 'chemex');
  assert.equal(recipeSearchParams(criteria).p_source, 'community');
});

test('filter count ignores blank fields and reset objects are independent', () => {
  const first = emptyRecipeFilters();
  first.flavorNote = '   ';
  first.creatorCountry = 'Kuwait';
  first.servingStyle = 'hot';
  assert.equal(recipeFilterCount(first), 2);
  assert.equal(recipeFilterCount(emptyRecipeFilters()), 0);
});

test('unknown recipe/creator countries and serving style never inherit coffee origin or temperature', () => {
  const row = {
    source_origin_country: 'Ethiopia',
    source_author_name: 'Named creator',
    serving_style: 'unknown',
    water_temp_c: 96,
    source_brew_parameters: { water_ml: 250 },
    flavor_notes: [],
  };
  const result = readRecipeDiscovery(row, 'en');
  assert.equal(result.coffeeOrigin, 'Ethiopia');
  assert.equal(result.creatorCountry, null);
  assert.equal(result.recipeCountry, null);
  assert.equal(result.servingStyle, '');
  assert.deepEqual(result.flavorNotes, []);
  assert.deepEqual(result.flavorFamilies, []);
});

test('bilingual metadata keeps the three country meanings separate and accepts only safe source links', () => {
  const row = {
    source_brew_parameters: {
      discovery: {
        creator_name: 'A creator',
        creator_name_ar: 'صانع الوصفة',
        creator_country: 'Norway',
        creator_country_ar: 'النرويج',
        recipe_country: 'Japan',
        recipe_country_ar: 'اليابان',
        coffee_origin: 'Kenya',
        coffee_origin_ar: 'كينيا',
        coffee_type: 'SL28',
        coffee_name: 'Coffee lot',
        roaster_name: 'A roaster',
        flavor_notes: ['jasmine', 'lemon'],
        flavor_notes_ar: ['ياسمين', 'ليمون'],
        flavor_families: ['floral', 'citrus'],
        serving_style: 'iced',
        source_urls: [
          'https://source-fixture.test/recipe',
          'javascript:alert(1)',
          'http://unsafe.test',
          'https://user:secret@unsafe.test',
        ],
      },
    },
  };
  const ar = readRecipeDiscovery(row, 'ar');
  assert.equal(ar.creatorName, 'صانع الوصفة');
  assert.equal(ar.creatorCountry, 'النرويج');
  assert.equal(ar.recipeCountry, 'اليابان');
  assert.equal(ar.coffeeOrigin, 'كينيا');
  assert.equal(ar.servingStyle, 'iced');
  assert.deepEqual(ar.flavorNotes, ['ياسمين', 'ليمون']);
  assert.deepEqual(ar.flavorFamilies, ['citrus', 'floral']);
  assert.deepEqual(ar.sourceUrls, ['https://source-fixture.test/recipe']);
  assert.deepEqual(readRecipeDiscovery(row, 'en').flavorNotes, [
    'jasmine',
    'lemon',
  ]);
});

test('malformed discovery values stay absent and existing source columns remain usable', () => {
  const row = {
    source_coffee_name: 'Lot A',
    source_roaster_name: 'Roaster A',
    source_varietal: 'Geisha',
    source_tasting_notes: 'Peach, jasmine',
    serving_style: 'hot',
    source_brew_parameters: {
      discovery: {
        creator_country: ['not a country'],
        recipe_country: 123,
        flavor_notes: 'not an array',
        serving_style: 'iced',
      },
    },
  };
  const result = readRecipeDiscovery(row, 'en');
  assert.equal(result.creatorCountry, null);
  assert.equal(result.recipeCountry, null);
  assert.equal(result.coffeeName, 'Lot A');
  assert.equal(result.roasterName, 'Roaster A');
  assert.equal(result.coffeeType, 'Geisha');
  assert.equal(result.servingStyle, 'hot');
  assert.deepEqual(result.flavorNotes, ['Peach', 'jasmine']);
});

test('shared coffee names use only verified string arrays with bilingual fallback', () => {
  const row = {
    source_brew_parameters: {
      discovery: {
        applicable_coffee_names: [
          'Brazil Inacio Urban',
          'Ethiopia Jigesa',
          null,
          123,
          { name: 'Not verified' },
          'Ethiopia Jigesa',
        ],
        applicable_coffee_names_ar: [
          'البرازيل إناسيو أوربان',
          'إثيوبيا جيجيسا',
        ],
      },
    },
  };
  assert.deepEqual(readRecipeDiscovery(row, 'en').applicableCoffeeNames, [
    'Brazil Inacio Urban',
    'Ethiopia Jigesa',
  ]);
  assert.deepEqual(readRecipeDiscovery(row, 'ar').applicableCoffeeNames, [
    'البرازيل إناسيو أوربان',
    'إثيوبيا جيجيسا',
  ]);
  row.source_brew_parameters.discovery.applicable_coffee_names_ar = [];
  assert.deepEqual(readRecipeDiscovery(row, 'ar').applicableCoffeeNames, [
    'Brazil Inacio Urban',
    'Ethiopia Jigesa',
  ]);
  for (const discovery of [
    {},
    { applicable_coffee_names: 'Not an array' },
    { applicable_coffee_names: [false, { name: 'Not verified' }] },
  ]) {
    const guide = {
      source_coffee_name: 'A primary source name',
      source_brew_parameters: {
        discovery,
        manual: {
          also_applies_to_coffees: ['Unpromoted name'],
          applies_to_coffee_names: ['Another unpromoted name'],
        },
      },
    };
    assert.deepEqual(
      readRecipeDiscovery(guide, 'en').applicableCoffeeNames,
      [],
    );
  }
});

function database(fetch) {
  // This client cannot reach production: every request uses the supplied local
  // fetch function and all configuration is an explicit synthetic fixture.
  return createClient(
    'https://discoveryfixture.supabase.co',
    'sb_publishable_isolated_unit_fixture',
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch },
    },
  );
}
test('page queries use the RPC, exact total, stable order and server-side range with an abort signal', async () => {
  const requests = [];
  const db = database(async (url, init) => {
    requests.push({ url: new URL(url), init });
    return new Response(
      JSON.stringify([{ id: 'isolated-page-row', title: 'Page two' }]),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-range': '30-30/61',
        },
      },
    );
  });
  const controller = new AbortController();
  const criteria = search({
    creatorCountry: 'Norway',
    coffeeOrigin: 'Kenya',
    servingStyle: 'hot',
  });
  criteria.query = "literal_%'";
  const result = await recipePageQuery(
    db,
    criteria,
    1,
    'id,title,sources:recipe_sources(source_name)',
    controller.signal,
  );
  const { url, init } = requests[0];
  assert.equal(requests.length, 1);
  assert.equal(url.pathname, '/rest/v1/rpc/search_public_recipes');
  assert.equal(init.method, 'POST');
  assert.deepEqual(JSON.parse(init.body), recipeSearchParams(criteria));
  assert.equal(url.searchParams.get('offset'), '30');
  assert.equal(url.searchParams.get('limit'), '30');
  assert.equal(url.searchParams.get('order'), 'updated_at.desc,id.asc');
  assert.equal(
    url.searchParams.get('select'),
    'id,title,sources:recipe_sources(source_name),updated_at',
  );
  assert.equal(url.searchParams.has('or'), false);
  assert.match(
    new Headers(init.headers).get('Prefer'),
    /(?:^|,\s*)count=exact(?:,|$)/,
  );
  assert.equal(init.signal, controller.signal);
  assert.equal(result.count, 61);
  assert.equal(result.data[0].id, 'isolated-page-row');
});

test('RPC projection retains both top-level sort keys without duplicating selected keys or confusing nested fields', async () => {
  const selections = [];
  const db = database(async (url) => {
    selections.push(new URL(url).searchParams.get('select'));
    return new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': '*/0' },
    });
  });
  for (const [fields, expected] of [
    ['title', 'title,id,updated_at'],
    ['id,title,updated_at', 'id,title,updated_at'],
    [
      'title,sources:recipe_sources(id,updated_at,source_name)',
      'title,sources:recipe_sources(id,updated_at,source_name),id,updated_at',
    ],
    ['*', '*'],
  ]) {
    await recipePageQuery(
      db,
      search(),
      0,
      fields,
      new AbortController().signal,
    );
    assert.equal(selections.at(-1), expected);
  }
});

test('RPC errors remain errors so the catalog can retry without treating them as an empty result', async () => {
  const db = database(
    async () =>
      new Response(
        JSON.stringify({
          code: 'fixture_error',
          message: 'Isolated request failed',
        }),
        {
          status: 503,
          headers: { 'content-type': 'application/json' },
        },
      ),
  );
  const result = await recipePageQuery(
    db,
    search(),
    0,
    'id,title',
    new AbortController().signal,
  );
  assert.equal(result.data, null);
  assert.equal(result.error.message, 'Isolated request failed');
});
