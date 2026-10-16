type BrowserResult = { type: string; url?: string };
type Browser = {
  platform: string;
  openAuthSession: (url: string, redirect: string) => Promise<BrowserResult>;
  openExternalURL: (url: string) => Promise<unknown>;
};

function cannotLaunchBrowser(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  return /^(?:ERR_)?(?:NO_MATCHING_ACTIVITY|PREFERRED_PACKAGE_NOT_FOUND|PACKAGE_MANAGER_NOT_FOUND|UNAVAILABLE)$/.test(value?.code ?? '') ||
    /no matching browser activity|no (?:available )?browser|preferred package|package manager|WebBrowser\..*not available/i.test(value?.message ?? '');
}

/** Some Android browsers cannot provide Expo's Custom Tab activity. Reuse the
 * same PKCE URL in the system browser; App's warm/cold deep-link handler owns
 * the callback. Never retry a cancellation or a session/credential error. */
export async function openOAuthBrowser(url: string, redirect: string, browser: Browser): Promise<BrowserResult> {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password)
    throw new Error('OAUTH_URL_INVALID');
  try {
    return await browser.openAuthSession(url, redirect);
  } catch (error) {
    if (browser.platform !== 'android' || !cannotLaunchBrowser(error)) throw error;
    try {
      await browser.openExternalURL(url);
      return { type: 'external' };
    } catch {
      throw Object.assign(new Error('OAUTH_BROWSER_UNAVAILABLE'), { code: 'oauth_browser_unavailable' });
    }
  }
}
