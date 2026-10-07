import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Exact, time-limited tooling advisories. New advisories, critical findings,
// registry outages and expired exceptions fail the release check.
const exceptions = JSON.parse(readFileSync(new URL('../security-audit-exceptions.json', import.meta.url), 'utf8'));
const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', timeout: 90000, maxBuffer: 4 * 1024 * 1024 });
if (result.error) throw result.error;
const audit = JSON.parse(result.stdout);
if (audit.error || !audit.metadata || !audit.vulnerabilities) throw new Error('Dependency audit unavailable; retry before release.');
const blocked = new Set(), accepted = new Set();
const visit = (name, seen = new Set()) => {
  if (seen.has(name)) return;
  seen.add(name);
  const entry = audit.vulnerabilities[name];
  if (!entry) { blocked.add(`Unresolved audit dependency: ${name}`); return; }
  for (const item of entry.via) {
    if (typeof item === 'string') { visit(item, seen); continue; }
    if (!['moderate','high','critical'].includes(item.severity)) continue;
    const exception = exceptions.find(e => e.package === item.name && e.url === item.url && e.range === item.range && Date.parse(e.expires) > Date.now());
    if (item.severity !== 'critical' && exception) accepted.add(`${item.name}: ${item.url} (expires ${exception.expires})`);
    else blocked.add(`${item.name}: ${item.url}`);
  }
};
for (const name of Object.keys(audit.vulnerabilities)) visit(name);
for (const line of accepted) console.warn('REVIEWED TOOLING RISK:', line);
if (blocked.size) { console.error([...blocked].join('\n')); process.exitCode=1; }
else console.log(`Audit gate passed: ${accepted.size} explicitly reviewed tooling advisories; zero unreviewed findings.`);
