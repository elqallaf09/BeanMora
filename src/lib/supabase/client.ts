"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * Browser-side Supabase client. Uses the publishable (anon) key only —
 * never import the service_role key here or anywhere reachable by the
 * client bundle.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
