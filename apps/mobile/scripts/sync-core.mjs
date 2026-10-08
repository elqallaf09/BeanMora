import { readFileSync, writeFileSync } from 'node:fs';
const pairs = [
  ['../../../src/lib/local-coffee-assistant.ts', '../src/core/local-coffee-assistant.ts'],
  ['../../../src/lib/coffee-assistant.ts', '../src/core/coffee-assistant.ts'],
  ['../../../src/lib/catalog-comments.ts', '../src/core/catalog-comments.ts'],
  ['../../../src/lib/member-social.ts', '../src/core/member-social.ts'],
  ['../../../src/lib/equipment-facts.ts', '../src/core/equipment-facts.ts'],
  ['../../../src/lib/catalog-names.ts', '../src/core/catalog-names.ts'],
  ['../../../src/lib/catalog-foreign-titles.ts', '../src/core/catalog-foreign-titles.ts'],
  ['../../../src/lib/capsules.ts', '../src/core/capsules.ts'],
  ['../../../src/lib/owned-inventory.ts', '../src/core/owned-inventory.ts'],
  ['../../../src/lib/member-contributions.ts', '../src/core/member-contributions.ts'],
  ['../../../src/lib/content-media.ts', '../src/core/content-media.ts'],
  ['../../../src/lib/legal-content.ts', '../src/core/legal-content.ts'],
  ['../../../src/lib/secure-session-storage.ts', '../src/core/secure-session-storage.ts'],
  ['../../../src/lib/recommendations/engine.ts', '../src/core/engine.ts'],
  ['../../../src/lib/brewing/outcome.ts', '../src/core/outcome.ts'],
  ['../../../src/lib/search/deepSearch.ts', '../src/core/deepSearch.ts'],
  ['../../../src/lib/account-deletion.ts', '../src/core/account-deletion.ts'],
  ['../../../src/lib/native-oauth-callback.ts', '../src/core/native-oauth-callback.ts'],
];
for (const [source, destination] of pairs) {
  const sourceUrl = new URL(source, import.meta.url);
  const targetUrl = new URL(destination, import.meta.url);
  const raw = readFileSync(sourceUrl, 'utf8');
  const content = source.endsWith('coffee-assistant.ts') ? raw.replace("'./search/deepSearch'", "'./deepSearch'") : raw;
  if (process.argv.includes('--check')) {
    if (readFileSync(targetUrl, 'utf8') !== content) throw new Error('Shared core drift: run npm run sync:core in apps/mobile');
  } else writeFileSync(targetUrl, content);
}
console.log('Mobile recommendation and outcome modules match the web core.');
