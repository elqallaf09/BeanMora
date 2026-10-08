import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const mobileRoot = fileURLToPath(new URL('../', import.meta.url));
const sha256 = content => createHash('sha256').update(content).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

function within(root, path) {
  const target = resolve(root, path);
  if (!target.startsWith(resolve(root) + sep)) throw new Error(`Invalid backport path: ${path}`);
  return target;
}

export function readBackports(root = mobileRoot) {
  const backports = json(join(root, 'patches/manifest.json'));
  if (!Array.isArray(backports) || backports.length > 2 || new Set(backports.map(p => p.package)).size !== backports.length ||
      backports.some(p => !['braces', 'node-forge'].includes(p.package))) {
    throw new Error('Only the two reviewed tooling security backports are permitted.');
  }
  for (const p of backports) {
    if (!p.version || !p.url || !p.range || !/^[a-f0-9]{40}$/.test(p.commit) || !p.files?.length ||
        !p.nodes?.length || !p.dependents?.length || !p.resolutions?.length ||
        p.files.some(f => !/^[a-f0-9]{64}$/.test(f.beforeSha256) || !/^[a-f0-9]{64}$/.test(f.afterSha256))) {
      throw new Error(`Invalid security backport manifest: ${p.package}`);
    }
  }
  return backports;
}

function checkInstall(root, backports) {
  const lock = json(join(root, 'package-lock.json'));
  for (const p of backports) {
    const nodes = Object.keys(lock.packages).filter(path => path.endsWith(`node_modules/${p.package}`));
    if (!same(nodes, p.nodes)) throw new Error(`Unreviewed installation of ${p.package}; review the backport scope.`);
    for (const node of p.nodes) {
      const expected = within(root, `${node}/package.json`);
      if (lock.packages[node].version !== p.version || json(expected).version !== p.version) {
        throw new Error(`Unexpected ${p.package} version; review or retire the security backport.`);
      }
    }
    for (const consumer of p.resolutions) {
      const from = within(root, consumer.from);
      const metadata = json(from);
      const locked = lock.packages[consumer.from.replace(/\/package\.json$/, '')];
      if (!locked || metadata.name !== consumer.package || metadata.version !== locked.version) {
        throw new Error(`Unreviewed security-backport consumer: ${consumer.from}`);
      }
      const installed = createRequire(from).resolve(`${p.package}/package.json`);
      if (!p.nodes.some(node => installed === within(root, `${node}/package.json`))) {
        throw new Error(`${consumer.from} resolves an unpatched copy of ${p.package}.`);
      }
    }
  }
}

// Apply exact upstream unified hunks without a platform-specific patch binary.
// No fuzzy matching: both the original and resulting file must match SHA-256.
function applyHunks(content, patch, label) {
  const lines = patch.replace(/\r\n/g, '\n').split('\n');
  if (lines.pop() !== '') throw new Error(`Missing final newline in ${label}`);
  if (!lines[0]?.startsWith('--- a/') || !lines[1]?.startsWith('+++ b/')) throw new Error(`Invalid patch: ${label}`);
  let hunk, hunks = [];
  for (const line of lines.slice(2)) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (header) {
      hunk = { before: [], after: [], beforeCount: Number(header[2] ?? 1), afterCount: Number(header[4] ?? 1) };
      hunks.push(hunk);
    } else if (hunk && [' ', '-', '+'].includes(line[0])) {
      if (line[0] !== '+') hunk.before.push(line.slice(1) + '\n');
      if (line[0] !== '-') hunk.after.push(line.slice(1) + '\n');
    } else throw new Error(`Invalid patch hunk: ${label}`);
  }
  if (!hunks.length) throw new Error(`Empty patch: ${label}`);
  for (const h of hunks) {
    if (h.before.length !== h.beforeCount || h.after.length !== h.afterCount) throw new Error(`Incomplete patch: ${label}`);
    const before = h.before.join(''), after = h.after.join('');
    const at = content.indexOf(before);
    if (!before || at < 0 || content.indexOf(before, at + before.length) !== -1) throw new Error(`Non-unique patch context: ${label}`);
    content = content.slice(0, at) + after + content.slice(at + before.length);
  }
  return content;
}

export function verifyPatchedFiles(root = mobileRoot) {
  const backports = readBackports(root);
  checkInstall(root, backports);
  for (const p of backports) for (const node of p.nodes) for (const f of p.files) {
    if (sha256(readFileSync(within(root, `${node}/${f.path}`))) !== f.afterSha256) {
      throw new Error(`Security backport missing or modified: ${p.package}/${f.path}. Run npm ci with lifecycle scripts enabled.`);
    }
  }
  return backports;
}

export function applySecurityBackports(root = mobileRoot) {
  const backports = readBackports(root);
  checkInstall(root, backports);
  const writes = [];
  // Validate every file before changing any file.
  for (const p of backports) for (const node of p.nodes) for (const f of p.files) {
    const target = within(root, `${node}/${f.path}`);
    const original = readFileSync(target);
    const hash = sha256(original);
    if (hash === f.afterSha256) continue;
    if (hash !== f.beforeSha256) throw new Error(`Unrecognized source: ${p.package}/${f.path}; refusing to apply a security patch.`);
    const patched = applyHunks(original.toString('utf8'), readFileSync(within(join(root, 'patches'), f.patch), 'utf8'), f.patch);
    if (sha256(patched) !== f.afterSha256) throw new Error(`Security patch checksum mismatch: ${f.patch}`);
    writes.push({ target, patched });
  }
  for (const { target, patched } of writes) {
    const temporary = `${target}.beanmora-security-${process.pid}`;
    writeFileSync(temporary, patched);
    renameSync(temporary, target);
  }
  verifyPatchedFiles(root);
  return backports;
}
