import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { evaluateAudit } from './audit-policy.mjs';
import { verifySecurityBackports } from './tooling-security-regressions.mjs';

// Audit the entire build tree, including devDependencies. npm checks published
// versions, so retain its raw findings while separately proving installed fixes.
// A manifest claim alone is insufficient: bytes, consumers and behavior are checked.
const exceptions = JSON.parse(readFileSync(new URL('../security-audit-exceptions.json', import.meta.url), 'utf8'));
const result = spawnSync('npm', ['audit', '--include=dev', '--json'], {
  encoding: 'utf8', timeout: 90000, maxBuffer: 4 * 1024 * 1024,
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
if (result.stderr) process.stderr.write(result.stderr);
if (![0, 1].includes(result.status)) throw new Error(`Dependency audit failed to run (exit ${result.status}).`);
const audit = JSON.parse(result.stdout);
console.log(`Raw npm audit (including dev): ${JSON.stringify(audit.metadata?.vulnerabilities)}`);
const backports = verifySecurityBackports();
const { blocked, accepted, patched } = evaluateAudit(audit, exceptions, Date.now(), backports);
for (const line of patched) console.warn('VERIFIED LOCAL SECURITY FIX; NPM VERSION FINDING REMAINS:', line);
for (const line of accepted) console.warn('REVIEWED TOOLING RISK:', line);
if (blocked.length) { console.error(blocked.join('\n')); process.exitCode = 1; }
else if (accepted.length) console.log(`Audit gate passed WITH ${accepted.length} temporary tooling exceptions; vulnerabilities remain unresolved.`);
else if (patched.length) console.log(`Audit gate passed: ${patched.length} installed security backports verified, zero risk exceptions. Raw npm audit is not clean.`);
else console.log('Audit gate passed: zero vulnerabilities and zero exceptions.');
