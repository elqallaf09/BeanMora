import type { SupabaseClient } from '@supabase/supabase-js';

export const nativeAuthRedirect = 'beanmora://auth';

/** Keep the PKCE verifier and callback on the same web origin. Never fall
 * back to localhost, a different deployment, or an auth URL from the page. */
export function authRedirectForPlatform(platform: string, currentUrl?: string) {
  if (platform !== 'web') return nativeAuthRedirect;
  let current: URL;
  try {
    current = new URL(currentUrl ?? '');
  } catch {
    throw new Error('OAUTH_REDIRECT_INVALID');
  }
  if (
    !['https:', 'http:'].includes(current.protocol) ||
    current.username ||
    current.password
  )
    throw new Error('OAUTH_REDIRECT_INVALID');
  // Expo Hosting serves this single-page app at /. Use its exact canonical
  // root in Supabase's redirect allow-list, including the trailing slash.
  return `${current.origin}/`;
}

function matchesRedirect(callback: URL, allowed: URL) {
  return (
    callback.protocol === allowed.protocol &&
    callback.hostname === allowed.hostname &&
    [allowed.pathname, allowed.pathname.replace(/\/$/, '') + '/'].includes(
      callback.pathname,
    ) &&
    !callback.username &&
    !callback.password &&
    callback.port === allowed.port
  );
}

const authCallbackParameters = [
  'code', 'error', 'error_code', 'error_description', 'access_token',
  'refresh_token', 'provider_token', 'provider_refresh_token', 'token_type',
  'expires_in', 'expires_at',
] as const;

/** Remove credentials and error payloads after processing a callback while
 * retaining unrelated page parameters and anchors. */
export function cleanOAuthCallbackUrl(url: string, redirect: string) {
  let callback: URL;
  let allowed: URL;
  try {
    callback = new URL(url);
    allowed = new URL(redirect);
  } catch {
    return;
  }
  if (!matchesRedirect(callback, allowed)) return;
  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
  const queryHasAuth = authCallbackParameters.some((key) => callback.searchParams.has(key));
  const fragmentHasAuth = authCallbackParameters.some((key) => fragment.has(key));
  if (!queryHasAuth && !fragmentHasAuth) return;
  for (const key of [...authCallbackParameters, 'type']) {
    callback.searchParams.delete(key);
    if (fragmentHasAuth) fragment.delete(key);
  }
  if (fragmentHasAuth) callback.hash = fragment.toString();
  return callback.toString();
}

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
    if (!matchesRedirect(callback, allowed)) return;
    const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
    if (['error', 'error_code', 'error_description'].some(
      (key) => callback.searchParams.has(key) || fragment.has(key),
    ))
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
