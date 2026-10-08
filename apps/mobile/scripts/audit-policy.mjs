const severities = new Set(['info', 'low', 'moderate', 'high', 'critical']);
const strings = value => Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.length > 0);

export function evaluateAudit(audit, exceptions, now = Date.now(), verifiedBackports = []) {
  if (audit?.error || !audit?.metadata?.vulnerabilities || !audit.vulnerabilities || Array.isArray(audit.vulnerabilities)) {
    throw new Error('Dependency audit unavailable; retry before release.');
  }
  if (audit.metadata.vulnerabilities.total !== Object.keys(audit.vulnerabilities).length) {
    throw new Error('Incomplete dependency audit; retry before release.');
  }
  if (!Array.isArray(exceptions)) throw new Error('Invalid audit exception policy.');
  if (!Array.isArray(verifiedBackports) || verifiedBackports.some(p => p?.verified !== true ||
      !['package', 'url', 'range', 'version'].every(key => typeof p[key] === 'string' && p[key]) ||
      !strings(p.nodes) || !strings(p.dependents))) {
    throw new Error('Unverified security backport; installed bytes and exploit regressions must pass first.');
  }
  const blocked = new Set(), accepted = new Set(), patched = new Set(), used = new Set(), identities = new Set();
  const reviewedScope = (entry, policy) => policy && entry.isDirect === false && strings(entry.nodes) &&
    entry.nodes.every(node => policy.nodes.includes(node)) && Array.isArray(entry.effects) &&
    entry.effects.every(dependent => policy.dependents.includes(dependent));
  for (const exception of exceptions) {
    if (!exception || !['package', 'url', 'range', 'expires', 'owner', 'reason'].every(key => typeof exception[key] === 'string' && exception[key].trim()) ||
        !Number.isFinite(Date.parse(exception.expires)) || !strings(exception.nodes) || !strings(exception.dependents)) {
      throw new Error('Invalid audit exception policy.');
    }
    const identity = `${exception.package}: ${exception.url}`;
    if (identities.has(identity)) throw new Error(`Duplicate audit exception: ${identity}`);
    identities.add(identity);
    if (Date.parse(exception.expires) <= now) blocked.add(`Expired exception: ${identity} (${exception.expires})`);
  }
  const visit = (name, seen = new Set()) => {
    if (seen.has(name)) return false;
    const entry = audit.vulnerabilities[name];
    if (!entry || !Array.isArray(entry.via) || !severities.has(entry.severity)) {
      blocked.add(`Unresolved audit dependency: ${name}`);
      return false;
    }
    if (entry.severity === 'critical') blocked.add(`Critical audit dependency: ${name}`);
    let resolved = false;
    const path = new Set([...seen, name]);
    for (const item of entry.via) {
      if (typeof item === 'string') { resolved = visit(item, path) || resolved; continue; }
      if (!item || !severities.has(item.severity) || typeof item.url !== 'string' || typeof item.range !== 'string' || item.name !== name) {
        blocked.add(`Invalid audit advisory: ${name}`);
        continue;
      }
      resolved = true;
      const backport = verifiedBackports.find(p => p.package === item.name && p.url === item.url && p.range === item.range);
      if (item.severity !== 'critical' && reviewedScope(entry, backport)) {
        patched.add(`${item.name}@${backport.version}: ${item.url} (installed backport verified; upstream version still flagged)`);
        continue;
      }
      const exception = exceptions.find(e => e.package === item.name && e.url === item.url && e.range === item.range);
      if (exception) used.add(exception);
      const scope = reviewedScope(entry, exception);
      if (item.severity !== 'critical' && scope && Date.parse(exception.expires) > now) {
        accepted.add(`${item.name}: ${item.url} (expires ${exception.expires})`);
      } else {
        blocked.add(`${item.name}: ${item.url}${(exception || backport) && !reviewedScope(entry, exception || backport) ? ' (outside reviewed tooling scope)' : ''}`);
      }
    }
    return resolved;
  };
  for (const name of Object.keys(audit.vulnerabilities)) {
    if (!visit(name)) blocked.add(`Unresolved audit dependency: ${name}`);
  }
  for (const exception of exceptions) {
    if (!used.has(exception)) blocked.add(`Unused exception: ${exception.package}: ${exception.url}; verify the fix and remove the exception.`);
  }
  return { blocked: [...blocked].sort(), accepted: [...accepted].sort(), patched: [...patched].sort(), counts: audit.metadata.vulnerabilities };
}
