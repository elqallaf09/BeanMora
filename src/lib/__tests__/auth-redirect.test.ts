import { describe, expect, it } from 'vitest';
import {
  authRedirectForPlatform,
  cleanOAuthCallbackUrl,
  createOAuthCallbackHandler,
} from '../native-oauth-callback';
import type { SupabaseClient } from '@supabase/supabase-js';

const production = 'https://beanmora-mobile.expo.app/';

describe('Expo authentication redirect', () => {
  it('returns the canonical hosted root without page paths, queries or auth fragments', () => {
    expect(authRedirectForPlatform('web', production)).toBe(production);
    expect(authRedirectForPlatform('web', production.slice(0, -1))).toBe(production);
    expect(authRedirectForPlatform('web', `${production}recipes?next=http://localhost:3000/&code=old#error=access_denied`)).toBe(production);
  });

  it('keeps preview and local callbacks on the origin that owns the PKCE verifier', () => {
    expect(authRedirectForPlatform('web', 'https://preview.beanmora-mobile.expo.app/?code=old')).toBe('https://preview.beanmora-mobile.expo.app/');
    expect(authRedirectForPlatform('web', 'http://127.0.0.1:8088/?next=https://unrelated.test')).toBe('http://127.0.0.1:8088/');
  });

  it('preserves the registered native callback without needing a browser location', () => {
    expect(authRedirectForPlatform('ios')).toBe('beanmora://auth');
    expect(authRedirectForPlatform('android', production)).toBe('beanmora://auth');
  });

  it.each([undefined, '', '/relative', 'file:///private', 'javascript:alert(1)', 'https://user:password@beanmora-mobile.expo.app/'])(
    'rejects an invalid browser URL instead of falling back to localhost: %s',
    (url) => expect(() => authRedirectForPlatform('web', url)).toThrow('OAUTH_REDIRECT_INVALID'),
  );
});

describe('auth callback address cleanup', () => {
  it('removes successful callback parameters and preserves page context', () => {
    expect(cleanOAuthCallbackUrl(`${production}?code=once&type=recovery&language=ar#recipes`, production)).toBe(`${production}?language=ar#recipes`);
  });

  it('removes failed provider error payloads and token fragments', () => {
    expect(cleanOAuthCallbackUrl(`${production}?error_code=denied&error_description=private#access_token=secret&refresh_token=secret2&provider_token=secret3&type=recovery&language=ar`, production)).toBe(`${production}#language=ar`);
  });

  it('does not rewrite normal navigation or unrelated URLs', () => {
    expect(cleanOAuthCallbackUrl(`${production}?language=ar#recipes`, production)).toBeUndefined();
    expect(cleanOAuthCallbackUrl('https://unrelated.test/?code=secret', production)).toBeUndefined();
    expect(cleanOAuthCallbackUrl(`${production}other-path?code=secret`, production)).toBeUndefined();
    expect(cleanOAuthCallbackUrl('not-a-url', production)).toBeUndefined();
  });

  it('reports error-code-only provider callbacks without exchanging a code', async () => {
    let exchanges = 0;
    const finish = createOAuthCallbackHandler({
      exchangeCodeForSession: async () => { exchanges++; },
    } as unknown as SupabaseClient['auth'], production);
    await expect(finish(`${production}#error_code=access_denied`)).rejects.toThrow('OAUTH_CALLBACK_FAILED');
    await expect(finish(`${production}?error_description=cancelled`)).rejects.toThrow('OAUTH_CALLBACK_FAILED');
    expect(exchanges).toBe(0);
  });
});
