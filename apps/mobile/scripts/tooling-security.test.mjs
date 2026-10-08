import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { applySecurityBackports, mobileRoot, readBackports, verifyPatchedFiles } from './tooling-security-patches.mjs';
import {
  testKeyPair, checkMalformedDigestInfo, checkUpstreamForgeVector, checkValidSignatures,
  checkExpoSigning, checkDeepString, checkAstDepth, checkOrdinaryGlobs,
} from './tooling-security-regressions.mjs';

const require = createRequire(import.meta.url);
const forge = require('node-forge'), braces = require('braces');
const keys = testKeyPair(forge);

test('all installed backport bytes, versions and actual consumer resolutions are verified', () => {
  assert.equal(verifyPatchedFiles().length, 2);
  assert.equal(applySecurityBackports().length, 2); // repeated postinstall is idempotent
});
test('node-forge rejects extra DigestAlgorithm children with normal PKCS#1 padding', () => checkMalformedDigestInfo(forge, keys));
test('node-forge rejects the upstream low-exponent regression vector', () => checkUpstreamForgeVector(forge));
test('valid RSA signatures with optional NULL parameters, PSS and encryption remain compatible', () => checkValidSignatures(forge, keys));
test('Expo certificate, CSR and manifest signing work; malformed certificate signatures are rejected', () =>
  checkExpoSigning(forge, require('@expo/code-signing-certificates'), keys));

for (const operation of ['parse', 'compile', 'expand', 'stringify', 'default']) {
  for (const delimiter of ['{', '(']) test(`braces ${operation} rejects deep ${delimiter} nesting on a small stack`, () =>
    checkDeepString(require.resolve('braces'), operation, delimiter));
}
for (const operation of ['compile', 'expand', 'stringify']) test(`braces ${operation} bounds direct ASTs at depth 100`, () => checkAstDepth(braces, operation));
test('normal glob syntax, nested patterns and micromatch consumers remain compatible', () => checkOrdinaryGlobs(braces, require('micromatch')));

function installationFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'beanmora-security-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(mobileRoot, 'patches'), join(root, 'patches'), { recursive: true });
  const packages = {};
  for (const p of readBackports()) {
    for (const node of p.nodes) {
      const path = join(root, node);
      mkdirSync(path, { recursive: true });
      writeFileSync(join(path, 'package.json'), JSON.stringify({ name: p.package, version: p.version }));
      packages[node] = { version: p.version };
      for (const f of p.files) {
        mkdirSync(dirname(join(path, f.path)), { recursive: true });
        cpSync(join(mobileRoot, node, f.path), join(path, f.path));
      }
    }
    for (const r of p.resolutions) {
      mkdirSync(dirname(join(root, r.from)), { recursive: true });
      writeFileSync(join(root, r.from), JSON.stringify({ name: r.package, version: 'test-fixture' }));
      packages[r.from.replace(/\/package\.json$/, '')] = { version: 'test-fixture' };
    }
  }
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ packages }));
  return root;
}

test('missing patches or changed bytes fail verification and cannot be silently repaired', t => {
  const root = installationFixture(t);
  const file = join(root, 'node_modules/node-forge/lib/rsa.js');
  writeFileSync(file, readFileSync(file, 'utf8') + '\n// unexpected modification\n');
  assert.throws(() => verifyPatchedFiles(root), /missing or modified/);
  assert.throws(() => applySecurityBackports(root), /Unrecognized source/);
});
test('new copies, different versions and consumers resolving an unpatched nested copy fail closed', t => {
  const root = installationFixture(t);
  const lockFile = join(root, 'package-lock.json');
  const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
  lock.packages['node_modules/new/node_modules/braces'] = { version: '3.0.3' };
  writeFileSync(lockFile, JSON.stringify(lock));
  assert.throws(() => verifyPatchedFiles(root), /Unreviewed installation/);
  delete lock.packages['node_modules/new/node_modules/braces'];
  lock.packages['node_modules/braces'].version = '3.0.4';
  writeFileSync(lockFile, JSON.stringify(lock));
  assert.throws(() => verifyPatchedFiles(root), /Unexpected braces version/);
  lock.packages['node_modules/braces'].version = '3.0.3';
  writeFileSync(lockFile, JSON.stringify(lock));
  const nested = join(root, 'node_modules/micromatch/node_modules/braces');
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(nested, 'package.json'), '{"name":"braces","version":"3.0.3"}');
  assert.throws(() => verifyPatchedFiles(root), /resolves an unpatched copy/);
});
