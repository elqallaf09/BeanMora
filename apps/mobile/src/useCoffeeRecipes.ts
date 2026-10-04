import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import { mapRecipe, RECIPE_FIELDS, type CoffeeItem, type RecipeItem, type RecipeRow } from './data';
import { RECIPE_DISCOVERY_FIELDS, type RecipeDiscoveryRow } from './recipeDiscovery';

type CoffeeScope = Pick<CoffeeItem, 'kind' | 'id' | 'beanId'>;
type ScopedRecipeRow = RecipeRow & RecipeDiscoveryRow;
const PAGE_SIZE = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const usesScopedRpc = (coffee: CoffeeScope) => UUID.test(coffee.id);
const sameId = (left: string | null, right: string | null) => left === right || Boolean(left && right
  && UUID.test(left) && UUID.test(right) && left.toLowerCase() === right.toLowerCase());
const matches = (coffee: CoffeeScope, beanId: string | null, productId: string | null) => coffee.kind === 'product'
  ? sameId(productId, coffee.id) || Boolean(coffee.beanId && sameId(beanId, coffee.beanId))
  : sameId(beanId, coffee.id);

/** Public FK or verified shared association, scoped by bound IDs and paginated on the server. */
export function coffeeRecipesPageQuery(db: Pick<SupabaseClient, 'from' | 'rpc'>, coffee: CoffeeScope, page: number, signal: AbortSignal) {
  const fields = `${RECIPE_FIELDS},${RECIPE_DISCOVERY_FIELDS},updated_at`;
  let query;
  if (usesScopedRpc(coffee)) {
    // The RPC resolves canonical coffee names, the reviewed roaster and a
    // product's real legacy bean. Translated labels and caller-supplied legacy
    // IDs cannot broaden a verified shared association.
    const params = coffee.kind === 'product' ? { p_product_id: coffee.id } : { p_bean_id: coffee.id };
    query = db.rpc('recipes_for_coffee', params, { count: 'exact' }).eq('visibility', 'public').select(fields);
  } else {
    // Fixture/unknown IDs stay literal .eq() values, never PostgREST .or() syntax.
    query = db.from('recipes').select(fields, { count: 'exact' })
      .eq(coffee.kind === 'product' ? 'roasted_product_id' : 'bean_id', coffee.id).eq('visibility', 'public');
  }
  const offset = Math.max(0, Math.floor(page)) * PAGE_SIZE;
  return query.order('updated_at', { ascending: false }).order('id')
    .range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
}

function mergePrefetched(...groups: RecipeItem[][]): RecipeItem[] {
  const byId = new Map<string, RecipeItem>();
  for (const group of groups) for (const item of group) {
    if (!item.public) continue;
    const profile = item.xBloom ?? byId.get(item.id)?.xBloom ?? null;
    byId.set(item.id, profile === item.xBloom ? item : { ...item, xBloom: profile });
  }
  return [...byId.values()];
}

/** Only a scoped RPC may authorize a shared row whose primary FK names another coffee. */
export function mergeCoffeeRecipes(coffee: CoffeeScope, initial: RecipeItem[], rows: ScopedRecipeRow[], locale: 'ar' | 'en', serverScoped = false): RecipeItem[] {
  // Keep profile lookup by recipe ID even when a shared recipe's prefetched FK
  // refers to its first coffee. Unmatched prefetched rows never enter the output.
  const prefetched = new Map(mergePrefetched(initial).map(item => [item.id, item]));
  const loaded = new Map<string, RecipeItem>();
  for (const row of rows) {
    if (row.visibility !== 'public' || !serverScoped && !matches(coffee, row.bean_id, row.roasted_product_id)) continue;
    const mapped = mapRecipe(row, locale, prefetched.get(row.id)?.xBloom ?? null);
    if (mapped) loaded.set(mapped.id, mapped);
  }
  for (const item of prefetched.values()) {
    if (!loaded.has(item.id) && matches(coffee, item.beanId, item.productId)) loaded.set(item.id, item);
  }
  return [...loaded.values()];
}

interface RecipeState {
  scope: string;
  request: string;
  prefetched: RecipeItem[];
  rows: ScopedRecipeRow[];
  busy: boolean;
  error: boolean;
  more: boolean;
}
export interface CoffeeRecipesResult {
  recipes: RecipeItem[];
  busy: boolean;
  error: boolean;
  more: boolean;
  loadMore: () => void;
  retry: () => void;
}

export function useCoffeeRecipes(item: CoffeeItem, initial: RecipeItem[], locale: 'ar' | 'en'): CoffeeRecipesResult {
  const coffee = useMemo(() => ({ kind: item.kind, id: item.id, beanId: item.beanId }), [item.kind, item.id, item.beanId]);
  const scope = JSON.stringify([coffee.kind, coffee.id, coffee.beanId]);
  const request = JSON.stringify([scope, locale]);
  const latestInitial = useRef(initial);
  const latestRequest = useRef(request);
  latestInitial.current = initial;
  // Invalidate even before effect cleanup if a response resolves during a context change.
  latestRequest.current = request;
  const actions = useRef<{ loadMore: () => void; retry: () => void } | null>(null);
  const [state, setState] = useState<RecipeState>(() => ({
    scope, request, prefetched: mergePrefetched(initial), rows: [], busy: true, error: false, more: false,
  }));

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let nextPage = 0;
    let hasMore = false;
    let failed = false;
    let controller: AbortController | null = null;
    const current = () => active && latestRequest.current === request;

    setState(previous => current() ? {
      scope, request,
      prefetched: mergePrefetched(previous.scope === scope ? previous.prefetched : [], latestInitial.current),
      rows: previous.scope === scope ? previous.rows : [],
      busy: true, error: false, more: false,
    } : previous);

    const loadPage = async (page: number) => {
      if (!current() || inFlight) return;
      inFlight = true;
      failed = false;
      controller = new AbortController();
      setState(previous => current() ? { ...previous, busy: true, error: false } : previous);
      try {
        if (!supabase) throw new Error('Coffee recipe connection unavailable');
        const result = await coffeeRecipesPageQuery(supabase, coffee, page, controller.signal);
        if (!current()) return;
        if (result.error || !Array.isArray(result.data)) throw new Error('Coffee recipe page unavailable');
        const rows = result.data as unknown as ScopedRecipeRow[];
        // Count raw server rows, including methods this client cannot yet display.
        hasMore = result.count != null ? (page + 1) * PAGE_SIZE < result.count : rows.length === PAGE_SIZE;
        nextPage = page + 1;
        setState(previous => current() ? {
          scope, request,
          prefetched: mergePrefetched(previous.prefetched, latestInitial.current),
          rows: page === 0 ? rows : [...new Map([...previous.rows, ...rows].map(row => [row.id, row])).values()],
          busy: true, error: false, more: hasMore,
        } : previous);
      } catch {
        if (current()) {
          failed = true;
          // Also retain page zero if an explicit refresh fails after pagination.
          nextPage = page;
          setState(previous => current() ? { ...previous, error: true } : previous);
        }
      } finally {
        inFlight = false;
        if (current()) setState(previous => current() ? { ...previous, busy: false } : previous);
      }
    };
    const handlers = {
      loadMore: () => { if (hasMore) void loadPage(nextPage); },
      retry: () => { void loadPage(failed ? nextPage : 0); },
    };
    actions.current = handlers;
    void loadPage(0);
    return () => {
      active = false;
      controller?.abort();
      if (actions.current === handlers) actions.current = null;
    };
    // initial can be an inline .filter() result; it must not restart pagination.
  }, [coffee, scope, request, locale]);

  const recipes = useMemo(() => mergeCoffeeRecipes(coffee,
    mergePrefetched(state.scope === scope ? state.prefetched : [], initial),
    state.scope === scope ? state.rows : [], locale, usesScopedRpc(coffee)), [coffee, state, scope, initial, locale]);
  const sameRequest = state.request === request;
  const loadMore = useCallback(() => actions.current?.loadMore(), []);
  const retry = useCallback(() => actions.current?.retry(), []);
  return { recipes, busy: !sameRequest || state.busy, error: sameRequest && state.error, more: sameRequest && state.more, loadMore, retry };
}
