import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
test('ESLint 9 executes the retained Next rules and rejects duplicate document heads', async () => {
  const { ESLint } = require('eslint');
  const eslint = new ESLint();
  const results = await eslint.lintText('import Document, { Head } from "next/document"; export default class TestDocument extends Document { render() { return <><Head /><Head /></>; } }', { filePath: 'src/pages/_document.tsx' });
  assert.ok(results[0].messages.some(m => m.ruleId === '@next/next/no-duplicate-head' && m.severity === 2));
  assert.ok(!results[0].messages.some(m => m.fatal));
});
test('every direct dependency is pinned and agrees with the committed lock', () => {
  for (const group of ['dependencies', 'devDependencies']) {
    for (const [name, version] of Object.entries(pkg[group])) {
      assert.match(version, /^\d+\.\d+\.\d+$/);
      assert.equal(lock.packages[''][group][name], version);
      assert.equal(lock.packages[`node_modules/${name}`].version, version);
    }
  }
});
test('registry tarballs use HTTPS and integrity metadata', () => {
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!name || !entry.resolved || entry.inBundle) continue;
    const url = new URL(entry.resolved);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'registry.npmjs.org');
    assert.ok(entry.integrity, `${name} is missing integrity metadata`);
  }
});
const nextRequire = createRequire(require.resolve('next/package.json'));
const postcss = nextRequire('postcss');
test('Next resolves the narrowly overridden patched PostCSS version', () => {
  assert.equal(nextRequire('postcss/package.json').version, '8.5.23');
  assert.equal(pkg.overrides.next.postcss, '8.5.23');
});
test('the official lint plugin retains all Next rules without the unpatched braces dependency', () => {
  const configRequire = createRequire(require.resolve('eslint-config-next/package.json'));
  const plugin = configRequire('@next/eslint-plugin-next');
  assert.equal(configRequire('@next/eslint-plugin-next/package.json').version, '14.2.35');
  assert.equal(require('@next/eslint-plugin-next'), plugin);
  const pluginRequire = createRequire(configRequire.resolve('@next/eslint-plugin-next/package.json'));
  assert.equal(pluginRequire('glob/package.json').version, '10.5.0');
  assert.equal(require('next/package.json').version, pkg.dependencies.next);
  assert.deepEqual(Object.keys(plugin.rules).sort(), [
    'google-font-display', 'google-font-preconnect', 'inline-script-id', 'next-script-for-ga',
    'no-assign-module-variable', 'no-async-client-component', 'no-before-interactive-script-outside-document',
    'no-css-tags', 'no-document-import-in-page', 'no-duplicate-head', 'no-head-element',
    'no-head-import-in-document', 'no-html-link-for-pages', 'no-img-element', 'no-page-custom-font',
    'no-script-component-in-head', 'no-styled-jsx-in-document', 'no-sync-scripts',
    'no-title-in-document-head', 'no-typos', 'no-unwanted-polyfillio',
  ]);
  assert.ok(!Object.keys(lock.packages).some(path => path.endsWith('/braces')));
});
test('PostCSS does not read an arbitrary source map without an explicit input file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'beanmora-css-security-'));
  try {
    const map = join(dir, 'sentinel.map');
    writeFileSync(map, JSON.stringify({version:3,sources:['private-sentinel'],sourcesContent:['TEST-ONLY-NOT-A-SECRET'],names:[],mappings:'AAAA'}));
    const root = postcss.parse(`a { color: red }\n/*# sourceMappingURL=${map} */`);
    assert.equal(root.source.input.map?.text, undefined);
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
test('browser smoke stubs are not imported into application source', () => {
  function check(dir) {
    for (const entry of readdirSync(dir, {withFileTypes:true})) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) check(path);
      else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
        assert.doesNotMatch(readFileSync(path, 'utf8'), /BEANMORA_SMOKE|supabase-smoke|e2e\/fixtures|test-only-not-a-valid-signature/, path);
      }
    }
  }
  check(fileURLToPath(new URL('../src', import.meta.url)));
  assert.doesNotMatch(readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8'), /BEANMORA_SMOKE|supabase-smoke/);
  const quality = readFileSync(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8');
  assert.match(quality, /contents: read/);
  assert.doesNotMatch(quality, /contents: write|service_role|SUPABASE_SERVICE/);
});
