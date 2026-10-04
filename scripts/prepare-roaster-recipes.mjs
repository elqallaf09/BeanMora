// Reviewed catalog compiler. Reads local evidence and emits SQL; never connects to a database.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_DIRECTORY = fileURLToPath(new URL('../supabase/research/global-roasters/', import.meta.url));
export const IMPORT_ID = 'global-roasters-2026-10-04';
export const METHODS = new Set(['v60', 'espresso', 'xbloom', 'aeropress', 'chemex', 'french_press', 'cold_brew', 'moka_pot', 'origami', 'kalita_wave', 'april', 'orea', 'switch', 'pour_over', 'auto_drip']);
const STEP_KINDS = new Set(['bloom', 'pour', 'rinse', 'stir', 'swirl', 'steep', 'press', 'drawdown', 'serve', 'other']);
const FAMILIES = new Set(['chocolate', 'nutty', 'fruity', 'citrus', 'floral', 'caramel', 'spice']);
const PROCESS = new Set(['washed', 'natural', 'honey', 'anaerobic', 'wet_hulled', 'other']);
const ROAST = new Set(['light', 'medium_light', 'medium', 'medium_dark', 'dark']);
const ALIASES = {
  espresso_yield_grams: 'yield_grams', espresso_yield_min_grams: 'yield_min_grams', espresso_yield_max_grams: 'yield_max_grams',
  water_grams_min: 'water_min_grams', water_grams_max: 'water_max_grams', water_ml_min: 'water_min_ml', water_ml_max: 'water_max_ml',
  dose_grams_min: 'dose_min_grams', dose_grams_max: 'dose_max_grams', total_time_min_seconds: 'time_min_seconds', total_time_max_seconds: 'time_max_seconds',
};
const TYPE_AR = { Blend: 'خلطة', 'Single origin': 'أحادي المنشأ', Decaf: 'منزوع الكافيين' };
const present = value => value !== null && value !== undefined && value !== '';
const compact = object => Object.fromEntries(Object.entries(object).filter(([, value]) => present(value)));
const unique = values => [...new Set(values.filter(present))];
const digest = value => createHash('sha256').update(value).digest('hex');
export const nameKey = value => String(value ?? '').normalize('NFC').toLocaleLowerCase('en').trim().replace(/\s+/g, ' ');
const slugify = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));

export function httpsURL(value, label) {
  assert.equal(typeof value, 'string', `${label}: URL is missing`);
  const url = new URL(value);
  assert(url.protocol === 'https:' && !url.username && !url.password, `${label}: expected public HTTPS URL`);
  assert(!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), `${label}: local address is forbidden`);
  return url;
}

export const hostKey = value => httpsURL(value, 'host').hostname.replace(/^www\./, '').toLowerCase();
export function sourceKey(value) {
  const url = httpsURL(value, 'source');
  url.hash = '';
  url.pathname = url.pathname.replace(/\/$/, '') || '/';
  return url.toString().replace(/\/$/, '');
}

function textField(value, label, maximum = 10000) {
  assert(typeof value === 'string' && value.trim() && value.length <= maximum, `${label}: nonempty text required`);
  assert(!value.includes('\0'), `${label}: NUL is forbidden`);
}

function numeric(value, label, { min = 0, max = 99999, integer = false, inclusive = false } = {}) {
  if (!present(value)) return;
  assert(typeof value === 'number' && Number.isFinite(value) && (inclusive ? value >= min : value > min) && value <= max, `${label}: invalid numeric value ${value}`);
  if (integer) assert(Number.isInteger(value), `${label}: integer required`);
}

function range(object, low, high, label, options = {}) {
  const hasLow = present(object[low]), hasHigh = present(object[high]);
  assert.equal(hasLow, hasHigh, `${label}: both endpoints are required`);
  if (!hasLow) return;
  numeric(object[low], `${label} minimum`, options); numeric(object[high], `${label} maximum`, options);
  assert(object[low] <= object[high], `${label}: reversed endpoints`);
}

function sourceType(url) { return /\/products?\//.test(new URL(url).pathname) ? 'official_product_page' : 'official_website'; }

export function normalizeManual(recipe) {
  const manual = structuredClone(recipe.source_brew_parameters?.manual ?? {});
  assert(manual && !Array.isArray(manual) && typeof manual === 'object', `${recipe.slug}: manual must be an object`);
  for (const [old, canonical] of Object.entries(ALIASES)) {
    if (present(manual[old])) {
      assert(!present(manual[canonical]) || manual[canonical] === manual[old], `${recipe.slug}: conflicting ${old} and ${canonical}`);
      manual[canonical] = manual[old]; delete manual[old];
    }
  }
  if (!manual.equipment && typeof manual.brewer === 'string') manual.equipment = manual.brewer;
  if (!manual.equipment && typeof manual.machine === 'string') manual.equipment = manual.machine;
  // Local evidence filenames belong in the repository, not in public app metadata.
  for (const key of Object.keys(manual)) if (key.endsWith('_local_path') || key.endsWith('_local_file')) delete manual[key];
  for (const key of ['yield_grams', 'yield_min_grams', 'yield_max_grams', 'yield_ml', 'yield_min_ml', 'yield_max_ml', 'water_ml', 'water_min_grams', 'water_max_grams', 'water_min_ml', 'water_max_ml', 'ice_grams', 'bypass_water_grams', 'pressure_bar', 'dose_min_grams', 'dose_max_grams', 'time_min_seconds', 'time_max_seconds']) {
    if (!present(recipe[key])) continue;
    assert(!present(manual[key]) || manual[key] === recipe[key], `${recipe.slug}: conflicting top-level ${key}`);
    manual[key] = recipe[key];
  }
  if (typeof manual.yield_derived_from_ratio === 'string') {
    manual.yield_calculation = manual.yield_derived_from_ratio;
    manual.yield_derived_from_ratio = true;
  }
  if (manual.yield_calculation && manual.yield_grams) manual.yield_derived_from_ratio = true;
  if (manual.source_ratio && !manual.source_ratio_text) manual.source_ratio_text = String(manual.source_ratio);
  if (manual.yield_derived_from_ratio) {
    assert.equal(manual.yield_derived_from_ratio, true, `${recipe.slug}: derived yield marker must be boolean`);
    assert(present(manual.yield_calculation) || present(manual.source_ratio_text), `${recipe.slug}: derived yield needs its calculation or published ratio`);
  }
  if (recipe.applicable_coffees) manual.also_applies_to_coffees = structuredClone(recipe.applicable_coffees);
  // A source may publish amounts in mL. These remain mL and never populate water_grams.
  for (const key of ['yield_grams', 'yield_ml', 'water_ml', 'pressure_bar']) numeric(manual[key], `${recipe.slug} ${key}`);
  for (const key of ['ice_grams', 'bypass_water_grams']) numeric(manual[key], `${recipe.slug} ${key}`, { inclusive: true });
  for (const [low, high] of [['yield_min_grams', 'yield_max_grams'], ['yield_min_ml', 'yield_max_ml'], ['water_min_grams', 'water_max_grams'], ['water_min_ml', 'water_max_ml'], ['dose_min_grams', 'dose_max_grams']]) range(manual, low, high, `${recipe.slug} ${low}`);
  range(manual, 'ice_min_grams', 'ice_max_grams', `${recipe.slug} ice range`, { inclusive: true });
  range(manual, 'time_min_seconds', 'time_max_seconds', `${recipe.slug} time`, { integer: true, max: 604800 });
  range(manual, 'temperature_min_c', 'temperature_max_c', `${recipe.slug} temperature`, { inclusive: true, max: 100 });
  for (const key of ['equipment', 'model', 'basket', 'filter']) if (present(manual[key])) textField(manual[key], `${recipe.slug} ${key}`, 1000);
  return manual;
}

function verifyPhoto(coffee, checks) {
  if (!coffee.image_url) return { verified: false, reason: 'The source does not provide a usable product image.' };
  httpsURL(coffee.image_url, `${coffee.name} photo`);
  const matches = checks.filter(check => (check.url === coffee.image_url || check.image_url === coffee.image_url) && (!check.roaster || nameKey(check.roaster) === nameKey(coffee.roaster)));
  const check = matches.find(item => (item.status ?? item.http_status) === 200 && (item.valid_image_signature === true || (Array.isArray(item.dimensions) && item.dimensions.every(value => value > 0)) || item.decoded === true));
  if (!check || coffee.image_display_verified === false) return { verified: false, reason: coffee.image_verification_error ?? 'The exact image URL did not pass an HTTP 200 image decoding check.' };
  const kind = coffee.image_kind ?? check.image_kind;
  if (!['packaging', 'product_artwork', 'origin_photo'].includes(kind)) return { verified: false, reason: 'Image bytes are readable, but image kind has not been visually reviewed.' };
  return { verified: true, image_kind: kind, checked_at: check.checked_at ?? coffee.image_verified_at ?? '2026-10-04', note: coffee.image_note ?? null };
}

function normalizedProcess(source) {
  if (!source) return null;
  const value = source.toLowerCase().trim().replace(/[ -]/g, '_');
  // Only map literal categories, never force mixed/compound treatments into a single process.
  return PROCESS.has(value) ? value : null;
}
function normalizedRoast(source) {
  if (!source) return null;
  const value = source.toLowerCase().trim().replace(/\s+roast$/, '').replace(/[ -]/g, '_');
  return ROAST.has(value) ? value : null;
}

export function compileCatalog({ batches, photoChecks, snapshot, corrections, verifiedAt = '2026-10-04' }) {
  assert.equal(snapshot.project_id, 'ubvzdglrwkkuaigmkjap', 'Unexpected project snapshot');
  assert.equal(verifiedAt, '2026-10-04', 'This reviewed release has a fixed verification date');
  const roasters = [], coffees = [], recipes = [], exclusions = [];
  const roasterMap = new Map(), coffeeMap = new Map(), slugs = new Set(), fingerprints = new Set();
  for (const { region, data } of batches) {
    for (const item of data.roasters) {
      textField(item.name, 'roaster name', 250); textField(item.name_ar ?? item.name, 'Arabic roaster name', 250);
      httpsURL(item.source_url, `${item.name} source`); httpsURL(item.website, `${item.name} website`);
      const identity = `${nameKey(item.name)}\n${hostKey(item.website)}`;
      const existingDefinition = roasterMap.get(nameKey(item.name));
      if (existingDefinition) { assert.equal(existingDefinition.identity, identity, `${item.name}: conflicting roaster domains`); continue; }
      const matches = snapshot.roasters.filter(existing => nameKey(existing.name_en) === nameKey(item.name) && [existing.website_url, existing.source_url].filter(Boolean).some(url => hostKey(url) === hostKey(item.website)));
      assert(matches.length <= 1, `${item.name}: multiple exact existing roasters require review`);
      const existing = matches[0];
      const entry = {
        ...item, key: `roaster-${digest(identity).slice(0, 16)}`, identity, name_key: nameKey(item.name), host_key: hostKey(item.website), region,
        slug: existing?.slug ?? slugify(item.name), existing_id: existing?.id ?? null, action: existing ? 'reuse_exact' : 'create',
      };
      assert(entry.slug, `${item.name}: ASCII slug missing`);
      const collision = snapshot.roasters.find(candidate => candidate.slug === entry.slug && candidate.id !== entry.existing_id);
      assert(!collision, `${item.name}: another roaster already owns slug ${entry.slug}`);
      roasters.push(entry); roasterMap.set(nameKey(item.name), entry);
    }
    for (const excluded of data.excluded ?? []) exclusions.push({ region, ...excluded });
  }
  for (const { region, data } of batches) {
    for (const item of data.coffees) {
      const roaster = roasterMap.get(nameKey(item.roaster));
      assert(roaster, `${item.name}: unknown roaster ${item.roaster}`); textField(item.name, 'coffee name', 500); httpsURL(item.source_url, `${item.name} source`);
      const localKey = `${roaster.key}\n${nameKey(item.name)}`;
      assert(!coffeeMap.has(localKey), `${item.name}: duplicate coffee definition needs explicit resolution`);
      const identity = `${localKey}\n${sourceKey(item.source_url)}`;
      const matches = snapshot.beans.filter(bean => bean.roaster_id === roaster.existing_id && nameKey(bean.name_en) === nameKey(item.name) && bean.source_url && sourceKey(bean.source_url) === sourceKey(item.source_url));
      assert(matches.length <= 1, `${item.name}: multiple exact beans require review`);
      const existing = matches[0];
      // Historical crop labels are part of the name. No token/fuzzy/URL-only crop matching.
      const photo = verifyPhoto(item, photoChecks);
      const sensory = item.sensory_profile ?? null;
      if (sensory) {
        httpsURL(sensory.source_url, `${item.name} sensory source`); numeric(sensory.scale_max, `${item.name} sensory scale`, { max: 100 });
        for (const axis of ['acidity', 'sweetness', 'body', 'fermentation', 'roast']) numeric(sensory[axis], `${item.name} sensory ${axis}`, { inclusive: true, max: sensory.scale_max });
      }
      const entry = {
        ...item, key: `coffee-${digest(identity).slice(0, 16)}`, identity, name_key: nameKey(item.name), source_key: sourceKey(item.source_url), roaster_key: roaster.key, region,
        existing_id: existing?.id ?? null,
        slug: existing?.slug ?? `${roaster.slug}-${slugify(item.name).slice(0, 90)}-${digest(identity).slice(0, 8)}`,
        action: existing ? 'reuse_exact' : photo.verified ? 'create' : 'skip_no_verified_image', photo,
        process_code: normalizedProcess(item.process), roast_level: normalizedRoast(item.roast), sensory_profile: sensory,
      };
      const collision = snapshot.beans.find(bean => bean.slug === entry.slug && bean.id !== entry.existing_id);
      assert(!collision, `${item.name}: another bean owns proposed slug ${entry.slug}`);
      if (entry.action === 'skip_no_verified_image') exclusions.push({ region, url: item.source_url, coffee: item.name, reason: `No new public bean record: ${photo.reason} Recipe source metadata is retained.` });
      coffees.push(entry); coffeeMap.set(localKey, entry);
    }
  }
  for (const { region, data } of batches) {
    for (const item of data.recipes) {
      const r = structuredClone(item);
      assert.match(r.slug, /^[a-z0-9-]+$/); assert(!slugs.has(r.slug), `Duplicate recipe slug ${r.slug}`); slugs.add(r.slug);
      assert(METHODS.has(r.brew_method), `${r.slug}: unsupported brew method`);
      assert(!r.recipe_type || ['official_roaster', 'official_manufacturer', 'verified_barista'].includes(r.recipe_type), `${r.slug}: unexpected source classification`);
      for (const field of ['title', 'title_ar', 'source_author_name']) textField(r[field], `${r.slug} ${field}`, 1000);
      httpsURL(r.source_url, `${r.slug} source`);
      if (r.approved_previous_source_urls) {
        assert.match(r.existing_recipe_id ?? '', /^[0-9a-f-]{36}$/);
        assert(r.expected_existing_parameters && r.source_upgrade_basis, `${r.slug}: a reviewed source upgrade requires expected values and evidence`);
        r.approved_previous_source_urls.forEach(url => httpsURL(url, `${r.slug} previous source`));
      }
      const roaster = roasterMap.get(nameKey(r.roaster_name)); assert(roaster, `${r.slug}: unknown roaster`);
      const coffee = r.coffee_name ? coffeeMap.get(`${roaster.key}\n${nameKey(r.coffee_name)}`) : null;
      assert(!r.coffee_name || coffee, `${r.slug}: named coffee is missing from the reviewed definitions`);
      const manual = normalizeManual(r);
      if (r.brew_method === 'espresso') {
        assert(!present(r.water_grams) && !present(r.water_ml) && !present(manual.water_ml) && !present(manual.water_min_grams) && !present(manual.water_min_ml), `${r.slug}: espresso output must never occupy input-water fields`);
        manual.scalable = false;
      }
      const params = { ...r.source_brew_parameters, manual };
      const manualEvidence = Object.entries(manual).filter(([key, value]) => /(?:^|_)url$/.test(key) && typeof value === 'string' && value.startsWith('https://')).map(([, value]) => value);
      const sourceURLs = unique([r.source_url, r.source_author_url, r.source_country_url, coffee?.source_url, ...(r.source_urls ?? []), ...(manual.supporting_source_urls ?? []), ...manualEvidence]);
      sourceURLs.forEach(url => httpsURL(url, `${r.slug} evidence`));
      assert(!r.creator_country || r.source_country_url, `${r.slug}: creator country needs documentary country evidence`);
      assert(['hot', 'iced', 'cold', 'unknown'].includes(r.serving_style ?? 'unknown'), `${r.slug}: invalid serving style`);
      const flavors = unique(r.flavor_notes ?? []), flavorsAr = unique(r.flavor_notes_ar ?? []), families = unique(r.flavor_families ?? []);
      families.forEach(family => assert(FAMILIES.has(family), `${r.slug}: invalid flavor family ${family}`));
      const sharedNames = unique([r.coffee_name, ...[manual.also_applies_to_coffees, manual.applies_to_coffee_names].filter(Array.isArray).flat().map(item => typeof item === 'string' ? item : item.coffee_name ?? item.name)]);
      const sharedCoffees = sharedNames.map(name => {
        const linked = coffeeMap.get(`${roaster.key}\n${nameKey(name)}`);
        assert(linked, `${r.slug}: shared coffee ${name} is not defined for this roaster`);
        return linked;
      });
      const discovery = compact({
        creator_name: r.source_author_name, creator_name_ar: r.source_author_name_ar ?? (r.source_author_name === r.roaster_name ? roaster.name_ar : null),
        creator_country: r.creator_country, creator_country_ar: r.creator_country_ar,
        recipe_country: r.recipe_country, recipe_country_ar: r.recipe_country_ar,
        coffee_origin: r.coffee_origin ?? coffee?.origin, coffee_origin_ar: r.coffee_origin_ar ?? coffee?.origin_ar,
        coffee_type: r.coffee_type ?? coffee?.coffee_type, coffee_type_ar: r.coffee_type_ar ?? coffee?.coffee_type_ar ?? TYPE_AR[r.coffee_type ?? coffee?.coffee_type],
        coffee_name: r.coffee_name, coffee_name_ar: r.coffee_name_ar ?? coffee?.name_ar,
        applicable_coffee_names: sharedCoffees.map(c => c.name), applicable_coffee_names_ar: sharedCoffees.map(c => c.name_ar).filter(present),
        roaster_name: roaster.name, roaster_name_ar: roaster.name_ar,
        flavor_notes: flavors, flavor_notes_ar: flavorsAr, flavor_families: families,
        serving_style: r.serving_style === 'unknown' ? null : r.serving_style, source_urls: sourceURLs,
      });
      params.discovery = { ...r.source_brew_parameters?.discovery, ...discovery };
      params.global_roasters_import = compact({ import_id: IMPORT_ID, verified_at: verifiedAt, region, recipe_source_url: r.source_url, coffee_key: coffee?.key, coffee_source_url: coffee?.source_url, source_process: coffee?.process, source_roast_label: coffee?.roast, crop_note: coffee?.crop_note, photo_note: coffee?.photo.note });
      if (coffee?.photo.verified) Object.assign(params.global_roasters_import, { photo_kind: coffee.photo.image_kind, photo_source_url: coffee.source_url, photo_url: coffee.image_url });
      if (r.existing_recipe_id) params.global_roasters_import.source_upgrade = { existing_recipe_id: r.existing_recipe_id, previous_source_urls: r.approved_previous_source_urls, basis: r.source_upgrade_basis };
      if (r.steps?.some(step => present(step.start_at_seconds) || (step.step_kind && !STEP_KINDS.has(step.step_kind)))) {
        params.global_roasters_import.source_steps = r.steps.map((step, index) => compact({ step_number: index + 1, source_step_kind: step.step_kind, start_at_seconds: step.start_at_seconds }));
      }
      assert(Array.isArray(r.steps) && r.steps.length > 0, `${r.slug}: at least one source-grounded step is required`);
      const steps = r.steps.map((step, index) => {
        for (const key of ['title', 'title_ar', 'description', 'description_ar']) textField(step[key], `${r.slug} step ${index + 1} ${key}`);
        numeric(step.duration_seconds, `${r.slug} step duration`, { inclusive: true, integer: true, max: 604800 });
        return { ...step, step_number: index + 1, step_kind: STEP_KINDS.has(step.step_kind) ? step.step_kind : 'other' };
      });
      if ((r.pours ?? []).some(pour => !present(pour.is_bloom))) params.global_roasters_import.source_pours = structuredClone(r.pours);
      const pours = (r.pours ?? []).map((pour, index) => {
        numeric(pour.water_grams, `${r.slug} pour water`); assert(present(pour.water_grams), `${r.slug}: mL pours must stay in manual metadata, not recipe_pours`);
        numeric(pour.start_at_seconds, `${r.slug} pour start`, { inclusive: true, integer: true, max: 604800 });
        numeric(pour.temperature_c, `${r.slug} pour temperature`, { inclusive: true, max: 100 });
        assert(!present(pour.is_bloom) || typeof pour.is_bloom === 'boolean', `${r.slug}: invalid bloom flag`);
        // A missing bloom label does not imply a bloom. Preserve the raw null in provenance.
        return { ...pour, pour_number: index + 1, start_at_seconds: pour.start_at_seconds ?? null, is_bloom: pour.is_bloom === true };
      });
      numeric(r.dose_grams, `${r.slug} dose`, { max: 9999.99 }); numeric(r.water_grams, `${r.slug} water`, { max: 99999.99 });
      numeric(r.total_time_seconds, `${r.slug} total time`, { integer: true, max: 604800 }); numeric(r.water_temp_c, `${r.slug} temperature`, { inclusive: true, max: 100 });
      range(r, 'water_temp_c_min', 'water_temp_c_max', `${r.slug} temperature range`, { inclusive: true, max: 100 });
      const hasTemperature = present(r.water_temp_c) || present(r.water_temp_c_min) || present(manual.temperature_min_c);
      const hasTime = present(r.total_time_seconds) || present(manual.time_min_seconds);
      const hasDose = present(r.dose_grams) || present(manual.dose_min_grams);
      const hasQuantity = r.brew_method === 'espresso'
        ? ['yield_grams', 'yield_min_grams', 'yield_ml', 'yield_min_ml'].some(key => present(manual[key]))
        : present(r.water_grams) || ['water_ml', 'water_min_grams', 'water_min_ml'].some(key => present(manual[key]));
      const incomplete = r.is_incomplete_source === true || manual.parameter_only_source === true || !hasDose || !hasQuantity || !hasTemperature || !hasTime;
      let poursValidated = false;
      if (pours.length && present(r.water_grams)) {
        const sum = pours.reduce((total, pour) => total + pour.water_grams, 0);
        const close = Math.abs(sum - r.water_grams) < 0.01;
        if (r.pour_sum_validated !== false) assert(close, `${r.slug}: pour sum ${sum} differs from published water ${r.water_grams}`);
        poursValidated = close && r.pour_sum_validated !== false;
      }
      if (r.pour_sum_validated === true) assert(poursValidated, `${r.slug}: falsely validated pours`);
      if (r.video_url) httpsURL(r.video_url, `${r.slug} video`);
      const fingerprint = JSON.stringify([roaster.key, sourceKey(r.source_url), r.brew_method, coffee?.key ?? null, r.dose_grams, r.water_grams, r.water_ml, r.serving_style]);
      assert(!fingerprints.has(fingerprint), `${r.slug}: repeated same-source recipe requires consolidation`); fingerprints.add(fingerprint);
      // Budget for PostgreSQL jsonb whitespace/escaping, whose serialized size is slightly larger.
      assert(Buffer.byteLength(JSON.stringify(params)) < 42000, `${r.slug}: metadata exceeds safe size`);
      recipes.push({
        ...r, region, roaster_key: roaster.key, coffee_key: coffee?.key ?? null, bean_action: coffee?.action ?? 'not_applicable',
        recipe_type: r.recipe_type ?? 'official_roaster', serving_style: r.serving_style ?? 'unknown',
        flavor_notes: flavors, steps, pours, source_type: sourceType(r.source_url), source_brew_parameters: params,
        water_temp_c_min: r.water_temp_c_min ?? manual.temperature_min_c ?? null,
        water_temp_c_max: r.water_temp_c_max ?? manual.temperature_max_c ?? null,
        is_incomplete_source: incomplete, pour_sum_validated: poursValidated,
        source_process: coffee?.process ?? null, source_varietal: coffee?.variety ?? null,
        cover_image_url: coffee?.photo.verified ? coffee.image_url : null,
      });
    }
  }
  for (const coffee of coffees) {
    const documented = recipes.filter(recipe => recipe.coffee_key === coffee.key || (recipe.roaster_key === coffee.roaster_key && [recipe.source_brew_parameters.manual.applies_to_coffee_names, recipe.source_brew_parameters.manual.also_applies_to_coffees].some(list => Array.isArray(list) && list.some(name => nameKey(typeof name === 'string' ? name : name.coffee_name ?? name.name) === coffee.name_key))));
    coffee.suitable_for_v60 = documented.some(recipe => recipe.brew_method === 'v60');
    coffee.suitable_for_espresso = documented.some(recipe => recipe.brew_method === 'espresso');
    coffee.suitable_for_xbloom = documented.some(recipe => recipe.brew_method === 'xbloom');
  }
  for (const correction of corrections) {
    assert.match(correction.slug, /^[a-z0-9-]+$/); assert(!slugs.has(correction.slug), 'Correction collides with new recipe');
    httpsURL(correction.source_url, `${correction.slug} correction source`);
    normalizeManual({ slug: correction.slug, source_brew_parameters: { manual: correction.manual } });
  }
  const count = (items, key) => Object.fromEntries(unique(items.map(item => item[key])).map(value => [value, items.filter(item => item[key] === value).length]));
  const counts = { roasters: roasters.length, roaster_actions: count(roasters, 'action'), coffees: coffees.length, coffee_actions: count(coffees, 'action'), recipes: recipes.length, recipes_by_region: count(recipes, 'region'), recipes_by_method: count(recipes, 'brew_method'), recipes_by_serving: count(recipes, 'serving_style'), recipes_with_bean: recipes.filter(r => r.coffee_key && r.bean_action !== 'skip_no_verified_image').length, incomplete_recipes: recipes.filter(r => r.is_incomplete_source).length, corrections: corrections.length, exclusions: exclusions.length };
  counts.new_recipes = recipes.filter(r => !r.existing_recipe_id).length;
  counts.updated_recipes = recipes.filter(r => r.existing_recipe_id).length;
  return { import_id: IMPORT_ID, project_id: snapshot.project_id, verified_at: verifiedAt, counts, roasters, coffees, recipes, corrections, exclusions };
}

export function loadCatalog(directory = DEFAULT_DIRECTORY) {
  const config = readJSON(resolve(directory, 'index.json'));
  const batches = config.regions.map(region => ({ region: region.name, data: readJSON(resolve(directory, region.catalog)) }));
  const photoChecks = config.regions.flatMap(region => {
    const check = readJSON(resolve(directory, region.photos));
    return Array.isArray(check) ? check : check.images ?? check.results ?? check.photos ?? [];
  });
  return compileCatalog({ batches, photoChecks, snapshot: readJSON(resolve(directory, config.snapshot)), corrections: readJSON(resolve(directory, config.corrections)).corrections, verifiedAt: config.verified_at });
}

export function resolutionManifest(catalog) {
  return {
    import_id: catalog.import_id, project_id: catalog.project_id, verified_at: catalog.verified_at, counts: catalog.counts,
    identity_policy: 'Roasters: exact normalized name plus documented domain. Beans: exact resolved roaster, full name including crop, and product source URL. No fuzzy, token, URL-only, or cross-crop matching. Runtime repeats ownership and identity guards.',
    roasters: catalog.roasters.map(r => ({ key: r.key, name: r.name, website: r.website, existing_id: r.existing_id, slug: r.slug, action: r.action })),
    coffees: catalog.coffees.map(c => ({ key: c.key, roaster: c.roaster, name: c.name, source_url: c.source_url, existing_id: c.existing_id, slug: c.slug, action: c.action, photo: c.photo })),
    recipes: catalog.recipes.map(r => ({ slug: r.slug, existing_recipe_id: r.existing_recipe_id ?? null, approved_previous_source_urls: r.approved_previous_source_urls ?? [], coffee_key: r.coffee_key, bean_action: r.bean_action, brew_method: r.brew_method, source_url: r.source_url, is_incomplete_source: r.is_incomplete_source })),
    corrections: catalog.corrections.map(c => ({ slug: c.slug, expected_id: c.expected_id, source_url: c.source_url })), exclusions: catalog.exclusions,
  };
}

export function splitCatalog(catalog, { beansPerPart = 20, recipesPerPart = 8, maxBytes = 20000 } = {}) {
  assert(Number.isInteger(beansPerPart) && beansPerPart > 0 && Number.isInteger(recipesPerPart) && recipesPerPart > 0);
  assert(Number.isInteger(maxBytes) && maxBytes > 0, 'maxBytes must be a positive integer');
  const subsets = [];
  const makeSubset = (phase, rows) => {
    let roasters = [], coffees = [], recipes = [], corrections = [];
    if (phase === 'roasters') roasters = rows;
    if (phase === 'beans') {
      coffees = rows;
      const keys = new Set(coffees.map(c => c.roaster_key));
      roasters = catalog.roasters.filter(r => keys.has(r.key));
    }
    if (phase === 'recipes') {
      recipes = rows;
      const coffeeKeys = new Set(recipes.map(r => r.coffee_key));
      const roasterKeys = new Set(recipes.map(r => r.roaster_key));
      coffees = catalog.coffees.filter(c => coffeeKeys.has(c.key));
      roasters = catalog.roasters.filter(r => roasterKeys.has(r.key));
    }
    if (phase === 'corrections') corrections = rows;
    const creates = phase === 'beans' ? coffees.filter(c => c.action === 'create').length : 0;
    const counts = { ...catalog.counts, roasters: roasters.length, coffees: coffees.length, recipes: recipes.length, corrections: corrections.length, coffee_actions: { create: creates } };
    return { ...catalog, sql_phase: phase, roasters, coffees, recipes, corrections, counts };
  };
  const pack = (phase, records, maximumCount) => {
    let offset = 0;
    while (offset < records.length) {
      let accepted, count = 0;
      for (let size = 1; size <= maximumCount && offset + size <= records.length; size++) {
        const candidate = makeSubset(phase, records.slice(offset, offset + size));
        const bytes = Buffer.byteLength(generateSQL(candidate));
        if (bytes > maxBytes) {
          assert(size !== 1, `${phase} record ${records[offset].slug ?? records[offset].name} requires ${bytes} bytes; limit is ${maxBytes}. No oversized part was emitted.`);
          break;
        }
        accepted = candidate; count = size;
      }
      assert(accepted && count > 0);
      const name = `${String(subsets.length).padStart(2, '0')}-${phase}-${offset + 1}-${offset + count}.sql`;
      subsets.push({ name, catalog: accepted });
      offset += count;
    }
  };
  pack('roasters', catalog.roasters, catalog.roasters.length);
  pack('beans', catalog.coffees, beansPerPart);
  pack('recipes', catalog.recipes, recipesPerPart);
  pack('corrections', catalog.corrections, catalog.corrections.length);
  return subsets;
}

// SQL is deliberately emitted as one transaction. Application rows are never removed.
// Upserts preserve every existing row ID. Extra instructions require explicit review.
export function generateSQL(catalog) {
  const pick = (object, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(object, key)).map(key => [key, object[key]]));
  // The checked-in catalog retains complete provenance. SQL carries only fields it uses.
  const referencesOnly = ['beans', 'recipes'].includes(catalog.sql_phase);
  const coffeeReferencesOnly = catalog.sql_phase === 'recipes';
  const hasSourceUpgrade = catalog.recipes.some(r => r.existing_recipe_id);
  const hasPours = catalog.recipes.some(r => r.pours.length > 0);
  const payload = JSON.stringify({
    import_id: catalog.import_id, verified_at: catalog.verified_at,
    roasters: catalog.roasters.map(r => pick(r, referencesOnly ? ['key','name','name_key','host_key','existing_id'] : ['key','name','name_ar','country','website','source_url','name_key','host_key','existing_id','slug'])),
    coffees: catalog.coffees.map(c => pick(c, coffeeReferencesOnly ? ['key','name','roaster_key','existing_id','name_key','source_key','action'] : ['key','name','name_ar','roaster','roaster_key','existing_id','slug','name_key','source_key','source_url','image_url','action','photo','origin','variety','process_code','roast_level','description_ar','description_en','suitable_for_v60','suitable_for_espresso','suitable_for_xbloom','sensory_profile','flavor_notes'])),
    recipes: catalog.recipes.map(r => pick(r, ['slug','roaster_key','coffee_key','title','title_ar','brew_method','recipe_type','dose_grams','water_grams','water_temp_c','water_temp_c_min','water_temp_c_max','total_time_seconds','grinder_setting','notes','notes_ar','flavor_notes','source_author_name','roaster_name','coffee_name','coffee_origin','source_process','source_varietal','source_brew_parameters','serving_style','pour_sum_validated','is_incomplete_source','video_url','cover_image_url','steps','pours','source_url','source_type','existing_recipe_id','approved_previous_source_urls','expected_existing_parameters'])),
    corrections: catalog.corrections,
  });
  assert(!payload.includes('$global_catalog$') && !payload.includes('$apply_global$'), 'SQL delimiter appears in source data');
  const methodGuard = catalog.recipes.length ? `
  if exists (select 1 from jsonb_array_elements(v_catalog->'recipes') x where not exists (select 1 from public.brew_methods bm where bm.code=x.value->>'brew_method')) then
    raise exception 'Required brew methods are missing; apply the reviewed discovery migration first';
  end if;
` : '';
  const roasterBlock = catalog.roasters.length ? `
  for v_r in select value from jsonb_array_elements(v_catalog->'roasters') loop
    select array_agg(ro.id) into v_ids from public.roasters ro
    where lower(regexp_replace(btrim(ro.name_en), '\\s+', ' ', 'g'))=v_r->>'name_key'
      and (lower(regexp_replace(split_part(regexp_replace(coalesce(ro.website_url,''), '^https?://', ''), '/', 1), '^www\\.', ''))=v_r->>'host_key'
        or lower(regexp_replace(split_part(regexp_replace(coalesce(ro.source_url,''), '^https?://', ''), '/', 1), '^www\\.', ''))=v_r->>'host_key');
    if coalesce(cardinality(v_ids),0)>1 then raise exception 'Multiple exact roasters: %',v_r->>'name'; end if;
    v_roaster_id := v_ids[1];
    if v_r->>'existing_id' is not null and v_roaster_id is distinct from (v_r->>'existing_id')::uuid then raise exception 'Reviewed roaster identity changed: %',v_r->>'name'; end if;
${referencesOnly ? `    if v_roaster_id is null then raise exception 'Required reviewed roaster is missing: %',v_r->>'name'; end if;` : `    if v_roaster_id is null then
      if exists(select 1 from public.roasters ro where ro.slug=v_r->>'slug') then raise exception 'Roaster slug conflict: %',v_r->>'slug'; end if;
      insert into public.roasters(slug,name_ar,name_en,country,website_url,source_type,source_url,source_name,last_verified_at,data_confidence,requires_review,logo_usage_status)
      values(v_r->>'slug',coalesce(v_r->>'name_ar',v_r->>'name'),v_r->>'name',v_r->>'country',v_r->>'website','official_website',v_r->>'source_url',v_r->>'name',(v_catalog->>'verified_at')::timestamptz,'official',false,'placeholder_only')
      returning id into v_roaster_id;
    end if;`}
    -- Existing catalog rows are reused without altering ownership, media or metadata.
    v_roaster_ids := v_roaster_ids || jsonb_build_object(v_r->>'key',v_roaster_id);
  end loop;
` : '';
  const coffeeBlock = catalog.coffees.length ? `
  for v_c in select value from jsonb_array_elements(v_catalog->'coffees') loop
    v_bean_id := null; v_roaster_id := (v_roaster_ids->>(v_c->>'roaster_key'))::uuid;
    if v_c->>'action'='skip_no_verified_image' then
      v_bean_ids := v_bean_ids || jsonb_build_object(v_c->>'key',null); continue;
    end if;
    select array_agg(b.id) into v_ids from public.beans b where b.roaster_id=v_roaster_id and b.is_published and not b.requires_review
      and lower(regexp_replace(btrim(b.name_en),'\\s+',' ','g'))=v_c->>'name_key'
      and rtrim(b.source_url,'/')=v_c->>'source_key';
    if coalesce(cardinality(v_ids),0)>1 then raise exception 'Multiple exact beans: %',v_c->>'name'; end if;
    v_bean_id := v_ids[1];
    if v_c->>'existing_id' is not null and v_bean_id is distinct from (v_c->>'existing_id')::uuid then raise exception 'Reviewed bean identity changed: %',v_c->>'name'; end if;
${coffeeReferencesOnly ? `    if v_bean_id is null then raise exception 'Required reviewed coffee is missing: %',v_c->>'name'; end if;` : `    if v_bean_id is null then
      if exists(select 1 from public.beans b where b.slug=v_c->>'slug') then raise exception 'Bean slug conflict: %',v_c->>'slug'; end if;
      if not coalesce((v_c->'photo'->>'verified')::boolean,false) then raise exception 'Unverified new bean image: %',v_c->>'name'; end if;
      insert into public.beans(slug,roaster_id,created_by,name_ar,name_en,origin_country,varietal,process,roast_level,description_ar,description_en,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom,is_published,source_type,source_url,source_name,last_verified_at,data_confidence,requires_review,image_url,image_source_url,image_usage_status,image_kind,sensory_profile)
      values(v_c->>'slug',v_roaster_id,v_curator,coalesce(v_c->>'name_ar',v_c->>'name'),v_c->>'name',v_c->>'origin',v_c->>'variety',v_c->>'process_code',v_c->>'roast_level',v_c->>'description_ar',v_c->>'description_en',(v_c->>'suitable_for_v60')::boolean,(v_c->>'suitable_for_espresso')::boolean,(v_c->>'suitable_for_xbloom')::boolean,true,'official_product_page',v_c->>'source_url',v_c->>'roaster',(v_catalog->>'verified_at')::timestamptz,'official',false,v_c->>'image_url',v_c->>'source_url','source_linked',v_c->'photo'->>'image_kind',coalesce(nullif(v_c->'sensory_profile','null'::jsonb),'{}'::jsonb))
      returning id into v_bean_id;
      insert into public.bean_flavor_notes(bean_id,flavor)
      select v_bean_id,n.value from jsonb_array_elements_text(coalesce(v_c->'flavor_notes','[]'::jsonb)) n(value)
      on conflict(bean_id,flavor) do nothing;
    end if;`}
    v_bean_ids := v_bean_ids || jsonb_build_object(v_c->>'key',v_bean_id);
  end loop;
` : '';
  const recipeBlock = catalog.recipes.length ? `
  for v_r in select value from jsonb_array_elements(v_catalog->'recipes') loop
    v_bean_id := (v_bean_ids->>(v_r->>'coffee_key'))::uuid;
    v_roaster_id := (v_roaster_ids->>(v_r->>'roaster_key'))::uuid;
    select re.* into v_old from public.recipes re where re.slug=v_r->>'slug' for update;
    if found then
      if v_old.user_id is distinct from v_curator or v_old.brew_method is distinct from v_r->>'brew_method' then raise exception 'Recipe owner/method conflict: %',v_r->>'slug'; end if;
      if v_old.visibility is distinct from 'public' then raise exception 'Existing recipe is no longer public: %',v_r->>'slug'; end if;
${hasSourceUpgrade ? `      if v_r->>'existing_recipe_id' is not null and v_old.id is distinct from (v_r->>'existing_recipe_id')::uuid then raise exception 'Reviewed recipe ID changed: %',v_r->>'slug'; end if;` : ''}
      if v_old.bean_id is not null and v_old.bean_id is distinct from v_bean_id then raise exception 'Existing recipe has a different bean link: %',v_r->>'slug'; end if;
      if exists(select 1 from public.recipe_steps rs where rs.recipe_id=v_old.id and rs.step_number>jsonb_array_length(v_r->'steps')) then raise exception 'Existing recipe has extra steps requiring explicit review: %',v_r->>'slug'; end if;
      if exists(select 1 from public.recipe_pours rp where rp.recipe_id=v_old.id and rp.pour_number>jsonb_array_length(v_r->'pours')) then raise exception 'Existing recipe has extra pours requiring explicit review: %',v_r->>'slug'; end if;
${hasSourceUpgrade ? `      if not exists(select 1 from public.recipe_sources rs where rs.recipe_id=v_old.id and rs.source_url=v_r->>'source_url') then
        if v_r->>'existing_recipe_id' is null
          or not exists(select 1 from public.recipe_sources rs where rs.recipe_id=v_old.id and rs.source_url in (select jsonb_array_elements_text(coalesce(v_r->'approved_previous_source_urls','[]'::jsonb))))
          or v_old.dose_grams is distinct from (v_r->'expected_existing_parameters'->>'dose_grams')::numeric
          or v_old.water_grams is distinct from (v_r->'expected_existing_parameters'->>'water_grams')::numeric
          or v_old.total_time_seconds is distinct from (v_r->'expected_existing_parameters'->>'total_time_seconds')::integer
        then raise exception 'Existing recipe source identity conflict: %',v_r->>'slug'; end if;
      end if;
    elsif v_r->>'existing_recipe_id' is not null then
      raise exception 'Reviewed existing recipe is missing: %',v_r->>'slug';` : `      if not exists(select 1 from public.recipe_sources rs where rs.recipe_id=v_old.id and rs.source_url=v_r->>'source_url') then raise exception 'Existing recipe source identity conflict: %',v_r->>'slug'; end if;`}
    end if;
    v_existing_metadata := coalesce(v_old.source_brew_parameters,'{}'::jsonb);
    insert into public.recipes(slug,user_id,bean_id,title,title_ar,brew_method,recipe_type,visibility,dose_grams,water_grams,water_temp_c,water_temp_c_min,water_temp_c_max,total_time_seconds,grinder_setting,notes,notes_ar,content_language,flavor_notes,source_author_name,source_roaster_name,source_coffee_name,source_origin_country,source_process,source_varietal,source_tasting_notes,source_brew_parameters,difficulty,serving_style,pour_sum_validated,is_incomplete_source,video_url,cover_image_url)
    values(v_r->>'slug',v_curator,v_bean_id,v_r->>'title',v_r->>'title_ar',v_r->>'brew_method',v_r->>'recipe_type','public',(v_r->>'dose_grams')::numeric,(v_r->>'water_grams')::numeric,(v_r->>'water_temp_c')::numeric,(v_r->>'water_temp_c_min')::numeric,(v_r->>'water_temp_c_max')::numeric,(v_r->>'total_time_seconds')::integer,v_r->>'grinder_setting',v_r->>'notes',v_r->>'notes_ar','en',array(select jsonb_array_elements_text(v_r->'flavor_notes')),v_r->>'source_author_name',v_r->>'roaster_name',v_r->>'coffee_name',v_r->>'coffee_origin',v_r->>'source_process',v_r->>'source_varietal',array_to_string(array(select jsonb_array_elements_text(v_r->'flavor_notes')),', '),
      v_existing_metadata || (v_r->'source_brew_parameters') || jsonb_build_object('manual',coalesce(v_existing_metadata->'manual','{}'::jsonb) || (v_r->'source_brew_parameters'->'manual'),'discovery',coalesce(v_existing_metadata->'discovery','{}'::jsonb) || (v_r->'source_brew_parameters'->'discovery') || jsonb_build_object('roaster_id',v_roaster_id)),
      null,v_r->>'serving_style',(v_r->>'pour_sum_validated')::boolean,(v_r->>'is_incomplete_source')::boolean,v_r->>'video_url',v_r->>'cover_image_url')
    on conflict(slug) do update set bean_id=coalesce(public.recipes.bean_id,excluded.bean_id),title=excluded.title,title_ar=excluded.title_ar,recipe_type=excluded.recipe_type,visibility=excluded.visibility,dose_grams=excluded.dose_grams,water_grams=excluded.water_grams,water_temp_c=excluded.water_temp_c,water_temp_c_min=excluded.water_temp_c_min,water_temp_c_max=excluded.water_temp_c_max,total_time_seconds=excluded.total_time_seconds,grinder_setting=excluded.grinder_setting,notes=excluded.notes,notes_ar=excluded.notes_ar,flavor_notes=excluded.flavor_notes,source_author_name=excluded.source_author_name,source_roaster_name=excluded.source_roaster_name,source_coffee_name=excluded.source_coffee_name,source_origin_country=excluded.source_origin_country,source_process=excluded.source_process,source_varietal=excluded.source_varietal,source_tasting_notes=excluded.source_tasting_notes,source_brew_parameters=excluded.source_brew_parameters,serving_style=excluded.serving_style,pour_sum_validated=excluded.pour_sum_validated,is_incomplete_source=excluded.is_incomplete_source,video_url=coalesce(excluded.video_url,public.recipes.video_url),cover_image_url=case when nullif(btrim(public.recipes.cover_image_url),'') is null then excluded.cover_image_url else public.recipes.cover_image_url end
    where public.recipes.user_id=v_curator and public.recipes.brew_method=excluded.brew_method and public.recipes.visibility='public'
      and (public.recipes.bean_id is null or public.recipes.bean_id is not distinct from excluded.bean_id)
    returning id into v_recipe_id;
    if v_recipe_id is null then raise exception 'Recipe concurrent ownership conflict: %',v_r->>'slug'; end if;
    for v_s in select value from jsonb_array_elements(v_r->'steps') loop
      insert into public.recipe_steps(recipe_id,step_number,title,title_ar,description,description_ar,step_kind,duration_seconds)
      values(v_recipe_id,(v_s->>'step_number')::integer,v_s->>'title',v_s->>'title_ar',v_s->>'description',v_s->>'description_ar',v_s->>'step_kind',(v_s->>'duration_seconds')::integer)
      on conflict(recipe_id,step_number) do update set title=excluded.title,title_ar=excluded.title_ar,description=excluded.description,description_ar=excluded.description_ar,step_kind=excluded.step_kind,duration_seconds=excluded.duration_seconds;
    end loop;
${hasPours ? `    for v_p in select value from jsonb_array_elements(v_r->'pours') loop
      insert into public.recipe_pours(recipe_id,pour_number,water_grams,start_at_seconds,is_bloom,temperature_c,flow_rate_ml_per_s,duration_seconds,pause_after_seconds)
      values(v_recipe_id,(v_p->>'pour_number')::integer,(v_p->>'water_grams')::numeric,(v_p->>'start_at_seconds')::integer,(v_p->>'is_bloom')::boolean,(v_p->>'temperature_c')::numeric,(v_p->>'flow_rate_ml_per_s')::numeric,(v_p->>'duration_seconds')::integer,(v_p->>'pause_after_seconds')::integer)
      on conflict(recipe_id,pour_number) do update set water_grams=excluded.water_grams,start_at_seconds=excluded.start_at_seconds,is_bloom=excluded.is_bloom,temperature_c=excluded.temperature_c,flow_rate_ml_per_s=excluded.flow_rate_ml_per_s,duration_seconds=excluded.duration_seconds,pause_after_seconds=excluded.pause_after_seconds;
    end loop;` : ''}
    update public.recipe_sources rs set source_name=v_r->>'source_author_name',source_type=v_r->>'source_type',data_confidence='official',last_verified_at=(v_catalog->>'verified_at')::timestamptz where rs.recipe_id=v_recipe_id and rs.source_url=v_r->>'source_url';
    insert into public.recipe_sources(recipe_id,source_url,source_name,source_type,data_confidence,last_verified_at)
    select v_recipe_id,v_r->>'source_url',v_r->>'source_author_name',v_r->>'source_type','official',(v_catalog->>'verified_at')::timestamptz
    where not exists(select 1 from public.recipe_sources rs where rs.recipe_id=v_recipe_id and rs.source_url=v_r->>'source_url');
  end loop;
` : '';
  const correctionBlock = catalog.corrections.length ? `
  for v_fix in select value from jsonb_array_elements(v_catalog->'corrections') loop
    select re.* into strict v_old from public.recipes re where re.slug=v_fix->>'slug' for update;
    if v_old.id is distinct from (v_fix->>'expected_id')::uuid or v_old.user_id is distinct from v_curator or v_old.visibility is distinct from 'public' or v_old.brew_method<>'espresso' or v_old.dose_grams is distinct from (v_fix->>'expected_dose_grams')::numeric then raise exception 'Espresso correction identity conflict: %',v_fix->>'slug'; end if;
    if not exists(select 1 from public.recipe_sources rs where rs.recipe_id=v_old.id and rs.source_url=v_fix->>'source_url') then raise exception 'Espresso correction source conflict: %',v_fix->>'slug'; end if;
    v_existing_manual := coalesce(v_old.source_brew_parameters->'manual','{}'::jsonb);
    -- The second branch accepts this exact already-applied correction, making reruns safe.
    if not ((v_old.water_grams is not distinct from (v_fix->>'expected_water_grams')::numeric and v_old.total_time_seconds is not distinct from (v_fix->>'expected_total_time_seconds')::integer)
      or (v_old.water_grams is null and v_old.total_time_seconds is not distinct from (v_fix->>'total_time_seconds')::integer and v_existing_manual @> (v_fix->'manual'))) then raise exception 'Espresso correction old values changed: %',v_fix->>'slug'; end if;
    if exists(select 1 from jsonb_each(v_fix->'manual') incoming where v_existing_manual ? incoming.key and v_existing_manual->incoming.key is distinct from incoming.value) then raise exception 'Espresso correction existing metadata conflict: %',v_fix->>'slug'; end if;
    update public.recipes re set water_grams=null,total_time_seconds=(v_fix->>'total_time_seconds')::integer,
      source_brew_parameters=coalesce(re.source_brew_parameters,'{}'::jsonb) || jsonb_build_object('manual',v_existing_manual || (v_fix->'manual'),'espresso_semantics_review',jsonb_build_object('verified_at',v_catalog->>'verified_at','source_url',v_fix->>'source_url','import_id',v_catalog->>'import_id'))
    where re.id=v_old.id and re.user_id=v_curator;
  end loop;
` : '';
  return `-- BeanMora ${catalog.import_id}; reviewed ${catalog.verified_at}.
-- Offline generated DML for project ${catalog.project_id}. Requires discovery/image-kind migration first.
-- ${catalog.counts.recipes} recipes, ${catalog.counts.coffee_actions.create ?? 0} new verified-image beans, ${catalog.counts.corrections} narrow espresso corrections.
begin;
do $apply_global$
declare
  v_catalog jsonb := $global_catalog$${payload}$global_catalog$::jsonb;
  v_curator uuid; v_roaster_id uuid; v_bean_id uuid; v_recipe_id uuid; v_ids uuid[];
  v_roaster_ids jsonb := '{}'::jsonb; v_bean_ids jsonb := '{}'::jsonb;
  v_r jsonb; v_c jsonb; v_s jsonb; v_p jsonb; v_fix jsonb; v_old public.recipes%rowtype;
  v_existing_metadata jsonb; v_existing_manual jsonb;
begin
  -- Serialize this catalog compiler only; do not block unrelated application writes.
  perform pg_advisory_xact_lock(1742026104, 401);
  select p.id into strict v_curator from public.profiles p where p.username = 'beanmora_official';
${methodGuard}${roasterBlock}${coffeeBlock}${recipeBlock}${correctionBlock}
end
$apply_global$;
commit;
`;
}

function main() {
  const args = process.argv.slice(2);
  let directory = DEFAULT_DIRECTORY, manifestPath, catalogPath, partsDirectory, maxBytes = 20000, check = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--check') check = true;
    else if (['--directory', '--manifest', '--catalog', '--parts-directory', '--max-bytes'].includes(arg)) {
      const value = args[++index]; assert(value && !value.startsWith('--'), `${arg} requires a path`);
      if (arg === '--directory') directory = resolve(value); else if (arg === '--manifest') manifestPath = resolve(value); else if (arg === '--catalog') catalogPath = resolve(value); else if (arg === '--parts-directory') partsDirectory = resolve(value); else { maxBytes = Number(value); assert(Number.isInteger(maxBytes) && maxBytes > 0, '--max-bytes requires a positive integer'); }
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  const catalog = loadCatalog(directory);
  if (manifestPath) writeFileSync(manifestPath, `${JSON.stringify(resolutionManifest(catalog), null, 2)}\n`);
  if (catalogPath) writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  if (partsDirectory) {
    mkdirSync(partsDirectory, { recursive: true });
    const parts = splitCatalog(catalog, { maxBytes }).map(part => {
      const sql = generateSQL(part.catalog); writeFileSync(resolve(partsDirectory, part.name), sql);
      return { name: part.name, phase: part.catalog.sql_phase, bytes: Buffer.byteLength(sql), sha256: digest(sql), recipes: part.catalog.recipes.length, coffees: part.catalog.coffees.length };
    });
    writeFileSync(resolve(partsDirectory, 'index.json'), `${JSON.stringify({ import_id: catalog.import_id, project_id: catalog.project_id, max_bytes: maxBytes, order: 'Apply the listed files sequentially. Each file is an independently idempotent transaction. Bean/recipe phases require the earlier exact roaster/bean records; they never create missing dependencies. The full stdout form is one atomic transaction.', parts }, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ counts: catalog.counts, parts_directory: partsDirectory, max_bytes: maxBytes, parts }, null, 2)}\n`); return;
  }
  process.stdout.write(check ? `${JSON.stringify(catalog.counts, null, 2)}\n` : generateSQL(catalog));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
