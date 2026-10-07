import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { sessionStorage } from './sessionStorage';
import { Platform } from 'react-native';
import { isPublicKey } from './guards';
import { boundedFetch } from './requestDeadline';
import appConfig from '../app.json';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const catalogScope = url;
const authStorageKey =
  'sb-' + url.replace(/^https:\/\//, '').split('.')[0] + '-auth-token';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const configured =
  /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) && isPublicKey(key);
export async function authProviderEnabled(provider: 'apple' | 'google') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await boundedFetch(url + '/auth/v1/settings', {
      headers: { apikey: key },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Could not read sign-in settings.');
    const data = await response.json();
    return data.external?.[provider] === true;
  } finally {
    clearTimeout(timer);
  }
}

const requestHeaders = {
  'X-Client-Info': `beanmora-mobile/${appConfig.expo.version} ${Platform.OS}/${Platform.OS === 'ios' ? appConfig.expo.ios.buildNumber : appConfig.expo.android.versionCode}`,
};

// The SDK skips its auth client when accessToken is supplied. Returning null
// uses the public key and existing anon policies, without session recovery.
export const publicSupabase = configured
  ? createClient(url, key, {
      accessToken: async () => null,
      global: { fetch: boundedFetch, headers: requestHeaders },
    })
  : null;

export const supabase = configured
  ? createClient(url, key, {
      auth: {
        ...(sessionStorage ? { storage: sessionStorage } : {}),
        storageKey: authStorageKey,
        persistSession: true,
        autoRefreshToken: true,
        // App handles PKCE explicitly on every platform so recovery intent
        // survives auth-js versions that discard it in URL auto-detection.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: { fetch: boundedFetch, headers: requestHeaders },
    })
  : null;

/** Used only after the server confirmed deletion; never keep a deleted session. */
export async function clearDeletedSession() {
  if (!supabase) return;
  supabase.auth.stopAutoRefresh();
  const keys = [
    authStorageKey,
    authStorageKey + '-code-verifier',
    authStorageKey + '-user',
  ];
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } finally {
    if (Platform.OS === 'web')
      keys.forEach((item) => window.localStorage.removeItem(item));
    else {
      const storage = sessionStorage;
      if (storage)
        await Promise.all(keys.map((item) => storage.removeItem(item)));
    }
  }
}
