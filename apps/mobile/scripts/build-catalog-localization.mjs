// Offline, reproducible display translations. No private member data is read.
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const [snapshotPath, outputPath] = process.argv.slice(2);
if (!snapshotPath || !outputPath)
  throw new Error('Provide catalog snapshot and output directory');
const temp = mkdtempSync(tmpdir() + '/beanmora-locales-');
mkdirSync(temp + '/core');
for (const file of [
  'core/catalog-names.ts', 'core/catalog-foreign-titles.ts', 'localizedContent.ts',
  'foreignTitles.ts',
  'copy.ts',
  'core/engine.ts',
]) {
  const code = ts
    .transpileModule(
      readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      },
    )
    .outputText.replace(/from (["'])(\.\/[^"']+)\1/g, "from '$2.mjs'");
  writeFileSync(temp + '/' + file.replace('.ts', '.mjs'), code);
}
const { catalogName, localizeStep } = await import(
  pathToFileURL(temp + '/localizedContent.mjs').href
);
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const rows = [];
for (const row of snapshot.recipes) {
  if (row.title_ar && /\p{Script=Arabic}/u.test(row.title_ar)) continue;
  const after = catalogName(row.title, 'ar');
  if (after === row.title) continue;
  rows.push({
    table: 'recipes',
    id: row.id,
    field: 'title_ar',
    before: row.title_ar ?? null,
    source_field: 'title',
    source_before: row.title,
    after,
  });
}
writeFileSync(
  outputPath + '/recipe-titles.json.gz',
  gzipSync(JSON.stringify({ items: rows }), { level: 9, mtime: 0 }),
);
const descriptions = JSON.parse(
  readFileSync(outputPath + '/translations.json', 'utf8'),
).items;
const notes = {
  '6bbdef1b-344a-46ea-841b-44a5069bcca4':
    'تنشر المحمصة جرعة 18 غ وطحنة 14.5 على EK ونسبة 1:15، مع أهداف صب تراكمية 58 و158 و170 مل، ووقت إجمالي 2:02 وقراءة TDS مقدارها 1.4. لا تتفق كمية الماء الأخيرة مع النسبة المنشورة؛ احتُفظ بالقيم كما هي. لم تُنشر حرارة الماء أو أوقات بدء الصبّات؛ راجع المصدر قبل اعتماد الخطة.',
  'd6a8c1dd-04ce-4b50-b8c5-11204cb41b32':
    'طريقة براود ماري المنشورة: 15 غ بن و250 مل ماء بنسبة معلنة 1:17، وماء عند الغليان أو بعده مباشرة دون درجة رقمية. التزهير بـ50 مل خلال أول 30 ثانية مع تحريك، ثم صب 200 مل بحركة دائرية من 0:30 إلى 0:50، ثم التصريف. الوقت الإجمالي المنشور 2:30–3:00. هذه طريقة عامة لم يُحدد فيها بن بعينه.',
};
for (const [id, after] of Object.entries(notes)) {
  const row = snapshot.recipes.find((r) => r.id === id);
  if (
    row &&
    !row.notes_ar &&
    !descriptions.some(
      (item) =>
        item.table === 'recipes' && item.id === id && item.field === 'notes_ar',
    )
  )
    descriptions.push({
      table: 'recipes',
      id,
      field: 'notes_ar',
      before: null,
      source_field: 'notes',
      source_before: row.notes,
      after,
    });
}
const steps = snapshot.steps.flatMap((row) => {
  const localized = localizeStep(row.title ?? '', row.description ?? '', 'ar');
  const update = {
    title_ar: row.title_ar ?? null,
    description_ar: row.description_ar ?? null,
  };
  let changed = false;
  for (const key of ['title', 'description'])
    if (!row[key + '_ar'] && localized[key] && localized[key] !== row[key]) {
      update[key + '_ar'] = localized[key];
      changed = true;
    }
  return changed
    ? [
        {
          title: row.title,
          description: row.description,
          before: {
            title_ar: row.title_ar ?? null,
            description_ar: row.description_ar ?? null,
          },
          after: update,
        },
      ]
    : [];
});
writeFileSync(
  outputPath + '/steps.json.gz',
  gzipSync(JSON.stringify({ items: steps }), { level: 9, mtime: 0 }),
);
writeFileSync(
  outputPath + '/translations.json',
  JSON.stringify({ items: descriptions }, null, 2) + '\n',
);
rmSync(temp, { recursive: true, force: true });
console.log(
  JSON.stringify({
    recipe_titles: rows.length,
    descriptions: descriptions.length,
    steps: steps.length,
  }),
);
