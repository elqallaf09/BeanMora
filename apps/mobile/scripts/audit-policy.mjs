const severities = new Set(['info', 'low', 'moderate', 'high', 'critical']);
const strings = value => Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.length > 0);

export function evaluateAudit(audit, exceptions, now = Date.now()) {
  if (audit?.error || !audit?.metadata?.vulnerabilities || !audit.vulnerabilities || Array.isArray(audit.vulnerabilities)) {
    throw new Error('Dependency audit unavailable; retry before release.');
  }
  if (audit.metadata.vulnerabilities.total !== Object.keys(audit.vulnerabilities).length) {
    throw new Error('Incomplete dependency audit; retry before release.');
  }
  if (!Array.isArray(exceptions)) throw new Error('Invalid audit exception policy.');
  const blocked = new Set(), accepted = new Set(), used = new Set(), identities = new Set();
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
    let resolved = false;
    const path = new Set([...seen, name]);
    for (const item of entry.via) {
      if (typeof item === 'string') { resolved = visit(item, path) || resolved; continue; }
      if (!item || !severities.has(item.severity) || typeof item.url !== 'string' || typeof item.range !== 'string' || item.name !== name) {
        blocked.add(`Invalid audit advisory: ${name}`);
        continue;
      }
      resolved = true;
      const exception = exceptions.find(e => e.package === item.name && e.url === item.url && e.range === item.range);
      if (exception) used.add(exception);
      const reviewedScope = exception && entry.isDirect === false && strings(entry.nodes) &&
        entry.nodes.every(node => exception.nodes.includes(node)) && Array.isArray(entry.effects) &&
        entry.effects.every(dependent => exception.dependents.includes(dependent));
      if (item.severity !== 'critical' && reviewedScope && Date.parse(exception.expires) > now) {
        accepted.add(`${item.name}: ${item.url} (expires ${exception.expires})`);
      } else {
        blocked.add(`${item.name}: ${item.url}${exception && !reviewedScope ? ' (outside reviewed tooling scope)' : ''}`);
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
  return { blocked: [...blocked].sort(), accepted: [...accepted].sort(), counts: audit.metadata.vulnerabilities };
}
