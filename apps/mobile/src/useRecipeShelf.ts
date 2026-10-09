import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  mapRecipe,
  RECIPE_FIELDS,
  type RecipeItem,
  type RecipeRow,
} from "./data";
import type { Locale } from "./copy";
import { catalogScope, supabase } from "./client";
import { setMemberFavorite } from "./core/member-social";
import { storageFits, validRecipe } from "./catalogCache";
import { catalogName, localizeStep } from "./localizedContent";

type Entry = {
  id: string;
  savedAt: number;
  cloud?: boolean;
  snapshots: Partial<Record<Locale, RecipeItem>>;
};
const validShelfRecipe = (value: unknown): value is RecipeItem =>
  Boolean(
    value &&
    typeof value === "object" &&
    validRecipe({ ...value, public: true }),
  );
export const recipeShelfKey = (project: string, owner: string | null) =>
  `beanmora-recipe-shelf-v1:${project}:${owner ?? "guest"}`;
export function readShelf(raw: string | null): Entry[] {
  try {
    if (!raw || !storageFits(raw)) return [];
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.entries)) return [];
    return data.entries
      .filter(
        (entry: Entry) =>
          entry &&
          typeof entry.id === "string" &&
          Number.isFinite(entry.savedAt) &&
          entry.snapshots &&
          Object.entries(entry.snapshots).every(
            ([locale, recipe]) =>
              ["ar", "en"].includes(locale) &&
              validShelfRecipe(recipe) &&
              recipe.id === entry.id,
          ) &&
          (entry.snapshots.ar || entry.snapshots.en),
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}
function displaySnapshot(entry: Entry, locale: Locale): RecipeItem {
  const exact = entry.snapshots[locale];
  if (exact) return exact;
  const recipe = (entry.snapshots.ar ?? entry.snapshots.en)!;
  const ar = locale === "ar";
  return {
    ...recipe,
    title: catalogName(recipe.originalTitle || recipe.title, locale),
    author: catalogName(recipe.author, locale) || null,
    notes: "",
    discovery: recipe.discovery
      ? {
          ...recipe.discovery,
          creatorName:
            catalogName(recipe.discovery.creatorName, locale) || null,
          coffeeName: catalogName(recipe.discovery.coffeeName, locale) || null,
          roasterName:
            catalogName(recipe.discovery.roasterName, locale) || null,
        }
      : undefined,
    steps: recipe.steps.map((step) => {
      const translated = localizeStep(step.title, step.description, locale);
      const matchingLanguage = ar
        ? /\p{Script=Arabic}/u.test(translated.description)
        : !/\p{Script=Arabic}/u.test(translated.description);
      return {
        number: step.number,
        title: translated.title,
        description: matchingLanguage
          ? translated.description
          : ar
            ? "راجع تعليمات هذه الخطوة في رابط المصدر."
            : "See the source link for this step’s instructions.",
      };
    }),
  };
}
export function useRecipeShelf(owner: string | null, locale: Locale) {
  const scope = recipeShelfKey(catalogScope, owner);
  const latest = useRef(scope);
  latest.current = scope;
  const inFlight = useRef(false);
  const [state, setState] = useState<{
    scope: string;
    entries: Entry[];
    loading: boolean;
  }>({ scope, entries: [], loading: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    setState({ scope, entries: [], loading: true });
    void (async () => {
      let local: Entry[] = [];
      try {
        local = readShelf(await AsyncStorage.getItem(scope));
      } catch {
        if (active) setError(true);
      }
      if (active)
        setState({
          scope,
          entries: local,
          loading: Boolean(owner && supabase),
        });
      if (!owner || !supabase) return;
      try {
        const { data, error } = await supabase
          .from("recipe_saves")
          .select(`recipe_id,created_at,recipe:recipes(${RECIPE_FIELDS})`)
          .eq("user_id", owner)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        const remote: Entry[] = (data ?? []).flatMap((row) => {
          const raw = Array.isArray(row.recipe) ? row.recipe[0] : row.recipe;
          if (!raw) return [];
          const recipe = mapRecipe(raw as unknown as RecipeRow, locale);
          return recipe
            ? [
                {
                  id: recipe.id,
                  savedAt: Date.parse(row.created_at) || Date.now(),
                  cloud: true,
                  snapshots: { [locale]: recipe },
                },
              ]
            : [];
        });
        if (!active || latest.current !== scope) return;
        const merged = [
          ...new Map(
            // Confirmed account saves follow the server after removals on another device.
            // Retain older device-only entries until the owner explicitly removes them.
            [...local.filter((entry) => !entry.cloud), ...remote].map(
              (entry) => [entry.id, entry],
            ),
          ).values(),
        ]
          .sort((a, b) => b.savedAt - a.savedAt)
          .slice(0, 50);
        setState({ scope, entries: merged, loading: false });
        const encoded = JSON.stringify({ version: 1, entries: merged });
        if (storageFits(encoded)) {
          try {
            await AsyncStorage.setItem(scope, encoded);
          } catch {
            if (active && latest.current === scope) setError(true);
          }
        }
      } catch {
        if (active && latest.current === scope) {
          setState({ scope, entries: local, loading: false });
          setError(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [scope]);
  const entries = state.scope === scope && !state.loading ? state.entries : [];
  async function toggle(recipe: RecipeItem) {
    if (inFlight.current || state.scope !== scope || state.loading) return;
    if (!validShelfRecipe(recipe) || (!owner && !recipe.public)) {
      setError(true);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(false);
    const saved = entries.some((entry) => entry.id === recipe.id);
    const next = saved
      ? entries.filter((entry) => entry.id !== recipe.id)
      : [
          {
            id: recipe.id,
            savedAt: Date.now(),
            cloud: Boolean(owner),
            snapshots: { [locale]: recipe },
          },
          ...entries,
        ];
    try {
      const encoded = JSON.stringify({ version: 1, entries: next });
      if (next.length > 50 || !storageFits(encoded))
        throw new Error("Shelf capacity reached");
      if (owner) {
        if (!supabase) throw new Error("Account connection unavailable");
        await setMemberFavorite(supabase, owner, recipe.id, !saved);
        // The account write is confirmed even if this device cannot cache it.
        if (latest.current === scope)
          setState({ scope, entries: next, loading: false });
      }
      await AsyncStorage.setItem(scope, encoded);
      if (latest.current === scope)
        setState({ scope, entries: next, loading: false });
    } catch {
      if (latest.current === scope) setError(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return {
    recipes: entries.map((entry) => displaySnapshot(entry, locale)),
    ids: entries.map((entry) => entry.id),
    toggle,
    busy: busy || state.scope !== scope || state.loading,
    error,
  };
}
