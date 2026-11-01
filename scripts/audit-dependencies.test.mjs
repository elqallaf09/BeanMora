import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockedFindings, verifyLegacyMinimatch } from './audit-dependencies.mjs';

const fixture = () => ({metadata: {vulnerabilities: {total: 2}}, vulnerabilities: {
  minimatch: {isDirect: false, severity: 'moderate', nodes: ['node_modules/minimatch'], via: [{name: 'minimatch', severity: 'moderate', range: '<11.0.1', url: 'https://github.com/advisories/GHSA-g3hv-75wg-m249'}]},
  eslint: {severity: 'moderate', via: ['minimatch']},
}});
test('installed legacy matcher lacks the amplification code and bounds the reported pattern family', () => {
  assert.equal(verifyLegacyMinimatch(), true);
});
test('only exact reviewed source/advisory passes; unverified, changed, nested and new findings fail', () => {
  assert.deepEqual(blockedFindings(fixture(), true), []);
  assert.ok(blockedFindings(fixture()).length);
  for (const change of [
    a => a.vulnerabilities.minimatch.via[0].url += '-new',
    a => a.vulnerabilities.minimatch.via[0].range = '*',
    a => a.vulnerabilities.minimatch.via[0].severity = 'high',
    a => a.vulnerabilities.minimatch.nodes.push('node_modules/glob/node_modules/minimatch'),
    a => a.vulnerabilities.eslint.via.push({name: 'eslint', url: 'new-advisory'}),
  ]) { const audit = fixture(); change(audit); assert.ok(blockedFindings(audit, true).length); }
  assert.throws(() => blockedFindings({error: 'unavailable'}, true));
  const cycle = fixture(); cycle.vulnerabilities.minimatch.via = ['eslint'];
  assert.ok(blockedFindings(cycle, true).length);
  const incomplete = fixture(); incomplete.metadata.vulnerabilities.total++;
  assert.throws(() => blockedFindings(incomplete, true));
});
