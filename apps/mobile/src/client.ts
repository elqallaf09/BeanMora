import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { isPublicKey } from './guards';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const configured = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) && isPublicKey(key);

export const supabase = configured ? createClient(url, key, {
  // Standalone builds keep the session in the Supabase React Native storage adapter.
  // Expo Go remains a preview target; installed EAS builds should behave like a real app.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
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
