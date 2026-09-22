import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { isPublicKey } from './guards';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const configured = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) && isPublicKey(key);
export const supabase = configured ? createClient(url, key, {
  // Expo Go preview: no account tokens are written to disk/shared Expo Go storage.
  // Sign in again after closing/reloading. Persistent device auth belongs in the next release.
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  global: { fetch: async (input, init) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (init?.signal?.aborted) abort();
    init?.signal?.addEventListener('abort', abort);
    const timer = setTimeout(abort, 12000);
    try { return await fetch(input, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); }
  } },
}) : null;
