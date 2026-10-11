import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { loadData, type Bundle } from './data';
import { supabase, publicSupabase, catalogScope } from './client';
import {
  catalogCacheKey,
  decodeCatalog,
  encodeCatalog,
  mergeCatalog,
  catalogReadFailed,
  scheduleCatalogSave,
} from './catalogCache';
import type { Locale } from './copy';
import { withDeadline } from './requestDeadline';
import { emptyProfile } from './core/engine';

type Loaded = Bundle & {
  owner: string | null;
  locale: Locale;
  stale: boolean;
  savedAt: number | null;
};
export function useCatalog(
  locale: Locale,
  owner: string | null,
  revision: number,
) {
  const [bundle, setBundle] = useState<Loaded | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [automaticRevision, setAutomaticRevision] = useState(0);
  const lastAttempt = useRef(Date.now());
  const pending = useRef(false);
  useEffect(() => {
    let previous = AppState.currentState;
    const listener = AppState.addEventListener('change', (next) => {
      if (
        next === 'active' &&
        previous !== 'active' &&
        !pending.current &&
        Date.now() - lastAttempt.current >= 5 * 60_000
      ) {
        lastAttempt.current = Date.now();
        setAutomaticRevision((value) => value + 1);
      }
      previous = next;
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    let active = true;
    let liveFinished = false;
    let publicComplete = false;
    let cancelCacheSave: (() => void) | undefined;
    const key = catalogCacheKey(catalogScope, locale);
    setRefreshing(true);
    pending.current = true;
    lastAttempt.current = Date.now();
    setBundle((previous) =>
      previous?.locale === locale
        ? {
            ...previous,
            owner,
            profile:
              previous.owner === owner ? previous.profile : emptyProfile(),
            savedBeanIds: previous.owner === owner ? previous.savedBeanIds : [],
          }
        : null,
    );
    if (!supabase) {
      pending.current = false;
      setRefreshing(false);
      return;
    }
    const cached = withDeadline(() => AsyncStorage.getItem(key), { timeoutMs: 2000 })
      .then((raw) => decodeCatalog(raw, catalogScope, locale))
      .catch(() => null);
    void cached
      .then((cache) => {
        if (!active || !cache) return;
        setBundle((previous) => {
          const same =
            previous?.owner === owner && previous.locale === locale
              ? previous
              : null;
          if (same && publicComplete) return same;
          return {
            ...cache.data,
            ...same,
            recipes: cache.data.recipes,
            recipeTotal: cache.data.recipeTotal,
            limited: cache.data.limited || (same?.limited ?? false),
            owner,
            locale,
            stale: true,
            warnings: liveFinished,
            savedAt: cache.savedAt,
          };
        });
      })
      .catch(() => {});
    void loadData(supabase, locale, owner, undefined, {
      publicRevision: revision + automaticRevision,
      publicDb: publicSupabase ?? undefined,
      onPublicReady: (next, complete) => {
        if (!active) return;
        // A failed live section must not replace the last-good disk snapshot.
        if (catalogReadFailed(next)) return;
        publicComplete = complete;
        setBundle((previous) => {
          const same =
            previous?.owner === owner && previous.locale === locale
              ? previous
              : null;
          const publicNext = complete
            ? mergeCatalog(next, same)
            : {
                ...mergeCatalog(next, same),
                recipes: same?.recipes ?? [],
                recipeTotal: same?.recipeTotal ?? 0,
                limited: next.limited || (same?.limited ?? false),
              };
          return {
            ...publicNext,
            profile: same?.profile ?? emptyProfile(),
            savedBeanIds: same?.savedBeanIds ?? [],
            owner,
            locale,
            stale: complete ? false : (same?.stale ?? false),
            savedAt: same?.savedAt ?? null,
          };
        });
      },
    })
      .then(async (next) => {
        if (!active) return;
        liveFinished = true;
        const publicFailed = catalogReadFailed(next);
        const cache = publicFailed ? await cached : null;
        if (!active) return;
        const savedAt = Date.now();
        setBundle((previous) => {
          const same =
            previous?.owner === owner && previous.locale === locale
              ? previous
              : null;
          return {
            ...mergeCatalog(next, same ?? cache?.data ?? null),
            owner,
            locale,
            stale: publicFailed,
            savedAt: publicFailed
              ? (same?.savedAt ?? cache?.savedAt ?? null)
              : savedAt,
          };
        });
        // Serialize the public snapshot after input/render work has had a chance to run.
        cancelCacheSave = scheduleCatalogSave(() => {
          if (!active) return;
          const encoded = encodeCatalog(next, catalogScope, locale, savedAt);
          if (encoded) return AsyncStorage.setItem(key, encoded);
        });
      })
      .catch(() => {
        liveFinished = true;
        if (active)
          setBundle((previous) =>
            previous?.owner === owner && previous.locale === locale
              ? { ...previous, stale: true, warnings: true }
              : null,
          );
      })
      .finally(() => {
        if (active) {
          pending.current = false;
          setRefreshing(false);
        }
      });
    return () => {
      active = false;
      cancelCacheSave?.();
    };
  }, [locale, owner, revision, automaticRevision]);
  return {
    data: bundle?.owner === owner && bundle.locale === locale ? bundle : null,
    refreshing,
  };
}
