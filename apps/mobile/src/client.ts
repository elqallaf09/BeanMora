import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isPublicKey } from './guards';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const catalogScope = url;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const configured = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) && isPublicKey(key);
export async function authProviderEnabled(provider: 'apple' | 'google') {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url + '/auth/v1/settings', { headers: { apikey: key }, signal: controller.signal });
    if (!response.ok) throw new Error('Could not read sign-in settings.');
    const data = await response.json();
    return data.external?.[provider] === true;
  } finally { clearTimeout(timer); }
}

export const supabase = configured ? createClient(url, key, {
  auth: { ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}), persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web', flowType: 'pkce' },
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
