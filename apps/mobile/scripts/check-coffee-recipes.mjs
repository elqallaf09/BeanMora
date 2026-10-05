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
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const temp = mkdtempSync(tmpdir() + '/beanmora-coffee-recipes-');
mkdirSync(temp + '/core');
after(() => rmSync(temp, { recursive: true, force: true }));
// Import pure query/merge helpers without loading native modules or production configuration.
writeFileSync(temp + '/client.mjs', 'export const supabase = null;\n');
for (const file of [
  'useCoffeeRecipes.ts',
  'data.ts',
  'guards.ts',
  'sourceBrew.ts',
  'manualBrew.ts',
  'sensory.ts',
  'localizedContent.ts',
  'foreignTitles.ts',
  'copy.ts',
  'recipeDiscovery.ts',
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
    .outputText.replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'")
    .replace(
      /from 'react'/g,
      `from '${pathToFileURL(require.resolve('react')).href}'`,
    );
  writeFileSync(temp + '/' + file.replace('.ts', '.mjs'), output);
}
const { coffeeRecipesPageQuery, mergeCoffeeRecipes } = await import(
  pathToFileURL(temp + '/useCoffeeRecipes.mjs').href
);
const { mapRecipe } = await import(pathToFileURL(temp + '/data.mjs').href);
const BEAN = 'a1000000-0000-4000-8000-000000000001';
const PRODUCT = 'b2000000-0000-4000-8000-000000000002';
const coffee = { kind: 'bean', id: BEAN, beanId: BEAN };
const row = (id, extra = {}) => ({
  id,
  title: 'English ' + id,
  title_ar: 'عربي ' + id,
  brew_method: 'v60',
  visibility: 'public',
  bean_id: BEAN,
  roasted_product_id: null,
  steps: [],
  ...extra,
});
function database(fetch) {
  return createClient(
    'https://coffeerecipesfixture.supabase.co',
    'sb_publishable_isolated_coffee_recipe_fixture',
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch },
    },
  );
}
const empty = () =>
  new Response('[]', {
    status: 200,
    headers: { 'content-type': 'application/json', 'content-range': '*/0' },
  });

test('UUID bean queries bind only the ID to the scoped RPC with stable ordering, discovery fields and a 30-row page', async () => {
  let request;
  const db = database(async (url, init) => {
    request = { url: new URL(url), init };
    return new Response(JSON.stringify([row('older-page')]), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'content-range': '30-30/61',
      },
    });
  });
  const controller = new AbortController();
  const result = await coffeeRecipesPageQuery(db, coffee, 1, controller.signal);
  const { url, init } = request;
  assert.equal(url.pathname, '/rest/v1/rpc/recipes_for_coffee');
  assert.equal(init.method, 'POST');
  assert.deepEqual(JSON.parse(init.body), { p_bean_id: BEAN });
  assert.equal(url.searchParams.get('visibility'), 'eq.public');
  assert.equal(url.searchParams.has('bean_id'), false);
  assert.equal(url.searchParams.has('or'), false);
  assert.equal(url.searchParams.get('order'), 'updated_at.desc,id.asc');
  assert.equal(url.searchParams.get('offset'), '30');
  assert.equal(url.searchParams.get('limit'), '30');
  for (const field of [
    'updated_at',
    'source_coffee_name',
    'source_roaster_name',
    'serving_style',
    'source_brew_parameters',
  ]) {
    assert.ok(url.searchParams.get('select').split(',').includes(field));
  }
  assert.match(new Headers(init.headers).get('Prefer'), /count=exact/);
  assert.equal(init.signal, controller.signal);
  assert.equal(result.count, 61);
  assert.equal(result.data[0].id, 'older-page');
});

test('UUID product queries let the server resolve its canonical legacy bean without caller-supplied names or IDs', async () => {
  let url, body;
  const db = database(async (input, init) => {
    url = new URL(input);
    body = JSON.parse(init.body);
    return empty();
  });
  await coffeeRecipesPageQuery(
    db,
    { kind: 'product', id: PRODUCT, beanId: BEAN },
    0,
    new AbortController().signal,
  );
  assert.equal(url.pathname, '/rest/v1/rpc/recipes_for_coffee');
  assert.deepEqual(body, { p_product_id: PRODUCT });
  assert.equal(url.searchParams.has('or'), false);
  assert.equal(url.searchParams.get('visibility'), 'eq.public');
  assert.equal(url.searchParams.has('bean_id'), false);
  assert.equal(url.searchParams.has('roasted_product_id'), false);
  await coffeeRecipesPageQuery(
    db,
    {
      kind: 'product',
      id: PRODUCT,
      beanId: 'malicious,visibility.eq.private',
      name: 'Translated name',
      roaster: 'Untrusted roaster',
    },
    0,
    new AbortController().signal,
  );
  assert.deepEqual(body, { p_product_id: PRODUCT });
});

test('fixture IDs and filter-shaped input stay literal eq values and never enter an OR expression', async () => {
  const urls = [];
  const db = database(async (input) => {
    urls.push(new URL(input));
    return empty();
  });
  const injected = 'fixture,visibility.eq.private,bean_id.not.is.null';
  for (const item of [
    { kind: 'product', id: injected, beanId: BEAN },
    { kind: 'product', id: 'fixture-product', beanId: null },
    { kind: 'bean', id: injected, beanId: injected },
  ]) {
    await coffeeRecipesPageQuery(db, item, 0, new AbortController().signal);
    const url = urls.at(-1);
    assert.equal(url.pathname, '/rest/v1/recipes');
    assert.equal(url.searchParams.has('or'), false);
    assert.equal(url.searchParams.get('visibility'), 'eq.public');
    assert.equal(
      url.searchParams.get(
        item.kind === 'product' ? 'roasted_product_id' : 'bean_id',
      ),
      'eq.' + item.id,
    );
  }
});

test('only scoped RPC rows can carry verified shared associations, with prefetched xBloom preserved by recipe ID', () => {
  const secondCoffee = {
    kind: 'bean',
    id: 'c3000000-0000-4000-8000-000000000003',
    beanId: null,
  };
  const profile = {
    deviceModel: 'Studio',
    grindSetting: '42',
    dose: 15,
    water: 240,
    temp: 92,
    pours: [],
  };
  const shared = row('canonical-shared', {
    source_brew_parameters: {
      discovery: {
        applicable_coffee_names: ['Broadway', 'Brunswick'],
        roaster_name: "Toby's Estate",
      },
    },
  });
  const initial = [
    { ...mapRecipe(shared, 'en'), xBloom: profile },
    mapRecipe(row('unrelated-prefetch'), 'en'),
  ];
  assert.deepEqual(
    mergeCoffeeRecipes(secondCoffee, initial, [shared], 'en'),
    [],
  );
  const scoped = mergeCoffeeRecipes(
    secondCoffee,
    initial,
    [shared, row('private-shared', { visibility: 'private' })],
    'en',
    true,
  );
  assert.deepEqual(
    scoped.map((item) => item.id),
    ['canonical-shared'],
  );
  assert.equal(scoped[0].xBloom, profile);
  assert.equal(scoped[0].beanId, BEAN);
});

test('cancelling a page reaches the actual Supabase request signal', async () => {
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const controller = new AbortController();
  const db = database(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        started(init.signal);
        init.signal.addEventListener(
          'abort',
          () => reject(new DOMException('Cancelled', 'AbortError')),
          { once: true },
        );
      }),
  );
  const pending = Promise.resolve(
    coffeeRecipesPageQuery(db, coffee, 0, controller.signal),
  );
  assert.equal(await ready, controller.signal);
  controller.abort();
  const result = await pending;
  assert.ok(result.error);
  assert.equal(controller.signal.aborted, true);
});

test('merging refreshes localized metadata and deduplicates IDs while retaining xBloom and unseen prefetched recipes', () => {
  const profile = {
    deviceModel: 'Studio',
    grindSetting: '42',
    dose: 15,
    water: 240,
    temp: 92,
    pours: [],
  };
  const initial = [
    mapRecipe(row('retained'), 'en'),
    { ...mapRecipe(row('updated'), 'en'), xBloom: profile },
  ];
  const result = mergeCoffeeRecipes(
    coffee,
    initial,
    [
      row('updated', {
        title_ar: 'عنوان محدّث',
        source_coffee_name: 'Verified source coffee',
        source_brew_parameters: {
          discovery: { coffee_name_ar: 'قهوة المصدر الموثق' },
        },
      }),
      row('older'),
      row('older', { title_ar: 'قديم محدّث' }),
    ],
    'ar',
  );
  assert.deepEqual(
    result.map((item) => item.id),
    ['updated', 'older', 'retained'],
  );
  assert.equal(result[0].title, 'عنوان محدّث');
  assert.equal(result[0].xBloom, profile);
  assert.equal(result[0].discovery.coffeeName, 'قهوة المصدر الموثق');
  assert.equal(result[1].title, 'قديم محدّث');
  assert.equal(initial[1].title, 'English updated');
});

test('both public product associations are retained, unrelated/private/unsupported recipes are rejected', () => {
  const product = { kind: 'product', id: PRODUCT, beanId: BEAN };
  const result = mergeCoffeeRecipes(
    product,
    [mapRecipe(row('private-seed', { visibility: 'private' }), 'en')],
    [
      row('direct-product', { bean_id: null, roasted_product_id: PRODUCT }),
      row('legacy-bean'),
      row('unrelated', { bean_id: 'other' }),
      row('private', { visibility: 'private' }),
      row('unsupported', { brew_method: 'not-a-real-method' }),
    ],
    'en',
  );
  assert.deepEqual(
    result.map((item) => item.id),
    ['direct-product', 'legacy-bean'],
  );
  assert.deepEqual(
    mergeCoffeeRecipes(
      { ...coffee, id: BEAN.toUpperCase() },
      [],
      [row('case')],
      'en',
    ).map((item) => item.id),
    ['case'],
  );
});

test('an empty/error fallback retains existing matching recipes and switching the coffee cannot leak old rows', () => {
  const initial = [mapRecipe(row('known'), 'en')];
  assert.deepEqual(
    mergeCoffeeRecipes(coffee, initial, [], 'en').map((item) => item.id),
    ['known'],
  );
  assert.deepEqual(
    mergeCoffeeRecipes(
      { ...coffee, id: 'another-bean', beanId: 'another-bean' },
      initial,
      [row('old')],
      'en',
    ),
    [],
  );
  assert.equal(
    mergeCoffeeRecipes(coffee, [], [row('bilingual')], 'ar')[0].title,
    'عربي bilingual',
  );
  assert.equal(
    mergeCoffeeRecipes(coffee, [], [row('bilingual')], 'en')[0].title,
    'English bilingual',
  );
});
