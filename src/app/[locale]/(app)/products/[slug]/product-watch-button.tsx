"use client";
import { useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export function ProductWatchButton({ productId, userId, initialWatching, labels }: {
  productId: string; userId: string; initialWatching: boolean; labels: { watch: string; watching: string; error: string };
}) {
  const [watching, setWatching] = useState(initialWatching), [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const lock = useRef(false);
  async function toggle() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user || user.is_anonymous || user.id !== userId) throw new Error("WATCH_SESSION");
      const next = !watching;
      const result = next
        ? await db.from("product_watches").upsert({ user_id: user.id, roasted_product_id: productId, alert_price_drop: true, alert_back_in_stock: true }, { onConflict: "user_id,roasted_product_id", ignoreDuplicates: true })
        : await db.from("product_watches").delete().eq("user_id", user.id).eq("roasted_product_id", productId);
      if (result.error) throw result.error;
      const confirmed = await db.from("product_watches").select("id").eq("user_id", user.id).eq("roasted_product_id", productId).maybeSingle();
      if (confirmed.error || Boolean(confirmed.data) !== next) throw new Error("WATCH_CONFIRMATION");
      setWatching(next);
    } catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div>
    <button type="button" disabled={busy} aria-busy={busy} aria-pressed={watching} onClick={() => void toggle()} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50">
      {watching ? <BellOff className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}{watching ? labels.watching : labels.watch}
    </button>
    {error ? <p role="alert" className="mt-1 text-xs text-red-700">{labels.error}</p> : null}
  </div>;
}
