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
