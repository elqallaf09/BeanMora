"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
type Preferences = { price: boolean; stock: boolean; soldOut: boolean };
export function WatchPreferences({ watchId, initial, labels }: {
  watchId: string; initial: Preferences; labels: { price: string; stock: string; soldOut: string; remove: string; error: string };
}) {
  const [values, setValues] = useState(initial), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const lock = useRef(false), router = useRouter();
  async function persist(next: Preferences | null) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user || user.is_anonymous) throw new Error("WATCH_SESSION");
      if (next) {
        const saved = await db.from("product_watches").update({
          alert_price_drop: next.price, alert_back_in_stock: next.stock, alert_sold_out: next.soldOut,
        }).eq("id", watchId).eq("user_id", user.id).select("id,alert_price_drop,alert_back_in_stock,alert_sold_out").single();
        if (saved.error || saved.data?.id !== watchId || saved.data.alert_price_drop !== next.price ||
            saved.data.alert_back_in_stock !== next.stock || saved.data.alert_sold_out !== next.soldOut) throw new Error("WATCH_PREFERENCES_CONFIRMATION");
        setValues(next);
      } else {
        const deleted = await db.from("product_watches").delete().eq("id", watchId).eq("user_id", user.id);
        if (deleted.error) throw deleted.error;
        const remaining = await db.from("product_watches").select("id").eq("id", watchId).eq("user_id", user.id).maybeSingle();
        if (remaining.error || remaining.data) throw new Error("WATCH_REMOVAL_CONFIRMATION");
        router.refresh();
      }
    } catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="mt-4 border-t pt-4" aria-busy={busy}>
    <div className="flex flex-wrap gap-4 text-xs">
      {([["price", labels.price], ["stock", labels.stock], ["soldOut", labels.soldOut]] as const).map(([key, label]) =>
        <label key={key} className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={values[key]} disabled={busy} onChange={event => void persist({ ...values, [key]: event.target.checked })} />{label}
        </label>)}
    </div>
    <button type="button" disabled={busy} onClick={() => void persist(null)} className="mt-3 min-h-11 text-xs underline disabled:opacity-50">{labels.remove}</button>
    {error ? <p role="alert" className="mt-2 text-xs text-red-700">{labels.error}</p> : null}
  </div>;
}
