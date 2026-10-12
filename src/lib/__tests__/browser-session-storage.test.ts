import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createBrowserSessionStorage } from "../browser-session-storage";
import { createOAuthCallbackHandler } from "../native-oauth-callback";
const key = "sb-fixture-auth-token";
function store() {
  const rows = new Map<string, string>();
  return {
    getItem: (k: string) => rows.get(k) ?? null,
    setItem: (k: string, v: string) => {
      rows.set(k, v);
    },
    removeItem: (k: string) => {
      rows.delete(k);
    },
  };
}
afterEach(() => {
  window.history.replaceState(null, "", "/");
});
describe("browser Google PKCE session recovery", () => {
  it("exchanges the saved proof after auth-js clears an invalid old session on reload", async () => {
    const local = store(),
      tab = store();
    // Match the SDK representation, including JSON string serialization.
    local.setItem(key, JSON.stringify({ stale: true }));
    local.setItem(key + "-code-verifier", JSON.stringify("legacy-proof"));
    window.history.replaceState(null, "", "/?code=fresh-code");
    const storage = createBrowserSessionStorage(
      local,
      tab,
      () => window.location.href,
    );
    const fetch = vi.fn(
      async (_url: RequestInfo | URL, options?: RequestInit) => {
        expect(JSON.parse(String(options?.body))).toEqual({
          auth_code: "fresh-code",
          code_verifier: "legacy-proof",
        });
        return new Response(
          JSON.stringify({
            access_token: "fixture.jwt.token",
            refresh_token: "fixture-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: "owner", is_anonymous: false },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    );
    const db = createClient("https://fixture.supabase.co", "fixture-key", {
      auth: {
        storage,
        storageKey: key,
        flowType: "pkce",
        detectSessionInUrl: false,
        autoRefreshToken: false,
      },
      global: { fetch },
    });
    const finish = createOAuthCallbackHandler(
      db.auth,
      window.location.origin + "/",
    );
    await expect(finish(window.location.href)).resolves.toBe("signin");
    await expect(finish(window.location.href)).resolves.toBe("signin");
    expect(fetch).toHaveBeenCalledTimes(1);
    storage.finishOAuth(key + "-code-verifier");
    expect(storage.getItem(key + "-code-verifier")).toBeNull();
    expect((await db.auth.getSession()).data.session?.user.id).toBe("owner");
    db.auth.stopAutoRefresh();
  });
  it("keeps simultaneous tabs bound to their own proof and survives callback initialization cleanup", () => {
    const local = store(),
      a = store(),
      b = store();
    let address = "https://beanmora-mobile.expo.app/";
    const first = createBrowserSessionStorage(local, a, () => address);
    const second = createBrowserSessionStorage(local, b, () => address);
    first.setItem(key + "-code-verifier", "proof-A");
    second.setItem(key + "-code-verifier", "proof-B");
    address += "?code=once";
    const reload = createBrowserSessionStorage(local, a, () => address);
    reload.removeItem(key + "-code-verifier");
    expect(reload.getItem(key + "-code-verifier")).toBe("proof-A");
    expect(second.getItem(key + "-code-verifier")).toBe("proof-B");
    reload.finishOAuth(key + "-code-verifier");
    expect(reload.getItem(key + "-code-verifier")).toBeNull();
    expect(second.getItem(key + "-code-verifier")).toBe("proof-B");
  });
  it("uses tab storage when local storage is blocked, and refuses a memory-only redirect", () => {
    const unavailable = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const tab = store();
    const storage = createBrowserSessionStorage(
      unavailable,
      tab,
      () => "https://beanmora-mobile.expo.app/",
    );
    storage.setItem(key, "session");
    storage.setItem(key + "-code-verifier", "proof");
    expect(
      createBrowserSessionStorage(
        unavailable,
        tab,
        () => "https://beanmora-mobile.expo.app/?code=once",
      ).getItem(key + "-code-verifier"),
    ).toBe("proof");
    expect(storage.getItem(key)).toBe("session");
    const none = createBrowserSessionStorage(
      unavailable,
      unavailable,
      () => "https://beanmora-mobile.expo.app/",
    );
    expect(() => none.setItem(key + "-code-verifier", "proof")).toThrow(
      "OAUTH_STORAGE_UNAVAILABLE",
    );
  });
  it("expires abandoned tab proofs and removes them on logout", () => {
    const local = store(),
      tab = store();
    let time = 1000;
    const storage = createBrowserSessionStorage(
      undefined,
      tab,
      () => "https://beanmora-mobile.expo.app/",
      () => time,
    );
    storage.setItem(key + "-code-verifier", "proof");
    time += 30 * 60 * 1000;
    expect(storage.getItem(key + "-code-verifier")).toBeNull();
    const fresh = createBrowserSessionStorage(
      local,
      tab,
      () => "https://beanmora-mobile.expo.app/",
    );
    fresh.setItem(key + "-code-verifier", "new-proof");
    fresh.removeItem(key + "-code-verifier");
    expect(fresh.getItem(key + "-code-verifier")).toBeNull();
  });
  it("shares a failed single-use callback result instead of exchanging it again without proof", async () => {
    const exchange = vi.fn(async () => ({
      data: { session: null },
      error: new Error("expired-code"),
    }));
    const finish = createOAuthCallbackHandler(
      { exchangeCodeForSession: exchange } as unknown as Parameters<
        typeof createOAuthCallbackHandler
      >[0],
      "https://beanmora-mobile.expo.app/",
    );
    for (let i = 0; i < 2; i++)
      await expect(
        finish("https://beanmora-mobile.expo.app/?code=once"),
      ).rejects.toThrow("expired-code");
    expect(exchange).toHaveBeenCalledTimes(1);
  });
});
