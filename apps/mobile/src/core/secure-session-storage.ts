type Store = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
type Manifest = { version: 1; id: string; count: number };
/** Chunked Keychain/Keystore adapter. Commit the manifest last; serialize per key. */
export function createSecureSessionStorage(
  secure: Store,
  legacy: Store,
  id: () => string,
): Store {
  const pending = new Map<string, Promise<unknown>>();
  const root = (key: string) => {
    if (!/^[\w.-]+$/.test(key)) throw new Error('INVALID_SESSION_STORAGE_KEY');
    return `beanmora.auth.${key}`;
  };
  async function manifest(key: string): Promise<Manifest | null> {
    const raw = await secure.getItem(root(key));
    if (!raw) return null;
    const value = JSON.parse(raw) as Manifest;
    if (
      value.version !== 1 ||
      !/^[\w-]+$/.test(value.id) ||
      !Number.isInteger(value.count) ||
      value.count < 1 ||
      value.count > 256
    )
      throw new Error('INVALID_SECURE_SESSION');
    return value;
  }
  async function cleanup(key: string, m: Manifest | null) {
    if (m)
      await Promise.all(
        Array.from({ length: m.count }, (_, i) =>
          secure.removeItem(`${root(key)}.${m.id}.${i}`),
        ),
      );
  }
  async function write(key: string, value: string) {
    const old = await manifest(key);
    // 384 Unicode code points fit below 2 KiB even with four-byte UTF-8.
    const chars = Array.from(value);
    const parts: string[] = [];
    for (let i = 0; i < chars.length; i += 384)
      parts.push(chars.slice(i, i + 384).join(''));
    if (!parts.length) parts.push('');
    if (parts.length > 256) throw new Error('SESSION_TOO_LARGE');
    const next: Manifest = { version: 1, id: id(), count: parts.length };
    try {
      for (let i = 0; i < parts.length; i++)
        await secure.setItem(`${root(key)}.${next.id}.${i}`, parts[i]);
      await secure.setItem(root(key), JSON.stringify(next));
    } catch (error) {
      await cleanup(key, next).catch(() => {});
      throw error;
    }
    // Never erase the old session before the secure manifest is committed.
    await legacy.removeItem(key);
    await cleanup(key, old).catch(() => {});
  }
  function serial<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const next = (pending.get(key) ?? Promise.resolve())
      .catch(() => {})
      .then(operation);
    pending.set(key, next);
    void next
      .finally(() => {
        if (pending.get(key) === next) pending.delete(key);
      })
      .catch(() => {});
    return next;
  }
  return {
    getItem: (key) =>
      serial(key, async () => {
        const m = await manifest(key);
        if (m) {
          const parts = await Promise.all(
            Array.from({ length: m.count }, (_, i) =>
              secure.getItem(`${root(key)}.${m.id}.${i}`),
            ),
          );
          if (parts.some((p) => p === null))
            throw new Error('INCOMPLETE_SECURE_SESSION');
          await legacy.removeItem(key);
          return parts.join('');
        }
        const old = await legacy.getItem(key);
        if (old !== null) await write(key, old);
        return old;
      }),
    setItem: (key, value) => serial(key, () => write(key, value)),
    removeItem: (key) =>
      serial(key, async () => {
        // Logout can clear a corrupt manifest without reviving legacy plaintext.
        const m = await manifest(key).catch(() => null);
        // Delete legacy first so a failed secure delete cannot resurrect plaintext.
        await legacy.removeItem(key);
        await secure.removeItem(root(key));
        await cleanup(key, m);
      }),
  };
}
