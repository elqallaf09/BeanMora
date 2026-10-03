// Read the same public coffee catalog/detail endpoints used by collective.xbloom.com.
// Facts and source links only; no tokens, avatars, user IDs, article bodies, likes or reviews.
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
const output = process.argv[2];
if (!output) throw new Error('Supply an output JSON path for the reviewable snapshot.');
mkdirSync(dirname(output), { recursive: true });
const api = 'https://collective-api.xbloom.com/';
async function post(path, body) {
  const response = await fetch(api + path, { method: 'POST', headers: { 'Content-Type': 'application/json', LanguageType: '0' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const result = await response.json();
  if (result.code !== 200) throw new Error(result.msg || 'Public request failed');
  return result.data;
}
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
const https = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } };
const pages = []; let totalPages = 1;
for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
  const page = await post('communityRecipe/index/page', { pageIndex, pageSize: 100, recipeType: 1, sort: 1, sortType: 2 });
  totalPages = page.totalPage; pages.push(...page.list);
  if (pageIndex % 10 === 0) process.stdout.write(JSON.stringify({ indexedPages: pageIndex, totalPages, indexed: pages.length }) + '\n');
}
const rows = [...new Map(pages.map(row => [row.communityRecipeId, row])).values()];
const previous = existsSync(output) ? JSON.parse(readFileSync(output, 'utf8')) : [];
const completed = new Map(previous.filter(row => !row.error).map(row => [row.external_id, row]));
for (const row of rows) {
  const old = completed.get(row.communityRecipeId);
  if (!old) continue;
  const poured = old.pours.every(p => p.volume !== null) ? old.pours.reduce((sum, p) => sum + p.volume, 0) : null;
  old.poured_water_ml = poured;
  old.water_ml = positive(Number(row.volume)) ?? poured;
  old.pour_sum_matches_stated_water = poured != null && old.water_ml != null ? Math.abs(poured - old.water_ml) < 0.1 : null;
}
const errorsPath = output.replace(/\.json$/, '-errors.json');
const removed = existsSync(errorsPath) ? JSON.parse(readFileSync(errorsPath, 'utf8')).filter(row => row.error?.includes('removed by the person who shared it')) : [];
const removedIds = new Set(removed.map(row => row.external_id));
const pending = rows.filter(row => !completed.has(row.communityRecipeId) && !removedIds.has(row.communityRecipeId));
const errors = [...removed]; let next = 0; let finished = 0;
const checkpoint = () => { writeFileSync(output + '.tmp', '[\n' + [...completed.values()].map(row => JSON.stringify(row)).join(',\n') + '\n]\n'); renameSync(output + '.tmp', output); };
async function worker() {
  while (next < pending.length) {
    const row = pending[next++];
    try {
      const data = await post('communityRecipe/recipe/detail', { id: row.communityRecipeId, type: 1 });
      if (data.cupTypeInt === 4 || !Array.isArray(data.pourList)) throw new Error('Not a public coffee recipe');
      const pours = data.pourList.map(p => ({ volume: positive(p.volume), temperature: positive(p.temperature), flow_rate: positive(p.flowRate), pause_seconds: typeof p.pausing === 'number' && p.pausing >= 0 ? p.pausing : null, pattern_code: p.pattern ?? null, vibration_before: p.isEnableVibrationBefore ?? null, vibration_after: p.isEnableVibrationAfter ?? null }));
      const poured = pours.length && pours.every(p => p.volume) ? pours.reduce((sum, p) => sum + p.volume, 0) : null;
      const waterMl = positive(Number(data.volume)) ?? poured;
      completed.set(row.communityRecipeId, { external_id: row.communityRecipeId, url: `https://collective.xbloom.com/recipe/${row.communityRecipeId}`, share_url: https(data.shareRecipeLink), title: String(data.recipeName || '').slice(0, 300), author: String(data.userName || '').slice(0, 100), official: data.official === 1, model: data.model ?? null, image_url: https(data.imageUrl), dose: positive(data.dose), water_ml: waterMl, poured_water_ml: poured, pour_sum_matches_stated_water: poured != null && waterMl != null ? Math.abs(poured - waterMl) < 0.1 : null, ratio: positive(data.grandWater), grind_size: positive(data.grinderSize), rpm: data.model === 'Original' ? null : positive(data.rpm), cup_type: data.cupType, pours, origin: data.origin ?? [], process: data.process ?? [], varietal: data.varietal ?? [], flavors: data.flavor ?? [], checked_at: new Date().toISOString() });
    } catch (error) { errors.push({ external_id: row.communityRecipeId, error: error.message }); }
    finished++;
    if (finished % 50 === 0) checkpoint();
    if (finished % 100 === 0) process.stdout.write(JSON.stringify({ checked: finished, total: pending.length, facts: completed.size, failed: errors.length }) + '\n');
  }
}
await Promise.all(Array.from({ length: 4 }, worker)); checkpoint();
writeFileSync(errorsPath, JSON.stringify(errors, null, 2));
process.stdout.write(JSON.stringify({ complete: completed.size, official: [...completed.values()].filter(r => r.official).length, community: [...completed.values()].filter(r => !r.official).length, errors: errors.length }) + '\n');
