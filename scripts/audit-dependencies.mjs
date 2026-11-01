import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const advisory = 'https://github.com/advisories/GHSA-g3hv-75wg-m249';

export function verifyLegacyMinimatch() {
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
  const nodes = Object.entries(lock.packages).filter(([p]) => p.endsWith('/minimatch'));
  for (const [p, metadata] of nodes) {
    if (p === 'node_modules/minimatch') assert.equal(metadata.version, '3.1.5');
    else assert.equal(metadata.version, '11.0.3', `Unreviewed minimatch at ${p}`);
  }
  assert.equal(require('minimatch/package.json').version, '3.1.5');
  const source = readFileSync(require.resolve('minimatch'));
  assert.equal(createHash('sha256').update(source).digest('hex'), '746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d');
  assert.doesNotMatch(source.toString(), /firstPhasePreProcess|secondPhasePreProcess|optimizationLevel/);
  const regression = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const mm = require(${JSON.stringify(require.resolve('minimatch'))});
    for (const n of [16, 128, 1024]) {
      const m = new mm.Minimatch('**/../'.repeat(n) + '*.js', {optimizationLevel: 2});
      assert.equal(m.globParts.length, 1);
      assert.equal(m.set.length, 1);
    }
    assert.equal(mm('src/account.tsx', 'src/**/*.tsx'), true);
    assert.equal(mm('src/account.js', 'src/**/*.tsx'), false);
  `], {encoding: 'utf8', timeout: 3000});
  assert.equal(regression.status, 0, regression.error?.message || regression.stderr);
  return true;
}

// v3 does not contain the optimizationLevel >= 2 preprocessing implicated by
// this advisory. Preserve npm's findings, and fail closed on every other finding.
export function blockedFindings(audit, legacyVerified = false) {
  if (audit?.error || !audit?.vulnerabilities || !audit?.metadata?.vulnerabilities ||
      audit.metadata.vulnerabilities.total !== Object.keys(audit.vulnerabilities).length) {
    throw new Error('Dependency audit unavailable or incomplete.');
  }
  const blocked = new Set();
  function visit(name, seen = new Set()) {
    if (seen.has(name)) return false;
    const entry = audit.vulnerabilities[name];
    if (!entry || !Array.isArray(entry.via) || !entry.via.length || !['info', 'low', 'moderate', 'high', 'critical'].includes(entry.severity)) { blocked.add(name); return false; }
    if (entry.severity === 'critical') blocked.add(name);
    let resolved = false;
    const path = new Set([...seen, name]);
    for (const item of entry.via) {
      if (typeof item === 'string') { resolved = visit(item, path) || resolved; continue; }
      const reviewed = legacyVerified && name === 'minimatch' && item?.name === name &&
        item.url === advisory && item.range === '<11.0.1' && item.severity === 'moderate' &&
        entry.severity === 'moderate' && entry.isDirect === false &&
        JSON.stringify(entry.nodes) === '["node_modules/minimatch"]';
      resolved = reviewed || resolved;
      if (!reviewed) blocked.add(`${name}: ${item?.url || 'invalid advisory'}`);
    }
    return resolved;
  }
  for (const name of Object.keys(audit.vulnerabilities)) if (!visit(name)) blocked.add(name);
  return [...blocked];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = spawnSync('npm', ['audit', '--include=dev', '--json'], {
    encoding: 'utf8', timeout: 90000, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.stderr) process.stderr.write(result.stderr);
  assert.ok([0, 1].includes(result.status), 'npm audit did not complete');
  const audit = JSON.parse(result.stdout);
  console.log('Raw npm audit:', JSON.stringify(audit.metadata?.vulnerabilities));
  const blocked = blockedFindings(audit, verifyLegacyMinimatch());
  if (blocked.length) { console.error(blocked.join('\n')); process.exitCode = 1; }
  else console.log('Audit gate passed. The exact minimatch 3.1.5 source lacks the implicated preprocessing; all other findings remain blocking. Raw npm audit is not clean.');
}
