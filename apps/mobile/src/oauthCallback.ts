import type { SupabaseClient } from '@supabase/supabase-js';

export const nativeAuthRedirect = 'beanmora://auth';

export function createOAuthCallbackHandler(auth: SupabaseClient['auth']) {
  const exchanges = new Map<string, Promise<void>>();
  return async (url: string): Promise<void> => {
    let callback: URL;
    try {
      callback = new URL(url);
    } catch {
      return;
    }
    if (
      callback.protocol !== 'beanmora:' ||
      callback.hostname !== 'auth' ||
      !['', '/'].includes(callback.pathname) ||
      callback.username ||
      callback.password ||
      callback.port
    )
      return;
    const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
    if (callback.searchParams.has('error') || fragment.has('error'))
      throw new Error('OAUTH_CALLBACK_FAILED');
    const code = callback.searchParams.get('code');
    if (!code) return;
    const existing = exchanges.get(code);
    if (existing) return existing;
    const exchange = (async () => {
      const { data, error } = await auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (!data.session) throw new Error('OAUTH_SESSION_MISSING');
    })();
    exchanges.set(code, exchange);
    try {
      await exchange;
      if (exchanges.size > 10) exchanges.delete(exchanges.keys().next().value!);
    } catch (error) {
      exchanges.delete(code);
      throw error;
    }
  };
}
