import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const temp = mkdtempSync(tmpdir() + '/beanmora-data-');
mkdirSync(temp + '/core');
for (const file of [
  'data.ts',
  'guards.ts',
  'sourceBrew.ts',
  'manualBrew.ts',
  'sensory.ts',
  'localizedContent.ts',
  'foreignTitles.ts',
  'copy.ts',
  'recipeDiscovery.ts',
  'recipeQuickFacts.ts',
  'brewStarter.ts',
  'catalogCache.ts',
  'core/engine.ts',
]) {
  const source = readFileSync(new URL('src/' + file, root), 'utf8');
  const code = ts
    .transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'");
  writeFileSync(temp + '/' + file.replace('.ts', '.mjs'), code);
}
const { loadData, mapRecipe } = await import(
  pathToFileURL(temp + '/data.mjs').href
);

const { sourceBrew } = await import(
  pathToFileURL(temp + '/sourceBrew.mjs').href
);
test('source settings preserve explicit off flags and zero pattern without inventing missing values', () => {
  const source = sourceBrew({
    pours: [
      { volume: 38, pattern_code: 0, vibration_before: 0, vibration_after: 1 },
      { volume: 80, vibration_before: null, vibration_after: 4 },
    ],
  });
  assert.deepEqual(
    source.pours.map((p) => [
      p.pattern_code,
      p.vibration_before,
      p.vibration_after,
    ]),
    [
      [0, 0, 1],
      [null, null, null],
    ],
  );
  assert.equal(source.pours[1].flow_rate, null);
});
const {
  hasCompletePersonality,
  missingPersonalityAttributes,
  publishedFlavorNotes,
  readSensory,
} = await import(pathToFileURL(temp + '/sensory.mjs').href);
const { waterLabel, temperatureLabel } = await import(
  pathToFileURL(temp + '/manualBrew.mjs').href
);
const { recipeQuickFacts } = await import(
  pathToFileURL(temp + '/recipeQuickFacts.mjs').href
);
const { isGeneralBrewGuide } = await import(
  pathToFileURL(temp + '/brewStarter.mjs').href
);
const { encodeCatalog, decodeCatalog, mergeCatalog, CACHE_MAX_AGE, storageFits } = await import(pathToFileURL(temp + '/catalogCache.mjs').href);
function database(tables) {
  return {
    from(name) {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        in() {
          return q;
        },
        or() {
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        then(done) {
          return Promise.resolve({
            data: tables[name] ?? [],
            error: null,
          }).then(done);
        },
      };
      return q;
    },
  };
}
const base = {
  id: 'bean',
  slug: 'bean',
  name_en: 'Real coffee',
  requires_review: false,
  is_published: true,
  roaster: { name_en: 'Roaster', logo_url: 'https://example.test/logo.png' },
  suitable_for_v60: true,
};
test('published flavor notes survive alternate source wording and empty direct arrays', async () => {
  for (const [description, expected] of [
    [
      'Flavour notes: orange, caramel, apple. 250g bag.',
      ['orange', 'caramel', 'apple'],
    ],
    [
      'Tasting notes as stated: peach, cantaloupe, lychee, white grapes, mandarine.',
      ['peach', 'cantaloupe', 'lychee', 'white grapes', 'mandarine'],
    ],
    [
      'Tasting notes as stated by the roaster: pomegranate, jasmine, almond, tangerine, honey.',
      ['pomegranate', 'jasmine', 'almond', 'tangerine', 'honey'],
    ],
    [
      'Aroma: caramel. Flavor: chocolate, nuts. Acidity: low.',
      ['chocolate', 'nuts'],
    ],
    [
      'Roaster states notes "Nutty, Floral, Sweet". Sold pre-ground.',
      ['Nutty', 'Floral', 'Sweet'],
    ],
    [
      'Roaster-stated tasting notes of berries, lavender and black tea.',
      ['berries', 'lavender', 'black tea'],
    ],
    [
      'Raspberry, yellow plum, chamomile, chocolate. Sweetness 4/5.',
      ['Raspberry', 'yellow plum', 'chamomile', 'chocolate'],
    ],
    [
      'Caramel, medium acidity, nuts, dark chocolate. Espresso roast.',
      ['Caramel', 'nuts', 'dark chocolate'],
    ],
    ['إيحاءات النكهة: شوكولاتة، لوز، كراميل.', ['شوكولاتة', 'لوز', 'كراميل']],
  ])
    assert.deepEqual(publishedFlavorNotes([[]], [description]), expected);
  assert.deepEqual(
    publishedFlavorNotes([[], ['jasmine']], ['Flavour notes: citrus.']),
    ['jasmine'],
  );
  assert.deepEqual(
    publishedFlavorNotes([], ['No process, notes or origin published.']),
    [],
  );
  assert.deepEqual(
    publishedFlavorNotes([], ['A fruity coffee, roast level not stated.']),
    [],
  );
  const data = await loadData(
    database({
      beans: [
        {
          ...base,
          flavors: [],
          description_en: 'Flavour notes: orange, caramel, apple.',
        },
      ],
    }),
    'ar',
    null,
  );
  assert.deepEqual(data.coffees[0].flavors, ['orange', 'caramel', 'apple']);
  assert.equal(data.coffees[0].sensory.acidity, undefined);
});
test('approved gallery photos are ordered and never replaced by roaster logos or unapproved assets', async () => {
  const data = await loadData(
    database({
      beans: [
        {
          ...base,
          image_url: 'https://example.test/unapproved.png',
          image_usage_status: 'rights_unknown',
          images: [
            {
              url: 'https://example.test/second.jpg',
              position: 2,
              image_usage_status: 'rights_confirmed',
            },
            {
              url: 'https://example.test/first.jpg',
              position: 0,
              image_usage_status: 'rights_confirmed',
            },
            {
              url: 'https://example.test/removed.jpg',
              position: -1,
              image_usage_status: 'removal_requested',
            },
          ],
        },
      ],
    }),
    'en',
    null,
  );
  assert.equal(data.coffees[0].imageUrl, 'https://example.test/first.jpg');
  assert.deepEqual(data.coffees[0].images, [
    'https://example.test/first.jpg',
    'https://example.test/second.jpg',
  ]);
  const empty = await loadData(database({ beans: [base] }), 'en', null);
  assert.equal(empty.coffees[0].imageUrl, null);
});
test('product origins come from the linked lot and unknown brew quantities stay unknown', async () => {
  const data = await loadData(
    database({
      roasted_products: [
        {
          ...base,
          id: 'product',
          lot: { origin_country: 'Bolivia', process: 'natural' },
          status: 'available',
        },
      ],
      recipes: [
        {
          id: 'recipe',
          title: 'Recipe',
          brew_method: 'xbloom',
          visibility: 'public',
          dose_grams: 18,
          water_grams: 288,
          water_temp_c: 92,
          total_time_seconds: 150,
        },
      ],
    }),
    'en',
    null,
  );
  assert.equal(data.coffees[0].origin, 'Bolivia');
  assert.equal(data.coffees[0].process, 'natural');
  assert.equal(data.recipes[0].temperature, 92);
  assert.equal(data.recipes[0].dose, 18);
  const empty = await loadData(
    database({
      recipes: [
        {
          id: 'recipe',
          title: 'Recipe',
          brew_method: 'v60',
          visibility: 'public',
          dose_grams: null,
          water_grams: null,
          water_temp_c: null,
          total_time_seconds: null,
        },
      ],
    }),
    'en',
    null,
  );
  assert.equal(empty.recipes[0].dose, null);
  assert.equal(empty.recipes[0].temperature, null);
});
test('bounded recipe reads disclose truncation at 200 records', async () => {
  const data = await loadData(
    database({
      recipes: Array.from({ length: 201 }, (_, i) => ({
        id: String(i),
        title: String(i),
        brew_method: 'v60',
        visibility: 'public',
      })),
    }),
    'en',
    null,
  );
  assert.equal(data.recipes.length, 200);
  assert.equal(data.limited, true);
});
test('coffee descriptions keep tasting information without catalog import implementation notes', async () => {
  const data = await loadData(
    database({
      beans: [
        {
          ...base,
          description_en:
            'Tasting notes: jasmine, honey. Altitude stated at 1600-1750 MASL (altitude_meters left null). Roast not mapped to roast_level. Pour over (V60) recommended.',
        },
      ],
    }),
    'en',
    null,
  );
  assert.equal(
    data.coffees[0].description,
    'Tasting notes: jasmine, honey. Pour over (V60) recommended.',
  );
});
test('recipe steps use the chosen language and manual gram pours retain their units and times', () => {
  const row = {
    id: 'recipe',
    title: 'Recipe',
    brew_method: 'chemex',
    visibility: 'public',
    dose_grams: 25,
    water_grams: 400,
    steps: [
      {
        step_number: 1,
        title: 'Bloom',
        title_ar: 'التزهير',
        description: 'Wet coffee',
        description_ar: 'بلّل البن',
      },
    ],
    pours: [
      {
        pour_number: 2,
        water_grams: '350',
        start_at_seconds: 30,
        is_bloom: false,
      },
      { pour_number: 1, water_grams: 50, start_at_seconds: 0, is_bloom: true },
    ],
    source_brew_parameters: { manual: { scalable: true } },
  };
  assert.equal(mapRecipe(row, 'ar').steps[0].description, 'بلّل البن');
  assert.equal(mapRecipe(row, 'en').steps[0].description, 'Wet coffee');
  assert.deepEqual(mapRecipe(row, 'en').pours[0], {
    number: 1,
    grams: 50,
    at: 0,
    bloom: true,
  });
  assert.equal(mapRecipe(row, 'ar').sourceBrew.manual.scalable, true);
});
test('sensory intensity needs provenance and an explicit original scale, never a flavor inference', async () => {
  assert.deepEqual(
    readSensory({ source_url: 'https://example.test/coffee', acidity: 3 }),
    { sourceUrl: 'https://example.test/coffee' },
  );
  assert.deepEqual(readSensory({ scale_max: 5, acidity: 3 }), {
    sourceUrl: null,
  });
  assert.deepEqual(
    readSensory({
      source_url: 'javascript:alert(1)',
      scale_max: 5,
      acidity: 3,
    }),
    { sourceUrl: null },
  );
  const profile = readSensory({
    source_url: 'https://example.test/coffee',
    scale_max: 10,
    acidity: 8.5,
    sweetness: 11,
    body: -1,
  });
  assert.deepEqual(profile.acidity, { value: 8.5, max: 10 });
  assert.equal(profile.sweetness, undefined);
  assert.equal(profile.body, undefined);
  const data = await loadData(
    database({
      beans: [{ ...base, acidity_level: 4, flavors: [{ flavor: 'Citrus' }] }],
    }),
    'en',
    null,
  );
  assert.equal(data.coffees[0].sensory.acidity, undefined);
});
test('source-linked gallery requires provenance and reports actual artwork kind without claiming rights', async () => {
  const gallery = {
    url: 'https://example.test/art.jpg',
    position: 0,
    image_usage_status: 'source_linked',
  };
  const withSource = await loadData(
    database({
      beans: [
        {
          ...base,
          source_url: 'https://example.test/coffee',
          image_kind: 'product_artwork',
          images: [gallery],
        },
      ],
    }),
    'en',
    null,
  );
  assert.equal(withSource.coffees[0].imageUrl, gallery.url);
  assert.equal(withSource.coffees[0].imageKind, 'product_artwork');
  const withoutSource = await loadData(
    database({ beans: [{ ...base, images: [gallery] }] }),
    'en',
    null,
  );
  assert.equal(withoutSource.coffees[0].imageUrl, null);
});
test('espresso yield and source ranges stay separate from input water and retain calculation disclosure', () => {
  const espresso = mapRecipe(
    {
      id: 'espresso',
      title: 'Espresso',
      brew_method: 'espresso',
      visibility: 'public',
      dose_grams: 18,
      water_grams: null,
      source_brew_parameters: {
        manual: {
          yield_grams: 36,
          yield_derived_from_ratio: true,
          time_min_seconds: 25,
          time_max_seconds: 30,
        },
      },
    },
    'en',
  );
  assert.equal(espresso.water, null);
  assert.equal(waterLabel(espresso), '36 g (calculated)');
  const filter = mapRecipe(
    {
      id: 'filter',
      title: 'Filter',
      brew_method: 'pour_over',
      visibility: 'public',
      dose_grams: 15,
      water_grams: null,
      water_temp_c_min: 90,
      water_temp_c_max: 94,
      source_brew_parameters: {
        manual: { water_min_ml: 240, water_max_ml: 260 },
      },
    },
    'en',
  );
  assert.equal(filter.water, null);
  assert.equal(waterLabel(filter), '240–260 ml');
  assert.equal(temperatureLabel(filter), '90–94°C');
});
test('exact public links make additional brew methods discoverable without attaching unrelated or private recipes', async () => {
  const data = await loadData(
    database({
      beans: [{ ...base, suitable_for_v60: false }],
      recipes: [
        {
          id: 'april',
          title: 'April',
          brew_method: 'april',
          visibility: 'public',
          bean_id: 'bean',
        },
        {
          id: 'orea',
          title: 'Other coffee',
          brew_method: 'orea',
          visibility: 'public',
          bean_id: 'different',
        },
        {
          id: 'private',
          title: 'Private',
          brew_method: 'switch',
          visibility: 'private',
          bean_id: 'bean',
        },
      ],
    }),
    'en',
    null,
    'april',
  );
  assert.deepEqual(data.coffees[0].methods, ['april']);
});
test('recipe cover kind is used only for the exact provenance image, preserving existing covers', () => {
  const row = {
    id: 'r',
    title: 'Recipe',
    brew_method: 'v60',
    visibility: 'public',
    cover_image_url: 'https://example.test/coffee.png',
    source_brew_parameters: {
      global_roasters_import: {
        photo_url: 'https://example.test/coffee.png',
        photo_kind: 'product_artwork',
      },
    },
  };
  assert.equal(mapRecipe(row, 'en').coverKind, 'product_artwork');
  assert.equal(
    mapRecipe(
      { ...row, cover_image_url: 'https://example.test/existing-cover.jpg' },
      'en',
    ).coverKind,
    undefined,
  );
});
test('xBloom source program supplies real dose, ml water, grind and per-pour temperatures without inventing a time', () => {
  const recipe = mapRecipe(
    {
      id: 'xb',
      title: 'Source program',
      brew_method: 'xbloom',
      visibility: 'public',
      source_brew_parameters: {
        dose: 15,
        water_ml: 225,
        grind_size: 60,
        pours: [
          { volume: 50, temperature: 88 },
          { volume: 70, temperature: 87 },
          { volume: 75, temperature: 87 },
          { volume: 30, temperature: 85 },
        ],
      },
    },
    'en',
  );
  assert.equal(recipe.dose, 15);
  assert.equal(recipe.waterUnit, 'ml');
  assert.equal(recipe.grindSetting, '60');
  assert.equal(temperatureLabel(recipe), '85–88°C across pours');
  assert.equal(recipe.seconds, null);
  const facts = recipeQuickFacts(recipe);
  assert.equal(facts.find((f) => f.key === 'water').value, '225 ml');
  assert.equal(
    facts.find((f) => f.key === 'time'),
    undefined,
  );
  assert.equal(
    facts.some((f) => f.value === '—'),
    false,
  );
  assert.equal(temperatureLabel({ ...recipe, temperature: 92 }), '92°C');
});
test('source descriptions remain qualitative and require a safe provenance link', () => {
  const profile = readSensory({
    source_url: 'https://example.test/archive',
    body_description: 'Full-bodied',
    body_description_ar: 'ممتلئ',
  });
  assert.deepEqual(profile.descriptions.body, {
    en: 'Full-bodied',
    ar: 'ممتلئ',
  });
  assert.equal(profile.body, undefined);
  assert.equal(
    readSensory({ body_description: 'Full-bodied' }).descriptions,
    undefined,
  );
});
test('a complete personality requires sourced notes, acidity, sweetness and body, including valid zero scores', () => {
  const partial = readSensory({
    source_url: 'https://example.test/coffee',
    scale_max: 5,
    acidity: 0,
    sweetness: 4,
  });
  assert.deepEqual(missingPersonalityAttributes(partial), ['body']);
  assert.equal(hasCompletePersonality(['Cocoa'], partial), false);
  const complete = readSensory({
    source_url: 'https://example.test/coffee',
    scale_max: 5,
    acidity: 0,
    sweetness: 4,
    body_description: 'Silky',
    body_description_ar: 'حريري',
  });
  assert.equal(hasCompletePersonality(['Cocoa'], complete), true);
  assert.equal(hasCompletePersonality([], complete), false);
  assert.equal(hasCompletePersonality(['  '], complete), false);
  assert.equal(
    hasCompletePersonality(['Cocoa'], {
      ...complete,
      sourceUrl: 'javascript:alert(1)',
    }),
    false,
  );
  const unsupported = readSensory({
    source_url: 'https://example.test/coffee',
    acidity: 3,
    sweetness: 4,
    body: 3,
  });
  assert.equal(hasCompletePersonality(['Cocoa'], unsupported), false);
});
test('general starters cannot relabel another coffee, a shared-coffee guide or an xBloom device profile', () => {
  const row = {
    id: 'general',
    title: 'General guide',
    brew_method: 'v60',
    visibility: 'public',
    bean_id: null,
    roasted_product_id: null,
    recipe_type: 'official_manufacturer',
    dose_grams: 15,
    water_grams: 250,
    steps: [
      { step_number: 1, title: 'Pour', description: 'Follow the source' },
    ],
    sources: [
      {
        source_url: 'https://example.test/guide',
        source_name: 'Publisher',
        data_confidence: 'official',
      },
    ],
  };
  assert.equal(isGeneralBrewGuide(mapRecipe(row, 'en')), true);
  for (const extra of [
    { bean_id: 'another-coffee' },
    { roasted_product_id: 'another-product' },
    { source_coffee_name: 'Specific coffee' },
    {
      source_brew_parameters: {
        manual: { applies_to_coffee_names: ['Specific coffee'] },
      },
    },
    {
      source_brew_parameters: {
        discovery: { applicable_coffee_names: ['Specific coffee'] },
      },
    },
    { brew_method: 'xbloom' },
    { visibility: 'private' },
    { sources: [] },
  ])
    assert.equal(
      isGeneralBrewGuide(mapRecipe({ ...row, ...extra }, 'en')),
      false,
    );
});

test('public cache survives offline reads without storing an account profile or saved IDs', async () => {
  const bundle = await loadData(database({ beans: [base] }), 'en', null);
  bundle.profile.flavors = ['chocolate'];
  bundle.savedBeanIds = ['private-saved-id'];
  const encoded = encodeCatalog(bundle, 'project-a', 'en', 1000);
  assert.ok(encoded);
  assert.equal(encoded.includes('private-saved-id'), false);
  assert.equal(Object.hasOwn(JSON.parse(encoded).data, 'profile'), false);
  const restored = decodeCatalog(encoded, 'project-a', 'en', 1001);
  assert.equal(restored.data.coffees[0].name, 'Real coffee');
  assert.deepEqual(restored.data.savedBeanIds, []);
  assert.deepEqual(restored.data.profile.flavors, []);
});
test('public cache rejects a different project, language, future timestamp, expired or malformed content', async () => {
  const bundle = await loadData(database({ beans: [base] }), 'en', null);
  const encoded = encodeCatalog(bundle, 'project-a', 'en', 1000);
  for (const [project, locale, now] of [['project-b', 'en', 1001], ['project-a', 'ar', 1001], ['project-a', 'en', 999], ['project-a', 'en', 1001 + CACHE_MAX_AGE]]) {
    assert.equal(decodeCatalog(encoded, project, locale, now), null);
  }
  for (const corrupt of ['{', JSON.stringify({ ...JSON.parse(encoded), data: { ...bundle, coffees: [null] } }), JSON.stringify({ ...JSON.parse(encoded), data: { ...bundle, recipes: [{ public: false }] } })]) {
    assert.equal(decodeCatalog(corrupt, 'project-a', 'en', 1001), null);
  }
});
test('failed public sections retain last-good data; successful empty reads remove old rows', async () => {
  const old = await loadData(database({ beans: [base] }), 'en', null);
  const empty = await loadData(database({}), 'en', null);
  const partial = { ...empty, failures: { beans: true, products: false, recipes: false, profiles: false, personal: false }, warnings: true };
  assert.equal(mergeCatalog(partial, old).coffees[0].id, base.id);
  assert.equal(encodeCatalog(partial, 'project', 'en', Date.now()), null);
  assert.deepEqual(mergeCatalog(empty, old).coffees, []);
  assert.deepEqual(mergeCatalog(empty, old).recipes, []);
});

test('device storage budgets count Arabic and emoji UTF-8 bytes, not only character count', () => {
  assert.equal(storageFits('a'.repeat(760_000)), true);
  assert.equal(storageFits('ع'.repeat(760_000)), false);
  assert.equal(storageFits('☕'.repeat(510_000)), false);
  assert.equal(storageFits('😀'.repeat(380_000)), false);
});

function controlledDatabase(rows, gates = new Map(), counts = new Map()) {
  return {
    from(name) {
      const filters = {};
      const query = {
        select() { return query; }, in() { return query; }, is() { return query; },
        or() { return query; }, order() { return query; }, limit() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        then(done, reject) {
          counts.set(name, (counts.get(name) ?? 0) + 1);
          return Promise.resolve(gates.get(name)).then(() => ({
            data: typeof rows[name] === 'function' ? rows[name](filters) : rows[name] ?? [],
            error: null,
          })).then(done, reject);
        },
      };
      return query;
    },
  };
}
test('coffee previews render before recipes/account reads; locale changes share public work and isolate owners', async () => {
  let releaseRecipes, releasePersonal;
  const recipeGate = new Promise(resolve => { releaseRecipes = resolve; });
  const personalGate = new Promise(resolve => { releasePersonal = resolve; });
  const counts = new Map();
  const db = controlledDatabase({
    beans: [{ ...base, name_ar: 'بن سريع', name_en: 'Quick coffee' }],
    user_preferences: filters => [{ preferred_flavors: [filters.user_id], preferred_brew_methods: [] }],
    bean_saves: filters => [{ bean_id: filters.user_id + '-saved' }],
  }, new Map([['recipes', recipeGate], ['user_preferences', personalGate]]), counts);
  const stages = [];
  let coffeeReady, publicReady;
  const firstCoffee = new Promise(resolve => { coffeeReady = resolve; });
  const firstPublic = new Promise(resolve => { publicReady = resolve; });
  const en = loadData(db, 'en', 'owner-a', undefined, {
    onPublicReady: (bundle, complete) => {
      stages.push({ bundle, complete });
      if (complete) publicReady(); else coffeeReady();
    },
  });
  const ar = loadData(db, 'ar', 'owner-b');
  try {
    await firstCoffee;
    assert.equal(stages[0].bundle.coffees[0].name, 'Quick coffee');
    assert.deepEqual(stages[0].bundle.profile.flavors, []);
    assert.deepEqual(stages[0].bundle.savedBeanIds, []);
    assert.equal(counts.get('beans'), 1);
    assert.equal(counts.get('recipes'), 2); // Global + coffee-linked reads, shared by both locales.
    releaseRecipes();
    await firstPublic;
    assert.deepEqual(stages.at(-1).bundle.profile.flavors, []);
    releasePersonal();
    const [english, arabic] = await Promise.all([en, ar]);
    assert.equal(arabic.coffees[0].name, 'بن سريع');
    assert.deepEqual(english.profile.flavors, ['owner-a']);
    assert.deepEqual(arabic.profile.flavors, ['owner-b']);
    assert.deepEqual(english.savedBeanIds, ['owner-a-saved']);
    assert.deepEqual(arabic.savedBeanIds, ['owner-b-saved']);
    const guest = await loadData(db, 'en', null);
    assert.deepEqual(guest.profile.flavors, []);
    assert.deepEqual(guest.savedBeanIds, []);
    assert.equal(counts.get('beans'), 1);
    await loadData(db, 'en', null, undefined, { publicRevision: 1 });
    assert.equal(counts.get('beans'), 2); // Explicit refresh bypasses a fresh shared result.
  } finally { releaseRecipes(); releasePersonal(); }
});
test('public memory snapshots expire and failed reads retry without caching account data', async context => {
  let clock = 1_000_000;
  context.mock.method(Date, 'now', () => clock);
  const counts = new Map();
  let beanRows = [{ ...base }];
  const db = controlledDatabase({ beans: () => beanRows }, new Map(), counts);
  await loadData(db, 'en', null);
  clock += 300_001;
  await loadData(db, 'ar', null);
  assert.equal(counts.get('beans'), 2);
  beanRows = null;
  const failed = await loadData(db, 'en', null, undefined, { publicRevision: 2 });
  assert.equal(failed.failures.beans, true);
  beanRows = [{ ...base }];
  const restored = await loadData(db, 'en', null, undefined, { publicRevision: 2 });
  assert.equal(restored.failures.beans, false);
  assert.equal(restored.coffees.length, 1);
  assert.equal(counts.get('beans'), 4);
});
