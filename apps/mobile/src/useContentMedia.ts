import { useEffect, useState } from 'react';
import { contentMediaPath, resolveContentMedia } from './core/content-media';
import { catalogScope, supabase } from './client';
export function useContentMedia(value: string | null, expiresAt?: string) {
  const protectedMedia = !!contentMediaPath(value, catalogScope);
  const [resolved, setResolved] = useState<{
    source: string | null;
    url: string | null;
  }>({ source: null, url: null });
  useEffect(() => {
    if (!protectedMedia || !supabase) return;
    let active = true;
    const client = supabase;
    const load = () => {
      const ttl = expiresAt ? Math.floor((Date.parse(expiresAt) - Date.now()) / 1000) : 60;
      if (ttl <= 0) { if (active) setResolved({ source: value, url: null }); return; }
      void resolveContentMedia(client, value, catalogScope, ttl)
        .then((url) => {
          if (active) setResolved({ source: value, url });
        })
        .catch(() => {
          if (active) setResolved({ source: value, url: null });
        });
    };
    load();
    const timer = setInterval(load, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [value, protectedMedia, expiresAt]);
  return protectedMedia
    ? resolved.source === value
      ? resolved.url
      : null
    : value;
}
