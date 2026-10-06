import { readFileSync, writeFileSync } from 'node:fs';
const pairs = [
  ['../../../src/lib/recommendations/engine.ts', '../src/core/engine.ts'],
  ['../../../src/lib/brewing/outcome.ts', '../src/core/outcome.ts'],
  ['../../../src/lib/search/deepSearch.ts', '../src/core/deepSearch.ts'],
  ['../../../src/lib/account-deletion.ts', '../src/core/account-deletion.ts'],
  ['../../../src/lib/native-oauth-callback.ts', '../src/core/native-oauth-callback.ts'],
];
for (const [source, destination] of pairs) {
  const sourceUrl = new URL(source, import.meta.url);
  const targetUrl = new URL(destination, import.meta.url);
  const content = readFileSync(sourceUrl, 'utf8');
  if (process.argv.includes('--check')) {
    if (readFileSync(targetUrl, 'utf8') !== content) throw new Error('Shared core drift: run npm run sync:core in apps/mobile');
  } else writeFileSync(targetUrl, content);
}
console.log('Mobile recommendation and outcome modules match the web core.');
