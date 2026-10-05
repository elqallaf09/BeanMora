import type { RecipeItem } from './data';
import type { IconName } from './ui';
import { doseLabel, waterLabel, temperatureLabel, timeLabel } from './manualBrew';

export interface RecipeQuickFact { key: string; icon: IconName; label: string; value: string }
/** Read source measurements, preserving ml and per-pour temperatures. Never invent a brew time. */
export function recipeQuickFacts(recipe: RecipeItem, ar = false): RecipeQuickFact[] {
  const facts: RecipeQuickFact[] = [
    { key: 'dose', icon: 'bean', label: ar ? 'كمية البن' : 'Coffee', value: doseLabel(recipe) },
    { key: 'water', icon: 'drop', label: recipe.method === 'espresso' ? ar ? 'الناتج' : 'Yield' : ar ? 'ماء التحضير' : 'Brew water', value: waterLabel(recipe, ar) },
    { key: 'temperature', icon: 'temp', label: ar ? 'الحرارة' : 'Temperature', value: temperatureLabel(recipe, ar) },
    { key: 'time', icon: 'clock', label: ar ? 'الوقت' : 'Time', value: timeLabel(recipe, ar) },
  ];
  const present = facts.filter(f => f.value !== '—');
  if (recipe.grindSetting) present.push({ key: 'grind', icon: 'gear', label: ar ? 'الطحنة' : 'Grind', value: recipe.grindSetting });
  if (recipe.sourceBrew.pours?.length) present.push({ key: 'pours', icon: 'drop', label: ar ? 'الصبات' : 'Pours', value: String(recipe.sourceBrew.pours.length) });
  return present.slice(0, 4);
}
