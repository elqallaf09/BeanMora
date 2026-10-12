type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const verifierLifetime = 30 * 60 * 1000;

/** Keep a per-tab PKCE proof through reloads and stale-session cleanup.
 * auth-js can remove the verifier while recovering an invalid old session,
 * before our explicit callback exchange. Never fall back to memory storage. */
export function createBrowserSessionStorage(
  persistent: Store | undefined,
  tab: Store | undefined,
  currentUrl: () => string,
  now = Date.now,
) {
  const backupKey = (key: string) => "beanmora.pkce." + key;
  function read(store: Store | undefined, key: string) {
    try {
      return store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  function write(store: Store | undefined, key: string, value: string) {
    try {
      if (!store) return false;
      store.setItem(key, value);
      return read(store, key) === value;
    } catch {
      return false;
    }
  }
  function remove(store: Store | undefined, key: string) {
    try {
      store?.removeItem(key);
    } catch {
      /* Other durable store may still work. */
    }
  }
  function callbackPending() {
    try {
      return Boolean(new URL(currentUrl()).searchParams.get("code"));
    } catch {
      return false;
    }
  }
  function backup(key: string) {
    const raw = read(tab, backupKey(key));
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw);
      if (
        typeof entry.value === "string" &&
        entry.value &&
        typeof entry.at === "number" &&
        now() >= entry.at &&
        now() - entry.at < verifierLifetime
      )
        return entry.value as string;
    } catch {
      /* Invalid or expired entries cannot supply proof. */
    }
    remove(tab, backupKey(key));
    return null;
  }
  // Capture legacy local-storage verifiers before client initialization can
  // discard them. The callback must still prove possession to Supabase.
  const held = new Map<string, string>();
  return {
    getItem(key: string) {
      if (key.endsWith("-code-verifier")) {
        const proof =
          backup(key) ??
          held.get(key) ??
          read(persistent, key) ??
          read(tab, key);
        if (proof && callbackPending()) held.set(key, proof);
        return proof ?? null;
      }
      return read(persistent, key) ?? read(tab, key);
    },
    setItem(key: string, value: string) {
      if (key.endsWith("-code-verifier")) {
        held.delete(key);
        const savedTab = write(
          tab,
          backupKey(key),
          JSON.stringify({ value, at: now() }),
        );
        const savedLocal = write(persistent, key, value);
        if (!savedTab && !savedLocal)
          throw new Error("OAUTH_STORAGE_UNAVAILABLE");
      } else if (!write(persistent, key, value) && !write(tab, key, value)) {
        throw new Error("OAUTH_STORAGE_UNAVAILABLE");
      } else {
        // Prevent an old fallback session being revived after local logout.
        if (read(persistent, key) === value) remove(tab, key);
      }
    },
    removeItem(key: string) {
      if (key.endsWith("-code-verifier") && callbackPending()) {
        const proof = backup(key) ?? read(persistent, key) ?? read(tab, key);
        if (proof) held.set(key, proof);
      } else if (key.endsWith("-code-verifier")) {
        held.delete(key);
        remove(tab, backupKey(key));
      }
      remove(persistent, key);
      remove(tab, key);
    },
    finishOAuth(key: string) {
      held.delete(key);
      remove(tab, backupKey(key));
      remove(persistent, key);
      remove(tab, key);
    },
  };
}
