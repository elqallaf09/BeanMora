import type { RecipeItem } from './data';
import type { SourceBrew } from './sourceBrew';
export type XBloomPreferences = { model: 'Studio' | 'Original'; cup: 'Omni' | 'xPod'; serving: 'hot' | 'cold_or_iced'; amount: string; unit: 'water' | 'dose'; coffee: string; flavor: string };
export type XBloomDraft = { values: Record<string, string>; brew: SourceBrew & { adapted_from_recipe_id: string; adapted: true; discovery: { serving_style: 'hot' | 'iced' } } };
export function recipeModel(recipe: RecipeItem) {
  return recipe.sourceBrew.model ?? (recipe.sourceBrew.source_model_code === 1 ? 'Studio' : undefined);
}
export function compatibleXBloom(recipe: RecipeItem, preferences: XBloomPreferences) {
  const serving = recipe.discovery?.servingStyle;
  return recipe.method === 'xbloom' && recipeModel(recipe) === preferences.model
    && recipe.sourceBrew.cup_type?.toLowerCase() === preferences.cup.toLowerCase()
    && (preferences.serving === 'hot' ? serving === 'hot' : serving === 'cold' || serving === 'iced');
}
export function buildXBloomDraft(recipe: RecipeItem, preferences: XBloomPreferences, ar: boolean): XBloomDraft {
  if (!compatibleXBloom(recipe, preferences)) throw new Error('INCOMPATIBLE_RECIPE');
  const amount = Number(preferences.amount.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace('٫', '.'));
  const pours = recipe.sourceBrew.pours;
  const originalDose = recipe.sourceBrew.dose ?? recipe.dose;
  if (!pours?.length || pours.some(p => !p.volume) || !originalDose || !Number.isFinite(amount) || amount <= 0) throw new Error('INCOMPLETE_RECIPE');
  const originalWater = pours.reduce((total, pour) => total + pour.volume!, 0);
  const scale = preferences.unit === 'water' ? amount / originalWater : amount / originalDose;
  // Scaling outside this range is not treated as a validated machine program.
  if (scale < .5 || scale > 2) throw new Error('SCALE_RANGE');
  const dose = Math.round(originalDose * scale * 10) / 10;
  const water = Math.round(originalWater * scale * 10) / 10;
  if (dose < 5 || dose > 30 || water < 50 || water > 500) throw new Error('AMOUNT_RANGE');
  const scaled = pours.map(p => ({ ...p, volume: Math.round(p.volume! * scale * 10) / 10 }));
  // Keep the sum exact after rounding without altering the source's other settings.
  scaled[scaled.length - 1].volume = Math.round((water - scaled.slice(0, -1).reduce((sum, p) => sum + p.volume, 0)) * 10) / 10;
  const steps = scaled.map((p, i) => `${i + 1}. ${p.volume} ml` + (p.temperature !== null ? ` · ${p.temperature}°C` : '')
    + (p.flow_rate !== null ? ` · ${p.flow_rate} ml/s` : '') + (p.pause_seconds !== null ? ` · ${ar ? 'توقف' : 'Pause'} ${p.pause_seconds}s` : '')).join('\n');
  const source = recipe.sources[0]?.url ?? '';
  const targetName = preferences.coffee.trim() || recipe.labelMatch?.label.name || recipe.coffeeMatch?.coffee.name || recipe.discovery?.coffeeName || recipe.title;
  return {
    values: { method: 'xbloom', visibility: 'private', name: `${targetName} · ${preferences.model}`,
      coffee_name: targetName, roaster_name: targetName === recipe.discovery?.coffeeName ? recipe.discovery?.roasterName ?? '' : '',
      dose: String(dose), water: String(water), temperature: String(scaled[0].temperature ?? ''), seconds: '',
      grind: String(recipe.sourceBrew.grind_size ?? recipe.grindSetting ?? ''), steps, source_url: source,
      description: `${preferences.model} · ${preferences.cup}\n${ar ? 'مسودة معدّلة من' : 'Draft adapted from'}: ${recipe.title}\n${ar ? 'الماء هو ماء الاستخلاص ولا يشمل الثلج. راجع الصبات على جهازك. رابط المصدر يفتح الوصفة الأصلية.' : 'Water is brew water and excludes ice. Review the pours on your machine. The source link opens the original recipe.'}` },
    brew: { ...recipe.sourceBrew, model: preferences.model, cup_type: preferences.cup, dose, water_ml: water,
      poured_water_ml: water, ratio: water / dose, pours: scaled, adapted: true, adapted_from_recipe_id: recipe.id,
      discovery: { serving_style: preferences.serving === 'hot' ? 'hot' : 'iced' } },
  };
}
