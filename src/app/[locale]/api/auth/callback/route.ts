import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth (and any other PKCE-flow provider) callback.
 *
 * This MUST live under `src/app/[locale]/...` — not `src/app/api/...`.
 * `src/app/[locale]/layout.tsx` is the only layout in this project that
 * renders `<html>`/`<body>` (see its own file comment); the bare root
 * layout at `src/app/layout.tsx` returns nothing but `children` because
 * every real page needs the resolved `locale` to pick RTL/LTR, fonts, and
 * translations. A route outside `[locale]` has no locale param and falls
 * back to that root layout alone for any HTML Next.js needs to render for
 * it (e.g. its own error page) — which is exactly why the previous
 * (never actually created) `/api/auth/callback` redirect target produced
 * "Missing <html> and <body> tags in the root layout": nothing was ever
 * listening at that path, and Next.js rendering a 404 for it under a
 * layout with no <html>/<body> is precisely that error.
 *
 * A Route Handler itself never renders React/HTML either way — it returns
 * a raw Response — so nesting it under `[locale]` costs nothing and buys
 * a real `locale` param straight from the URL.
 */

const SUPPORTED_LOCALES = ["ar", "en"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Only ever follow a same-origin, absolute-path `next` value. Rejects
 * protocol-relative ("//evil.com/..."), scheme-qualified
 * ("https://evil.com"), and relative ("../x") values — anything that
 * could turn this into an open redirect — falling back to the locale
 * home page instead.
 */
function sanitizeNextPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await params;
  // 1. Validate locale as `ar` or `en`. An unrecognized value can only
  // reach here via a hand-crafted URL (every real redirectTo we issue
  // hardcodes a valid locale) — fall back to the default locale for the
  // failure redirect rather than 500ing.
  const locale: SupportedLocale = isSupportedLocale(rawLocale) ? rawLocale : "ar";

  const { searchParams, origin } = new URL(request.url);
  // 2. Read the Supabase authorization code.
  const code = searchParams.get("code");
  // 4. Validate `next` as a same-origin relative path.
  const nextPath = sanitizeNextPath(searchParams.get("next"), `/${locale}/home`);

  const failureUrl = new URL(`/${locale}/login`, origin);
  failureUrl.searchParams.set("error", "google_oauth_failed");

  if (!code) {
    // 6. No code at all — nothing to exchange, never expose why beyond a
    // generic error code in the redirect.
    return NextResponse.redirect(failureUrl);
  }

  try {
    // createClient() reads/writes the Supabase auth cookies via
    // next/headers cookies() — inside a Route Handler that cookie jar is
    // writable, so the session set by exchangeCodeForSession() below is
    // correctly persisted onto the redirect response. 8. Preserve
    // Supabase cookies correctly.
    const supabase = await createClient();
    // 3. Exchange it using exchangeCodeForSession.
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // 6/7. Redirect on failure; never leak the raw Supabase error
      // message (it can include implementation details) to the client.
      return NextResponse.redirect(failureUrl);
    }
  } catch {
    // Network/unexpected failures during the exchange — same generic
    // failure redirect, never a thrown exception reaching Next's error
    // overlay for what is ultimately an external OAuth round-trip.
    return NextResponse.redirect(failureUrl);
  }

  // 5. Redirect to the validated destination (defaults to /{locale}/home)
  // on success.
  return NextResponse.redirect(new URL(nextPath, origin));
}
