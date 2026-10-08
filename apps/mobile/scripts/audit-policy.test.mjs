import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateAudit } from './audit-policy.mjs';

const currentPolicy = JSON.parse(readFileSync(new URL('../security-audit-exceptions.json', import.meta.url), 'utf8'));
// Keep historical fixtures independent so a verified fix can remove either
// real exception without weakening expiry/scope regression coverage.
const policy = [
  { package: 'braces', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', range: '<=3.0.3',
    nodes: ['node_modules/braces'], dependents: ['micromatch'], expires: '2026-10-21T00:00:00Z', owner: 'test', reason: 'fixture' },
  { package: 'node-forge', url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv', range: '<=1.4.0',
    nodes: ['node_modules/node-forge'], dependents: ['@expo/cli', '@expo/code-signing-certificates'], expires: '2026-10-21T00:00:00Z', owner: 'test', reason: 'fixture' },
];
const beforeExpiry = Date.parse('2026-10-20T23:59:59Z');
function fixture(exceptions = policy) {
  const vulnerabilities = Object.fromEntries(exceptions.map(e => [e.package, {
    name: e.package, severity: 'high', isDirect: false, nodes: [...e.nodes], effects: [...e.dependents],
    via: [{ name: e.package, url: e.url, range: e.range, severity: 'high' }],
  }]));
  return { metadata: { vulnerabilities: { high: exceptions.length, total: exceptions.length } }, vulnerabilities };
}

test('only the two existing advisories are accepted and their deadline is unchanged', () => {
  assert.ok(currentPolicy.length <= policy.length);
  for (const e of currentPolicy) {
    const reviewed = policy.find(item => item.package === e.package);
    assert.ok(reviewed, `Unreviewed exception: ${e.package}`);
    for (const key of ['url', 'range', 'expires', 'nodes', 'dependents']) assert.deepEqual(e[key], reviewed[key]);
  }
  evaluateAudit(fixture(currentPolicy), currentPolicy, beforeExpiry);
  const result = evaluateAudit(fixture(), policy, beforeExpiry);
  assert.deepEqual(result.blocked, []);
  assert.equal(result.accepted.length, 2);
});

test('both exceptions block at the exact deadline, including an advisory-free audit', () => {
  const now = Date.parse('2026-10-21T00:00:00Z');
  assert.equal(evaluateAudit(fixture(), policy, now).blocked.filter(x => x.startsWith('Expired')).length, 2);
  assert.equal(evaluateAudit(fixture([]), policy, now).blocked.filter(x => x.startsWith('Expired')).length, 2);
});

test('a clean audit requires removing obsolete exceptions', () => {
  assert.equal(evaluateAudit(fixture([]), policy, beforeExpiry).blocked.length, 2);
  assert.deepEqual(evaluateAudit(fixture([]), [], beforeExpiry).blocked, []);
});

test('new advisories and changed advisory ranges cannot inherit an exception', () => {
  for (const field of ['url', 'range']) {
    const audit = fixture();
    audit.vulnerabilities.braces.via[0][field] += '-changed';
    assert.ok(evaluateAudit(audit, policy, beforeExpiry).blocked.length);
  }
});

test('critical findings are never excepted and low findings are not silently skipped', () => {
  for (const severity of ['critical', 'low']) {
    const audit = fixture();
    audit.vulnerabilities.braces.via[0].severity = severity;
    if (severity === 'low') audit.vulnerabilities.braces.via[0].url += '-new';
    assert.ok(evaluateAudit(audit, policy, beforeExpiry).blocked.length);
  }
});

test('direct application dependencies, additional installations and new consumers are blocked', () => {
  for (const mutate of [
    entry => { entry.isDirect = true; },
    entry => { entry.nodes.push('node_modules/new-consumer/node_modules/braces'); },
    entry => { entry.effects.push('new-consumer'); },
  ]) {
    const audit = fixture();
    mutate(audit.vulnerabilities.braces);
    assert.match(evaluateAudit(audit, policy, beforeExpiry).blocked.join('\n'), /outside reviewed tooling scope/);
  }
});

test('transitive audit paths resolve the leaf advisory without infinite recursion', () => {
  const audit = fixture();
  audit.vulnerabilities.consumer = { severity: 'high', via: ['cycle', 'braces'] };
  audit.vulnerabilities.cycle = { severity: 'high', via: ['consumer'] };
  audit.metadata.vulnerabilities.total += 2;
  assert.deepEqual(evaluateAudit(audit, policy, beforeExpiry).blocked, []);
  audit.vulnerabilities.consumer.via = ['cycle'];
  assert.match(evaluateAudit(audit, policy, beforeExpiry).blocked.join('\n'), /Unresolved audit dependency/);
});

test('missing audit dependencies and malformed advisories fail closed', () => {
  for (const via of [['missing'], [null], [{ severity: 'unknown' }], []]) {
    const audit = fixture();
    audit.vulnerabilities.braces.via = via;
    assert.ok(evaluateAudit(audit, policy, beforeExpiry).blocked.length);
  }
});

test('unavailable or incomplete audit data and malformed policies cannot pass', () => {
  for (const audit of [{}, { error: { code: 'OFFLINE' } }, { ...fixture(), vulnerabilities: {} }]) {
    assert.throws(() => evaluateAudit(audit, policy, beforeExpiry), /audit/i);
  }
  for (const exceptions of [{}, [{ ...policy[0], expires: 'invalid' }], [policy[0], policy[0]], [null]]) {
    assert.throws(() => evaluateAudit(fixture(), exceptions, beforeExpiry), /exception/i);
  }
});
