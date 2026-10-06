import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { loadData, type Bundle } from './data';
import { supabase, catalogScope } from './client';
import { catalogCacheKey, decodeCatalog, encodeCatalog, mergeCatalog } from './catalogCache';
import type { Locale } from './copy';

type Loaded = Bundle & { owner: string | null; locale: Locale; stale: boolean; savedAt: number | null };
export function useCatalog(locale: Locale, owner: string | null, revision: number) {
  const [bundle, setBundle] = useState<Loaded | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  useEffect(() => {
    let active = true;
    let liveFinished = false;
    const key = catalogCacheKey(catalogScope, locale);
    setRefreshing(true);
    setBundle(previous => previous?.owner === owner && previous.locale === locale ? previous : null);
    if (!supabase) { setRefreshing(false); return; }
    const cached = AsyncStorage.getItem(key).then(raw => decodeCatalog(raw, catalogScope, locale)).catch(() => null);
    void cached.then(cache => {
      if (!active || !cache) return;
      setBundle(previous => previous?.owner === owner && previous.locale === locale ? previous
        : { ...cache.data, owner, locale, stale: true, warnings: liveFinished, savedAt: cache.savedAt });
    }).catch(() => {});
    void loadData(supabase, locale, owner).then(async next => {
      if (!active) return;
      liveFinished = true;
      const publicFailed = !!next.failures && Object.entries(next.failures).some(([section, failed]) => section !== 'personal' && failed);
      const cache = publicFailed ? await cached : null;
      if (!active) return;
      const savedAt = Date.now();
      setBundle(previous => {
        const same = previous?.owner === owner && previous.locale === locale ? previous : null;
        return { ...mergeCatalog(next, same ?? cache?.data ?? null), owner, locale, stale: publicFailed,
          savedAt: publicFailed ? same?.savedAt ?? cache?.savedAt ?? null : savedAt };
      });
      const encoded = encodeCatalog(next, catalogScope, locale, savedAt);
      if (encoded) void AsyncStorage.setItem(key, encoded).catch(() => {});
    }).catch(() => {
      liveFinished = true;
      if (active) setBundle(previous => previous?.owner === owner && previous.locale === locale ? { ...previous, stale: true, warnings: true } : null);
    }).finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [locale, owner, revision]);
  return { data: bundle?.owner === owner && bundle.locale === locale ? bundle : null, refreshing };
}
