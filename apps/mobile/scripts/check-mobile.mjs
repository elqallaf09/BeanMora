import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const get = p => readFileSync(new URL(p, root), 'utf8');
const temp = mkdtempSync(tmpdir() + '/beanmora-mobile-');
writeFileSync(temp + '/guards.mjs', ts.transpileModule(get('src/guards.ts'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
const { safeUrl, isPublicKey, numberInput, searchText } = await import(pathToFileURL(temp + '/guards.mjs').href);
test('rejects privileged keys and accepts only public configuration', () => {
  assert.equal(isPublicKey('sb_secret_not-public'), false);
  assert.equal(isPublicKey('sb_publishable_example'), true);
  const jwt = role => 'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';
  assert.equal(isPublicKey(jwt('service_role')), false); assert.equal(isPublicKey(jwt('anon')), true);
});
for (const value of ['javascript:alert(1)', 'file:///tmp/a', 'http://example.com', 'https://u:p@example.com', 'not-url']) {
  test('blocks unsafe source: ' + value, () => assert.equal(safeUrl(value), null));
}
test('supports Arabic number entry without manufacturing missing measurements', () => {
  assert.equal(numberInput('١٨٫٥'), 18.5); assert.equal(numberInput('۱۸'), 18); assert.equal(numberInput(''), null);
  for (const x of ['abc','Infinity','1e5','-2']) assert.equal(numberInput(x), null);
});
test('Arabic search is diacritic insensitive', () => assert.equal(searchText('قَهْوَة'), searchText('قهوه')));
test('mobile never imports Next or web-only UI', () => {
  for (const p of ['App.tsx','src/data.ts','src/client.ts','src/OutcomeForm.tsx']) assert.doesNotMatch(get(p), /from ['"]next|service_role\s*[:=]|dangerouslySetInnerHTML/);
});
test('account session is not persisted in Expo Go', () => assert.match(get('src/client.ts'), /persistSession:\s*false/));
test('public reads enforce publication, review and recipe visibility', () => {
  const code = get('src/data.ts');
  assert.match(code, /eq\('requires_review', false\)/); assert.match(code, /eq\('is_published', true\)/); assert.match(code, /eq\('visibility', 'public'\)/);
  assert.match(code, /if \(!userId\) return result/); assert.match(code, /eq\('user_id', userId\)/);
});
test('outcomes remain opt-in and same-request retries use the shared RPC', () => {
  const form = get('src/OutcomeForm.tsx'); assert.match(form, /\[share, setShare\] = useState\(false\)/);
  assert.match(form, /saveOutcome\(supabase, pending.current.id, pending.current.payload\)/);
  assert.match(form, /user.id !== userId/); assert.match(form, /setSaved\(true\)/);
  assert.match(get('src/core/outcome.ts'), /data !== requestId/);
});
test('identity changes cannot display the previous account recommendations', () => assert.match(get('App.tsx'), /bundle\?\.owner === userId/));
test('mobile and Next TypeScript trees stay isolated', () => {
  const config = JSON.parse(readFileSync(new URL('../../../tsconfig.json', import.meta.url), 'utf8'));
  assert.ok(config.exclude.includes('apps/mobile'));
});
