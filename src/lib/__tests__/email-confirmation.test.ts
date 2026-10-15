import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callbackFailureKind, cleanOAuthCallbackUrl, createOAuthCallbackHandler, isEmailConfirmation } from '../native-oauth-callback';

const root = 'https://beanmora-mobile.expo.app/';
const proof = 'a'.repeat(56);
const link = `${root}#token_hash=${proof}&type=email`;
const confirmed = { session: { access_token: 'fixture' }, user: { email_confirmed_at: '2026-10-16T00:00:00Z' } };

describe('cross-browser email confirmation', () => {
  it('verifies email proof once without using a browser PKCE verifier', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ data: confirmed, error: null });
    const exchangeCodeForSession = vi.fn();
    const finish = createOAuthCallbackHandler({ verifyOtp, exchangeCodeForSession } as unknown as SupabaseClient['auth'], root);
    expect(isEmailConfirmation(link, root)).toBe(true);
    expect(cleanOAuthCallbackUrl(link, root)).toBe(root);
    expect(await Promise.all([finish(link), finish(link)])).toEqual(['email-confirmed', 'email-confirmed']);
    expect(verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: proof, type: 'email' });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it.each(['recovery', 'email_change', 'sms'])('rejects an unsupported proof type: %s', async type => {
    const verifyOtp = vi.fn();
    const finish = createOAuthCallbackHandler({ verifyOtp } as unknown as SupabaseClient['auth'], root);
    await expect(finish(link.replace('type=email', `type=${type}`))).rejects.toThrow('EMAIL_CONFIRMATION_INVALID');
    expect(verifyOtp).not.toHaveBeenCalled();
  });
  it('rejects an unrelated host, path, credentials, and ambiguous code', async () => {
    const verifyOtp = vi.fn();
    const finish = createOAuthCallbackHandler({ verifyOtp } as unknown as SupabaseClient['auth'], root);
    for (const url of [link.replace(root, 'https://evil.test/'), link.replace(root, root + 'other'), link.replace('https://', 'https://user:pass@')]) {
      expect(isEmailConfirmation(url, root)).toBe(false);
      expect(await finish(url)).toBeUndefined();
    }
    await expect(finish(link.replace('/#', '/?code=other#'))).rejects.toThrow('EMAIL_CONFIRMATION_INVALID');
    expect(verifyOtp).not.toHaveBeenCalled();
  });
  it('never reports success without a server-confirmed user and session', async () => {
    for (const data of [{ session: null, user: confirmed.user }, { session: confirmed.session, user: {} }]) {
      const finish = createOAuthCallbackHandler({ verifyOtp: async () => ({ data, error: null }) } as unknown as SupabaseClient['auth'], root);
      await expect(finish(link)).rejects.toThrow('EMAIL_CONFIRMATION_FAILED');
    }
  });
  it('allows a retry after network failure and identifies expired links', async () => {
    const verifyOtp = vi.fn().mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValue({ data: confirmed, error: null });
    const finish = createOAuthCallbackHandler({ verifyOtp } as unknown as SupabaseClient['auth'], root);
    await expect(finish(link)).rejects.toThrow('Failed to fetch');
    expect(await finish(link)).toBe('email-confirmed');
    expect(callbackFailureKind({ code: 'otp_expired' })).toBe('expired');
    expect(callbackFailureKind({ message: 'code challenge does not match previously saved code verifier' })).toBe('browser');
    expect(callbackFailureKind({ message: 'Failed to fetch' })).toBe('network');
  });
});
