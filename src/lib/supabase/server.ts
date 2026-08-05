import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads/writes the auth cookie via Next's cookies() API.
 * Still uses the publishable (anon) key — RLS is what protects the data,
 * not this client's privileges.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no writable cookie store
            // (e.g. during static rendering). Safe to ignore — the
            // middleware refreshes the session on the next request.
          }
        },
      },
    },
  );
}
