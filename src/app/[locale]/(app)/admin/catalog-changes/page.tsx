import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";
export default async function CatalogChangesPage() {
  const locale = await getLocale();
  const t = await getTranslations("catalogChanges");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "moderator"]).limit(1);
  if (roleError || !roles?.length) notFound();
  const { data: events, error } = await supabase.from("catalog_change_events").select("id,roasted_product_id,event_type,previous_value,current_value,evidence_url,detected_at,review_status").order("detected_at", { ascending: false }).limit(300);
  const ids = [...new Set((events ?? []).map(e => e.roasted_product_id))];
  const products = ids.length ? (await supabase.from("roasted_products").select("id,slug,name_ar,name_en").in("id", ids)).data ?? [] : [];
  const byId = new Map(products.map(p => [p.id, p] as const));
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <h1 className="text-2xl font-bold">{t("title")}</h1>
    <p className="mt-2 text-sm text-[var(--color-muted-text)]">{t("lede")}</p>
    {error ? <p className="mt-6" role="alert">{t("error")}</p> : <div className="mt-6 grid gap-3">{(events ?? []).map(e => {
      const p = byId.get(e.roasted_product_id);
      return <article key={e.id} className="rounded-2xl border bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap justify-between gap-2"><div>
          <span className="rounded-full border px-2 py-1 text-xs">{t(`types.${e.event_type}`)}</span>
          <h2 className="mt-2 font-semibold">{p ? <Link href={`/products/${p.slug}`}>{locale === "ar" ? p.name_ar || p.name_en : p.name_en || p.name_ar}</Link> : e.roasted_product_id}</h2>
        </div><div className="text-end"><span className="text-xs">{e.review_status}</span><p className="mt-1 text-xs text-[var(--color-muted-text)]">{new Date(e.detected_at).toLocaleString(locale)}</p></div></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2"><pre className="overflow-x-auto rounded-xl bg-[var(--color-surface-muted,#f6f0e8)] p-3 text-xs">{JSON.stringify(e.previous_value, null, 2)}</pre><pre className="overflow-x-auto rounded-xl bg-[var(--color-surface-muted,#f6f0e8)] p-3 text-xs">{JSON.stringify(e.current_value, null, 2)}</pre></div>
        {e.evidence_url ? <a href={e.evidence_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs underline">{t("evidence")}</a> : null}
      </article>;
    })}</div>}
  </div>;
}
