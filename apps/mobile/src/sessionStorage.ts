import { createBrowserSessionStorage } from "./core/browser-session-storage";
// Accessing storage itself can throw in restricted browsers. Native resolves
// .native.ts and continues to use Keychain/Keystore.
function browserStore(kind: "localStorage" | "sessionStorage") {
  try {
    return typeof window === "undefined" ? undefined : window[kind];
  } catch {
    return undefined;
  }
}
export const sessionStorage =
  typeof window === "undefined"
    ? undefined
    : createBrowserSessionStorage(
        browserStore("localStorage"),
        browserStore("sessionStorage"),
        () => window.location.href,
      );
export function finishStoredOAuth(key: string) {
  sessionStorage?.finishOAuth(key);
}
