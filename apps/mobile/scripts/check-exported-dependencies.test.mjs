import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkExportedDependencies } from './check-exported-dependencies.mjs';

function fixture(t, map) {
  const root = mkdtempSync(join(tmpdir(), 'beanmora-export-audit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const platform of ['ios', 'android', 'web']) {
    const dir = join(root, '_expo/static/js', platform);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.js.map'), JSON.stringify(map));
  }
  return root;
}

test('checks all platforms and distinguishes app filenames from package imports', t => {
  const root = fixture(t, { version: 3, sources: ['/src/braces.ts', '/node_modules/expo/index.js'] });
  assert.deepEqual(checkExportedDependencies(root).map(result => result.platform), ['ios', 'android', 'web']);
});

test('rejects affected modules in regular, Windows and indexed source maps', t => {
  for (const platform of ['ios', 'android', 'web']) {
    for (const source of ['/node_modules/braces/lib/compile.js', 'C:\\app\\node_modules\\node-forge\\lib\\rsa.js', '/node_modules/nested/node_modules/braces/index.js']) {
      const root = fixture(t, { version: 3, sources: ['/src/App.tsx'] });
      const map = { version: 3, sections: [{ offset: { line: 0, column: 0 }, map: { version: 3, sources: [source] } }] };
      writeFileSync(join(root, '_expo/static/js', platform, 'index.js.map'), JSON.stringify(map));
      assert.throws(() => checkExportedDependencies(root), new RegExp(platform + ' runtime bundle'));
    }
  }
});

test('missing platforms, missing maps and empty maps fail closed', t => {
  const root = fixture(t, { version: 3, sources: [] });
  assert.throws(() => checkExportedDependencies(root), /usable sources/);
  rmSync(join(root, '_expo/static/js/ios/index.js.map'));
  assert.throws(() => checkExportedDependencies(root), /Missing ios/);
  rmSync(join(root, '_expo/static/js/ios'), { recursive: true });
  assert.throws(() => checkExportedDependencies(root));
});
