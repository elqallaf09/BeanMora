import { useEffect, useState } from 'react';
import { contentMediaPath, resolveContentMedia } from './core/content-media';
import { catalogScope, supabase } from './client';
export function useContentMedia(value: string | null) {
  const protectedMedia = !!contentMediaPath(value, catalogScope);
  const [resolved, setResolved] = useState<{
    source: string | null;
    url: string | null;
  }>({ source: null, url: null });
  useEffect(() => {
    if (!protectedMedia || !supabase) return;
    let active = true;
    const client = supabase;
    const load = () =>
      void resolveContentMedia(client, value, catalogScope)
        .then((url) => {
          if (active) setResolved({ source: value, url });
        })
        .catch(() => {
          if (active) setResolved({ source: value, url: null });
        });
    load();
    const timer = setInterval(load, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [value, protectedMedia]);
  return protectedMedia
    ? resolved.source === value
      ? resolved.url
      : null
    : value;
}
