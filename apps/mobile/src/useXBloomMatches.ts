import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicSupabase } from './client';
import { mapRecipe, RECIPE_FIELDS, type CoffeeItem, type RecipeItem, type RecipeRow } from './data';
import { RECIPE_DISCOVERY_FIELDS } from './recipeDiscovery';
import { attachXBloomMatches, readXBloomMatches, xbloomMatchParams, type XBloomMatch, type XBloomModel } from './xbloomMatching';

export async function loadXBloomMatches(db: SupabaseClient, coffee: CoffeeItem, model: XBloomModel,
  locale: 'ar' | 'en', signal: AbortSignal) {
  const response = await db.rpc('xbloom_matches_for_coffee', xbloomMatchParams(coffee, model)).abortSignal(signal);
  if (response.error) throw new Error('xBloom matching unavailable');
  const matches = readXBloomMatches(response.data);
  if (!matches.length) return { matches, recipes: [] as RecipeItem[] };
  const ids = matches.map(m => m.recipe_id);
  const [recipes, profiles] = await Promise.all([
    db.from('recipes').select(`${RECIPE_FIELDS},${RECIPE_DISCOVERY_FIELDS}`)
      .in('id', ids).eq('visibility', 'public').eq('brew_method', 'xbloom').abortSignal(signal),
    db.from('xbloom_recipe_profiles').select('recipe_id,device_model,grind_setting,dose_grams,water_grams,water_temp_c,pours')
      .in('recipe_id', ids).eq('compatibility_status', 'compatible').abortSignal(signal),
  ]);
  if (recipes.error || profiles.error || !Array.isArray(recipes.data) || !Array.isArray(profiles.data))
    throw new Error('xBloom recipe details unavailable');
  const numeric = (value: unknown) => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const modelName = (value: string) => value.toLowerCase().replace('xbloom_', '');
  const byId = new Map(matches.flatMap(match => {
    const p = profiles.data.find(p => p.recipe_id === match.recipe_id &&
      (!match.device_model || modelName(p.device_model) === modelName(match.device_model)));
    return p ? [[p.recipe_id, { deviceModel: p.device_model, grindSetting: p.grind_setting,
      dose: numeric(p.dose_grams), water: numeric(p.water_grams), temp: numeric(p.water_temp_c), pours: p.pours }] as const] : [];
  }));
  const mapped = (recipes.data as unknown as RecipeRow[]).flatMap(row => {
    const recipe = mapRecipe(row, locale, byId.get(row.id) ?? null);
    return recipe ? [recipe] : [];
  });
  return { matches, recipes: mapped };
}

export function useXBloomMatches(coffee: CoffeeItem, enabled: boolean, model: XBloomModel, locale: 'ar' | 'en') {
  const scope = `${coffee.kind}:${coffee.id}:${model}:${locale}`;
  const latest = useRef(scope);
  latest.current = scope;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ scope: string; matches: XBloomMatch[]; recipes: RecipeItem[]; busy: boolean; error: boolean }>({
    scope, matches: [], recipes: [], busy: true, error: false,
  });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const current = () => active && latest.current === scope;
    setState({ scope, matches: [], recipes: [], busy: true, error: false });
    void (async () => {
      try {
        if (!publicSupabase) throw new Error('xBloom connection unavailable');
        const result = await loadXBloomMatches(publicSupabase, coffee, model, locale, controller.signal);
        if (current()) setState({ scope, ...result, busy: false, error: false });
      } catch {
        if (current()) setState({ scope, matches: [], recipes: [], busy: false, error: true });
      }
    })();
    return () => { active = false; controller.abort(); };
    // Names do not authorize the request. IDs/model/locale define its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scope, model, locale, revision]);
  const items = useMemo(() => enabled && state.scope === scope
    ? attachXBloomMatches(coffee, state.matches, state.recipes) : [], [enabled, scope, state, coffee]);
  return { items, busy: enabled && (state.scope !== scope || state.busy),
    error: enabled && state.scope === scope && state.error, retry: () => setRevision(v => v + 1) };
}
