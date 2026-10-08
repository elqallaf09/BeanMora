import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { evaluateAudit } from './audit-policy.mjs';

// Audit the entire build tree, including devDependencies. These exceptions
// accept only the reviewed tooling nodes/consumers, never a direct application
// dependency. A passing gate with exceptions is NOT a clean npm audit.
const exceptions = JSON.parse(readFileSync(new URL('../security-audit-exceptions.json', import.meta.url), 'utf8'));
const result = spawnSync('npm', ['audit', '--include=dev', '--json'], {
  encoding: 'utf8', timeout: 90000, maxBuffer: 4 * 1024 * 1024,
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
if (result.stderr) process.stderr.write(result.stderr);
if (![0, 1].includes(result.status)) throw new Error(`Dependency audit failed to run (exit ${result.status}).`);
const audit = JSON.parse(result.stdout);
const { blocked, accepted, counts } = evaluateAudit(audit, exceptions);
console.log(`Full dependency audit (including dev): ${JSON.stringify(counts)}`);
for (const line of accepted) console.warn('REVIEWED TOOLING RISK:', line);
if (blocked.length) { console.error(blocked.join('\n')); process.exitCode = 1; }
else if (accepted.length) console.log(`Audit gate passed WITH ${accepted.length} temporary tooling exceptions; vulnerabilities remain unresolved.`);
else console.log('Audit gate passed: zero vulnerabilities and zero exceptions.');
