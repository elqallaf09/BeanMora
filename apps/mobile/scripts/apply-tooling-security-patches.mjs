import { applySecurityBackports } from './tooling-security-patches.mjs';

for (const p of applySecurityBackports()) {
  console.log(`Applied and verified security backport: ${p.package}@${p.version} (${p.url})`);
}
