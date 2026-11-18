import { readFileSync, writeFileSync } from 'node:fs';

// The Edge Function uses the same reviewed lesson text as the local guide.
// Deno requires JSON import attributes; this is the only source adaptation.
for (const file of ['coffee-curriculum.ts', 'coffee-knowledge-basics.ts', 'coffee-practical-content.json']) {
  const source = new URL('../src/lib/' + file, import.meta.url);
  const destination = new URL('../supabase/functions/_shared/' + file, import.meta.url);
  const raw = readFileSync(source, 'utf8');
  const content = file === 'coffee-curriculum.ts'
    ? raw.replace("from './coffee-practical-content.json';", "from './coffee-practical-content.json' with { type: 'json' };")
    : raw;
  if (process.argv.includes('--check')) {
    if (readFileSync(destination, 'utf8') !== content) throw new Error('Server guidance drift: run node scripts/sync-coffee-guidance.mjs');
  } else writeFileSync(destination, content);
}
console.log('Server guidance matches the reviewed coffee lessons.');
