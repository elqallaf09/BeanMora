import { expect, it, vi } from 'vitest';
import { createSecureSessionStorage } from '../secure-session-storage';
function fixture() {
  const secureMap = new Map<string, string>(),
    legacyMap = new Map<string, string>();
  const store = (map: Map<string, string>) => ({
    getItem: vi.fn(async (k: string) => map.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      map.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      map.delete(k);
    }),
  });
  const secure = store(secureMap),
    legacy = store(legacyMap);
  let n = 0;
  return {
    secure,
    legacy,
    secureMap,
    legacyMap,
    adapter: createSecureSessionStorage(secure, legacy, () => `id-${++n}`),
  };
}
it('migrates a large Unicode session without oversized secure values or plaintext leftovers', async () => {
  const f = fixture(),
    value = 'قهوة☕️'.repeat(1800);
  f.legacyMap.set('auth', value);
  expect(await f.adapter.getItem('auth')).toBe(value);
  expect(f.legacyMap.size).toBe(0);
  expect(
    [...f.secureMap.values()].every((v) => Buffer.byteLength(v) < 2048),
  ).toBe(true);
  expect(await f.adapter.getItem('auth')).toBe(value);
});
it('keeps plaintext until migration is committed and retries safely', async () => {
  const f = fixture();
  f.legacyMap.set('auth', 'original');
  f.secure.setItem.mockRejectedValueOnce(new Error('locked'));
  await expect(f.adapter.getItem('auth')).rejects.toThrow('locked');
  expect(f.legacyMap.get('auth')).toBe('original');
  expect(await f.adapter.getItem('auth')).toBe('original');
});
it('serializes refresh and sign-out without resurrecting a session', async () => {
  const f = fixture();
  await Promise.all([
    f.adapter.setItem('auth', 'one'),
    f.adapter.setItem('auth', 'two'),
    f.adapter.removeItem('auth'),
  ]);
  expect(await f.adapter.getItem('auth')).toBe(null);
  expect(f.secureMap.size).toBe(0);
});
it('keeps last committed session when replacement fails', async () => {
  const f = fixture();
  await f.adapter.setItem('auth', 'original');
  f.secure.setItem.mockRejectedValueOnce(new Error('locked'));
  await expect(f.adapter.setItem('auth', 'replacement')).rejects.toThrow(
    'locked',
  );
  expect(await f.adapter.getItem('auth')).toBe('original');
});
it('fails closed for damaged secure chunks rather than reading stale plaintext', async () => {
  const f = fixture();
  await f.adapter.setItem('auth', 'original');
  f.secureMap.delete('beanmora.auth.auth.id-1.0');
  f.legacyMap.set('auth', 'stale');
  await expect(f.adapter.getItem('auth')).rejects.toThrow(
    'INCOMPLETE_SECURE_SESSION',
  );
});
it('logout clears a corrupt secure manifest and stale plaintext', async () => {
  const f = fixture();
  f.secureMap.set('beanmora.auth.auth', 'broken');
  f.legacyMap.set('auth', 'stale');
  await f.adapter.removeItem('auth');
  expect(await f.adapter.getItem('auth')).toBe(null);
});
