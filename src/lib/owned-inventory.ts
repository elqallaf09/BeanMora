import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMember } from "./member-contributions";
/** Soft deletion preserves brew history and shared catalog rows. */
export async function archiveOwnedItem(
  client: SupabaseClient,
  table: "user_equipment" | "user_bean_inventory",
  id: string,
  owner: string,
  archived: boolean,
) {
  await requireMember(client, owner);
  const { data, error } = await client
    .from(table)
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      ...(table === "user_equipment" && archived ? { is_default: false } : {}),
    })
    .eq("id", id)
    .eq("user_id", owner)
    .select("id")
    .single();
  if (error || data?.id !== id) throw new Error("INVENTORY_UPDATE_FAILED");
}
