import type { SupabaseClient } from '@supabase/supabase-js';

export const nativeAuthRedirect = 'beanmora://auth';

export function createOAuthCallbackHandler(
  auth: SupabaseClient['auth'],
  redirect = nativeAuthRedirect,
) {
  const allowed = new URL(redirect);
  const exchanges = new Map<string, Promise<'recovery' | 'signin'>>();
  return async (url: string): Promise<'recovery' | 'signin' | undefined> => {
    let callback: URL;
    try {
      callback = new URL(url);
    } catch {
      return;
    }
    if (
      callback.protocol !== allowed.protocol ||
      callback.hostname !== allowed.hostname ||
      ![allowed.pathname, allowed.pathname.replace(/\/$/, '') + '/'].includes(
        callback.pathname,
      ) ||
      callback.username ||
      callback.password ||
      callback.port !== allowed.port
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
      // auth-js 2.x emits SIGNED_IN for manual native PKCE exchange; its
      // stored verifier supplies redirectType. Never trust a URL type flag.
      return 'redirectType' in data &&
        (data.redirectType === 'PASSWORD_RECOVERY' ||
          data.redirectType === 'recovery')
        ? ('recovery' as const)
        : ('signin' as const);
    })();
    exchanges.set(code, exchange);
    try {
      const result = await exchange;
      if (exchanges.size > 10) exchanges.delete(exchanges.keys().next().value!);
      return result;
    } catch (error) {
      exchanges.delete(code);
      throw error;
    }
  };
}
