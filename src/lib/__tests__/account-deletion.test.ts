import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteCurrentAccount } from '../account-deletion';
import { createOAuthCallbackHandler } from '../../../apps/mobile/src/oauthCallback';

const owner = '11111111-1111-4111-8111-111111111111';
function fixture() {
  const getUser = vi
    .fn()
    .mockResolvedValue({ data: { user: { id: owner } }, error: null });
  const list = vi.fn().mockResolvedValue({ data: [], error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const client = {
    auth: { getUser },
    storage: { from: () => ({ list, remove }) },
    rpc,
  } as unknown as SupabaseClient;
  return { client, getUser, list, remove, rpc };
}
describe('self-service deletion', () => {
  it('requires a verified signed-in user before inspecting media', async () => {
    const f = fixture();
    f.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(deleteCurrentAccount(f.client)).rejects.toThrow(
      'ACCOUNT_SIGN_IN_REQUIRED',
    );
    expect(f.list).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('walks nested folders and finishes pagination before removing files', async () => {
    const f = fixture();
    f.list.mockImplementation(
      async (path: string, options: { offset: number }) => ({
        data: path.endsWith('/nested')
          ? [{ name: 'photo.webp', id: 'nested-file' }]
          : f.list.mock.calls.length <= 2
            ? options.offset === 0
              ? [
                  ...Array.from({ length: 99 }, (_, i) => ({
                    name: `${i}.webp`,
                    id: `file-${i}`,
                  })),
                  { name: 'nested', id: null },
                ]
              : [{ name: 'last.webp', id: 'last' }]
            : [],
        error: null,
      }),
    );
    await expect(deleteCurrentAccount(f.client)).resolves.toBe(owner);
    expect(f.remove.mock.calls.flatMap((call) => call[0])).toHaveLength(101);
    expect(f.remove.mock.calls.flatMap((call) => call[0])).toContain(
      owner + '/last.webp',
    );
    expect(f.remove.mock.calls.flatMap((call) => call[0])).toContain(
      owner + '/nested/photo.webp',
    );
    expect(f.list.mock.invocationCallOrder[2]).toBeLessThan(
      f.remove.mock.invocationCallOrder[0],
    );
    expect(f.remove.mock.invocationCallOrder.at(-1)).toBeLessThan(
      f.rpc.mock.invocationCallOrder[0],
    );
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith('delete_own_account');
  });
  it.each(['list', 'remove'] as const)(
    'never deletes the account after a Storage %s failure',
    async (operation) => {
      const f = fixture();
      f.list.mockResolvedValue({
        data: [{ name: 'photo.webp', id: 'file' }],
        error: null,
      });
      f[operation].mockResolvedValue({
        data: null,
        error: new Error('isolated failure'),
      });
      await expect(deleteCurrentAccount(f.client)).rejects.toThrow(
        'isolated failure',
      );
      expect(f.rpc).not.toHaveBeenCalled();
    },
  );
  it.each(['../other', 'bad/path', '..', '\\other'])(
    'rejects unexpected media paths (%s)',
    async (name) => {
      const f = fixture();
      f.list.mockResolvedValue({ data: [{ name, id: 'file' }], error: null });
      await expect(deleteCurrentAccount(f.client)).rejects.toThrow(
        'ACCOUNT_MEDIA_PATH',
      );
      expect(f.remove).not.toHaveBeenCalled();
      expect(f.rpc).not.toHaveBeenCalled();
    },
  );
  it('does not delete a different account after a session change', async () => {
    const f = fixture();
    f.getUser
      .mockResolvedValueOnce({ data: { user: { id: owner } }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: 'other' } }, error: null });
    await expect(deleteCurrentAccount(f.client)).rejects.toThrow(
      'ACCOUNT_CHANGED',
    );
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('propagates database failure instead of claiming success', async () => {
    const f = fixture();
    f.rpc.mockResolvedValue({ error: new Error('isolated database failure') });
    await expect(deleteCurrentAccount(f.client)).rejects.toThrow(
      'isolated database failure',
    );
  });
});
describe('native OAuth callbacks', () => {
  function handler() {
    const exchange = vi
      .fn()
      .mockResolvedValue({
        data: { session: { user: { id: owner } } },
        error: null,
      });
    return {
      exchange,
      finish: createOAuthCallbackHandler({
        exchangeCodeForSession: exchange,
      } as unknown as SupabaseClient['auth']),
    };
  }
  it('exchanges simultaneous callbacks only once and waits for the same result', async () => {
    const f = handler();
    await Promise.all([
      f.finish('beanmora://auth?code=fixture'),
      f.finish('beanmora://auth?code=fixture'),
    ]);
    await f.finish('beanmora://auth?code=fixture');
    expect(f.exchange).toHaveBeenCalledExactlyOnceWith('fixture');
  });
  it('allows a failed exchange to be retried', async () => {
    const f = handler();
    f.exchange.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('isolated offline'),
    });
    await expect(f.finish('beanmora://auth?code=fixture')).rejects.toThrow(
      'isolated offline',
    );
    await f.finish('beanmora://auth?code=fixture');
    expect(f.exchange).toHaveBeenCalledTimes(2);
  });
  it.each([
    'https://auth/?code=bad',
    'beanmora://auth-attacker?code=bad',
    'beanmora://auth/path?code=bad',
    'beanmora://someone@auth?code=bad',
    'beanmora://auth:90?code=bad',
    'not a url',
  ])('ignores unrelated callback %s', async (url) => {
    const f = handler();
    await f.finish(url);
    expect(f.exchange).not.toHaveBeenCalled();
  });
  it('reports provider callback errors and missing sessions', async () => {
    const f = handler();
    await expect(
      f.finish('beanmora://auth?error=access_denied'),
    ).rejects.toThrow('OAUTH_CALLBACK_FAILED');
    await expect(
      f.finish('beanmora://auth#error=access_denied'),
    ).rejects.toThrow('OAUTH_CALLBACK_FAILED');
    f.exchange.mockResolvedValue({ data: { session: null }, error: null });
    await expect(f.finish('beanmora://auth?code=empty')).rejects.toThrow(
      'OAUTH_SESSION_MISSING',
    );
  });
});
