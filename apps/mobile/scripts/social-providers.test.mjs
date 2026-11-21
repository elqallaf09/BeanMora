import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/socialProviders.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const { visibleSocialProviders } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

test('iOS never offers Google while Apple is unavailable or unconfirmed', () => {
  assert.deepEqual(visibleSocialProviders('ios', null), []);
  for (const google of [true, false]) {
    assert.deepEqual(visibleSocialProviders('ios', { apple: false, google }), []);
  }
  assert.deepEqual(visibleSocialProviders('ios', { apple: true, google: true }), ['apple', 'google']);
  assert.deepEqual(visibleSocialProviders('ios', { apple: true, google: false }), ['apple']);
});

test('Android and web retain independent Google sign-in', () => {
  for (const platform of ['android', 'web']) {
    assert.deepEqual(visibleSocialProviders(platform, { apple: false, google: true }), ['google']);
    assert.deepEqual(visibleSocialProviders(platform, { apple: true, google: true }), ['google', 'apple']);
  }
});
