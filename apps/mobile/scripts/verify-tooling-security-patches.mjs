import { verifyPatchedFiles } from './tooling-security-patches.mjs';

for (const p of verifyPatchedFiles()) {
  console.log(`Verified installed security backport: ${p.package}@${p.version} (${p.commit})`);
}
