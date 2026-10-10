import type { createClient as browserClient } from "../supabase/client";
import type { createClient as serverClient } from "../supabase/server";

// Compile-only contracts: reverting Database to any must fail these checks.
// This file is never imported by the application or executed against a database.
export function verifyQueryContracts(browser: ReturnType<typeof browserClient>, server: Awaited<ReturnType<typeof serverClient>>) {
  browser.from("profiles").update({ experience_level: "beginner" });
  server.from("product_watches").select("id,alert_price_drop").eq("user_id", "fixture");
  // @ts-expect-error unknown browser relation
  browser.from("audit_not_a_real_table");
  // @ts-expect-error unknown server relation
  server.from("audit_not_a_real_table");
  // @ts-expect-error experience is text, not a number
  browser.from("profiles").update({ experience_level: 123 });
  // @ts-expect-error reports require reporter, target and reason
  server.from("reports").insert({ id: "fixture" });
  // @ts-expect-error recipe sources require source_type
  browser.from("recipe_sources").insert({ recipe_id: "fixture" });
}
