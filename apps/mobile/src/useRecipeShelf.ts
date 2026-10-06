import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import type { RecipeItem } from './data';
import type { Locale } from './copy';
import { catalogScope } from './client';
import { storageFits, validRecipe } from './catalogCache';
import { catalogName, localizeStep } from './localizedContent';

type Entry = { id: string; savedAt: number; snapshots: Partial<Record<Locale, RecipeItem>> };
export const recipeShelfKey = (project: string, owner: string | null) => `beanmora-recipe-shelf-v1:${project}:${owner ?? 'guest'}`;
export function readShelf(raw: string | null): Entry[] {
  try {
    if (!raw || !storageFits(raw)) return [];
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.entries)) return [];
    return data.entries.filter((entry: Entry) => entry && typeof entry.id === 'string' && Number.isFinite(entry.savedAt)
      && entry.snapshots && Object.entries(entry.snapshots).every(([locale, recipe]) => ['ar', 'en'].includes(locale) && validRecipe(recipe) && recipe.id === entry.id)
      && (entry.snapshots.ar || entry.snapshots.en)).slice(0, 50);
  } catch { return []; }
}
function displaySnapshot(entry: Entry, locale: Locale): RecipeItem {
  const exact = entry.snapshots[locale];
  if (exact) return exact;
  const recipe = (entry.snapshots.ar ?? entry.snapshots.en)!;
  const ar = locale === 'ar';
  return { ...recipe, title: catalogName(recipe.originalTitle || recipe.title, locale), author: catalogName(recipe.author, locale) || null,
    notes: '', discovery: recipe.discovery ? { ...recipe.discovery, creatorName: catalogName(recipe.discovery.creatorName, locale) || null,
      coffeeName: catalogName(recipe.discovery.coffeeName, locale) || null, roasterName: catalogName(recipe.discovery.roasterName, locale) || null } : undefined,
    steps: recipe.steps.map(step => {
      const translated = localizeStep(step.title, step.description, locale);
      const matchingLanguage = ar ? /\p{Script=Arabic}/u.test(translated.description) : !/\p{Script=Arabic}/u.test(translated.description);
      return { number: step.number, title: translated.title, description: matchingLanguage ? translated.description
        : ar ? 'راجع تعليمات هذه الخطوة في رابط المصدر.' : 'See the source link for this step’s instructions.' };
    }) };
}
export function useRecipeShelf(owner: string | null, locale: Locale) {
  const scope = recipeShelfKey(catalogScope, owner);
  const latest = useRef(scope); latest.current = scope;
  const inFlight = useRef(false);
  const [state, setState] = useState<{ scope: string; entries: Entry[]; loading: boolean }>({ scope, entries: [], loading: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    setState({ scope, entries: [], loading: true });
    void AsyncStorage.getItem(scope).then(raw => {
      if (active) setState({ scope, entries: readShelf(raw), loading: false });
    }).catch(() => { if (active) { setState({ scope, entries: [], loading: false }); setError(true); } });
    return () => { active = false; };
  }, [scope]);
  const entries = state.scope === scope && !state.loading ? state.entries : [];
  async function toggle(recipe: RecipeItem) {
    if (inFlight.current || state.scope !== scope || state.loading || !validRecipe(recipe)) return;
    inFlight.current = true; setBusy(true); setError(false);
    const saved = entries.some(entry => entry.id === recipe.id);
    const next = saved ? entries.filter(entry => entry.id !== recipe.id)
      : [{ id: recipe.id, savedAt: Date.now(), snapshots: { [locale]: recipe } }, ...entries];
    try {
      const encoded = JSON.stringify({ version: 1, entries: next });
      if (next.length > 50 || !storageFits(encoded)) throw new Error('Shelf capacity reached');
      await AsyncStorage.setItem(scope, encoded);
      if (latest.current === scope) setState({ scope, entries: next, loading: false });
    } catch { if (latest.current === scope) setError(true); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return { recipes: entries.map(entry => displaySnapshot(entry, locale)), ids: entries.map(entry => entry.id), toggle,
    busy: busy || state.scope !== scope || state.loading, error };
}
