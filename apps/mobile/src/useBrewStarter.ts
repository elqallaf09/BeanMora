import { useEffect, useState } from 'react';
import type { Method } from './core/engine';
import { supabase } from './client';
import { mapRecipe, RECIPE_FIELDS, type RecipeItem, type RecipeRow } from './data';
import { RECIPE_DISCOVERY_FIELDS } from './recipeDiscovery';
import { isGeneralBrewGuide } from './brewStarter';
import { recipeQuickFacts } from './recipeQuickFacts';

export function useBrewStarter(method: Method, enabled: boolean, locale: 'ar' | 'en') {
  const scope = `${method}:${locale}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ scope: string; recipe?: RecipeItem; busy: boolean; error: boolean }>({ scope, busy: false, error: false });
  useEffect(() => {
    // Imported xBloom recipes are device/coffee profiles, not general guides.
    if (!enabled || method === 'xbloom') return;
    let active = true;
    const controller = new AbortController();
    setState({ scope, busy: true, error: false });
    void (async () => {
      try {
        if (!supabase) throw new Error('Recipe connection unavailable');
        const { data, error } = await supabase.from('recipes').select(`${RECIPE_FIELDS},${RECIPE_DISCOVERY_FIELDS}`)
          .eq('visibility', 'public').eq('brew_method', method)
          .in('recipe_type', ['official_manufacturer', 'official_roaster', 'verified_barista'])
          .is('bean_id', null).is('roasted_product_id', null).is('source_coffee_name', null)
          .order('updated_at', { ascending: false }).order('id').limit(80).abortSignal(controller.signal);
        if (!active) return;
        if (error || !Array.isArray(data)) throw new Error('General guides unavailable');
        const recipes = (data as unknown as RecipeRow[]).flatMap(row => { const r = mapRecipe(row, locale); return r && isGeneralBrewGuide(r) ? [r] : []; });
        recipes.sort((a, b) => {
          const suitability = (r: RecipeItem) => recipeQuickFacts(r).length + (r.discovery?.servingStyle === 'hot' || !r.discovery?.servingStyle ? 2 : 0);
          return suitability(b) - suitability(a);
        });
        setState({ scope, recipe: recipes[0], busy: false, error: false });
      } catch {
        if (active) setState({ scope, busy: false, error: true });
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [enabled, method, locale, scope, revision]);
  const current = enabled && method !== 'xbloom' && state.scope === scope;
  return { recipe: current ? state.recipe : undefined, busy: enabled && method !== 'xbloom' && (!current || state.busy), error: current && state.error, retry: () => setRevision(v => v + 1) };
}
