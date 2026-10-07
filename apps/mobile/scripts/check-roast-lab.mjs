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
const temp = mkdtempSync(tmpdir() + '/beanmora-roast-');
mkdirSync(temp + '/core');
after(() => rmSync(temp, { recursive: true, force: true }));
for (const file of [
  'roastLab.ts',
  'guards.ts',
  'core/catalog-names.ts', 'core/catalog-foreign-titles.ts', 'localizedContent.ts',
  'foreignTitles.ts',
  'copy.ts',
  'core/engine.ts',
  'core/equipment-facts.ts', 'catalog.ts',
]) {
  const source = readFileSync(
    new URL('../src/' + file, import.meta.url),
    'utf8',
  );
  const code = ts
    .transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/from (["'])(\.\/[^"']+)\1/g, "from '$2.mjs'");
  writeFileSync(temp + '/' + file.replace('.ts', '.mjs'), code);
}
const {
  parseRoastTime,
  parseRoastNumber,
  validRoastDate,
  roastMetrics,
  validateRoastSeries,
} = await import(pathToFileURL(temp + '/roastLab.mjs').href);
const { catalogName, localizeStep } = await import(
  pathToFileURL(temp + '/localizedContent.mjs').href
);
const { reviewedFacts } = await import(
  pathToFileURL(temp + '/catalog.mjs').href
);
const event = (event_type, elapsed_seconds, bean_temp_c = null) => ({
  event_type,
  elapsed_seconds,
  bean_temp_c,
});
test('Arabic numbers, zero charge and strict time/date limits retain missing measurements', () => {
  assert.equal(parseRoastTime('٠:٠٠'), 0);
  assert.equal(parseRoastTime('۱۰:۳۰'), 630);
  assert.equal(parseRoastTime('1:59'), 119);
  for (const value of ['', '1:60', '-1', '10:5.5', '4800:01', '1:2:3'])
    assert.equal(parseRoastTime(value), null);
  assert.equal(parseRoastNumber('-١٢٫٥'), -12.5);
  assert.equal(parseRoastNumber('0'), 0);
  assert.equal(parseRoastNumber('not measured'), null);
  assert.equal(validRoastDate('2024-02-29'), true);
  assert.equal(validRoastDate('2026-02-29'), false);
  assert.equal(validRoastDate('2026-02-30'), false);
});
test('actual events calculate roast phases and keep unknown development and weight loss', () => {
  assert.deepEqual(
    roastMetrics({
      events: [
        event('charge', 0),
        event('dry_end', 240),
        event('first_crack_start', 480),
        event('drop', 600),
      ],
      total_time_seconds: 600,
      green_weight_g: 500,
      roasted_weight_g: 415,
    }),
    {
      total: 600,
      drying: 240,
      maillard: 240,
      development: 120,
      dtr: 20,
      loss: 17,
    },
  );
  assert.deepEqual(
    roastMetrics({
      events: [],
      total_time_seconds: null,
      green_weight_g: 500,
      roasted_weight_g: null,
    }),
    {
      total: null,
      drying: null,
      maillard: null,
      development: null,
      dtr: null,
      loss: null,
    },
  );
  const incomplete = roastMetrics({
    events: [event('first_crack_start', 480)],
    total_time_seconds: 600,
    green_weight_g: 500,
    roasted_weight_g: 600,
  });
  assert.equal(incomplete.dtr, null);
  assert.equal(incomplete.loss, null);
});
test('rejects duplicated or conflicting stages and out-of-range measured points', () => {
  const valid = [
    event('charge', 0, 180),
    event('dry_end', 240, 155),
    event('first_crack_start', 480, 195),
    event('drop', 600, 210),
  ];
  assert.equal(validateRoastSeries(valid, 600), true);
  assert.equal(validateRoastSeries(valid, 650), false);
  assert.equal(validateRoastSeries([...valid, event('drop', 600)], 600), false);
  assert.equal(validateRoastSeries([event('charge', 5)], 600), false);
  assert.equal(
    validateRoastSeries(
      [event('first_crack_start', 240), event('dry_end', 480)],
      600,
    ),
    false,
  );
  assert.equal(
    validateRoastSeries(valid, 600, [
      { elapsed_seconds: 601, bean_temp_c: 200 },
    ]),
    false,
  );
  assert.equal(
    validateRoastSeries(valid, 600, [
      { elapsed_seconds: 100, bean_temp_c: 500 },
    ]),
    false,
  );
  assert.equal(
    validateRoastSeries(
      valid,
      600,
      [],
      [{ elapsed_seconds: 700, control_type: 'power', value: 80, unit: '%' }],
    ),
    false,
  );
});
test('catalog display retains model identifiers and translates foreign recipe titles', () => {
  assert.equal(catalogName('Brazilian V60 recipe', 'ar'), 'برازيلي V60 وصفة');
  assert.equal(catalogName('xBloom Studio 18g', 'ar'), 'xBloom ستوديو 18g');
  assert.equal(catalogName('衣索比亞 日曬', 'ar'), 'إثيوبيا — معالجة طبيعية');
  assert.equal(catalogName('Brazil', 'en'), 'Brazil');
  const step = localizeStep(
    'Pour 1',
    'Water: 38.0 ml; source temperature: 95.0; flow: 3.3 ml/s; pause: 20 s. Check the original link for pouring pattern.',
    'ar',
  );
  assert.equal(step.title, 'الصبة 1');
  assert.match(step.description, /38.0 مل/);
  assert.match(step.description, /3.3 مل\/ث/);
  const unknownFlow = localizeStep(
    'Pour 2',
    'Water: 80 ml; source temperature: 95; flow: unspecified ml/s; pause: 10 s. Check the original link for pouring pattern.',
    'ar',
  );
  assert.match(unknownFlow.description, /التدفق: غير منشور/);
  assert.doesNotMatch(unknownFlow.description, /unspecified|°C/);
});
test('comparison never presents stale prices or arbitrary raw JSON as reviewed specs', () => {
  assert.deepEqual(
    reviewedFacts(
      {
        specifications: {
          price_usd: 100,
          capacity: 999,
          notes_on_source: 'Internal import note',
        },
      },
      'ar',
    ),
    [],
  );
  const specifications = {
    catalog: {
      schema_version: 1,
      facts: {
        capacity: ['2000 غ', '2000 g'],
        price_usd: ['100', '100'],
        burr_type: { unexpected: 'object' },
      },
    },
  };
  assert.deepEqual(reviewedFacts({ specifications }, 'ar'), [
    { key: 'capacity', label: 'السعة المنشورة', value: '2000 غ' },
  ]);
});
