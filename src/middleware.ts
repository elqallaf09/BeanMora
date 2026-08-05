import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Refresh the Supabase session first so auth cookies stay valid, then let
  // next-intl handle locale negotiation/redirects on top of that response.
  const { supabaseResponse, user } = await updateSession(request);

  const intlResponse = intlMiddleware(request);

  // Merge: prefer the intl response (it may redirect for locale handling),
  // but carry over any refreshed auth cookies from the Supabase response.
  const response = intlResponse ?? supabaseResponse ?? NextResponse.next();
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });

  // Route guard: admin routes require an authenticated user. Deeper
  // role-based checks happen server-side per page via user_roles + RLS —
  // this is a fast redirect for the common unauthenticated case only.
  const { pathname } = request.nextUrl;
  const isAdminRoute = /\/(ar|en)\/admin(\/|$)/.test(pathname);
  if (isAdminRoute && !user) {
    const locale = pathname.startsWith("/en") ? "en" : "ar";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
