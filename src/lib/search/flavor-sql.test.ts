import { execFileSync } from 'node:child_process';
import { it } from 'vitest';

it('keeps the deployed SQL supplement and bilingual regressions aligned with reviewed flavor aliases', () => {
  execFileSync(process.execPath, ['apps/mobile/scripts/prepare-flavor-search-sql.mjs', '--check'], { stdio: 'pipe' });
});
