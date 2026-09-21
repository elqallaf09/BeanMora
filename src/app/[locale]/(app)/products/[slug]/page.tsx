import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("productDetail");
  const supabase = await createClient();
  const { data: p } = await supabase.from("roasted_products").select(
    "id,slug,name_ar,name_en,short_description,roast_level,status,weight_grams,purchase_url,flavor_notes_on_bag,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom,last_verified_at,data_confidence,source_url,source_name,roaster:roasters(name_ar,name_en,country),lot:coffee_lots(origin_country,origin_region,farm,producer,varietal,process,altitude_min_meters,altitude_max_meters,harvest_season),prices:product_prices(price,currency,recorded_at,source_url),availability:product_availability(status,note,recorded_at,source_url)"
  ).eq("slug", slug).eq("requires_review", false).maybeSingle();
  if (!p) notFound();
  const prices=[...(p.prices??[])].sort((a:any,b:any)=>new Date(b.recorded_at).getTime()-new Date(a.recorded_at).getTime());
  const availability=[...(p.availability??[])].sort((a:any,b:any)=>new Date(b.recorded_at).getTime()-new Date(a.recorded_at).getTime());
  return <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
    <header className="rounded-3xl border bg-[var(--color-surface)] p-6">
      <p className="text-xs font-semibold text-[var(--color-copper)]">{p.roaster ? localizedField(p.roaster,"name",locale) : ""}</p>
      <h1 className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">{localizedField(p,"name",locale)}</h1>
      <p className="mt-3 text-sm text-[var(--color-muted-text)]">{p.short_description}</p>
      <div className="mt-4 flex flex-wrap gap-2">{[p.status,p.roast_level,p.weight_grams? `${p.weight_grams} g`:null].filter(Boolean).map((x:any)=><span key={x} className="rounded-full border px-3 py-1 text-xs">{x}</span>)}</div>
      {p.purchase_url?<a href={p.purchase_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-espresso)] px-4 py-2 text-sm font-semibold text-white">{t("productPage")}<ExternalLink className="h-4 w-4"/></a>:null}
    </header>
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <section className="rounded-3xl border bg-[var(--color-surface)] p-5"><h2 className="text-lg font-bold">{t("origin")}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{Object.entries({[t("country")]:p.lot?.origin_country,[t("region")]:p.lot?.origin_region,[t("farm")]:p.lot?.farm,[t("producer")]:p.lot?.producer,[t("varietal")]:p.lot?.varietal,[t("process")]:p.lot?.process,[t("harvest")]:p.lot?.harvest_season}).filter(([,v])=>v).map(([k,v])=><div key={k}><dt className="text-xs text-[var(--color-muted-text)]">{k}</dt><dd className="font-medium">{String(v)}</dd></div>)}</dl>
      </section>
      <section className="rounded-3xl border bg-[var(--color-surface)] p-5"><h2 className="text-lg font-bold">{t("priceHistory")}</h2>
        <div className="mt-4 space-y-3">{prices.length?prices.slice(0,10).map((x:any,i:number)=><div key={i} className="flex justify-between border-b pb-2 text-sm"><strong>{Number(x.price).toLocaleString(locale)} {x.currency}</strong><span className="text-[var(--color-muted-text)]">{new Date(x.recorded_at).toLocaleDateString(locale)}</span></div>):<p className="text-sm text-[var(--color-muted-text)]">{t("noPrices")}</p>}</div>
      </section>
      <section className="rounded-3xl border bg-[var(--color-surface)] p-5 lg:col-span-2"><h2 className="text-lg font-bold">{t("availabilityHistory")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{availability.length?availability.slice(0,10).map((x:any,i:number)=><div key={i} className="rounded-2xl border p-3 text-sm"><div className="flex justify-between"><strong>{x.status}</strong><span className="text-xs text-[var(--color-muted-text)]">{new Date(x.recorded_at).toLocaleDateString(locale)}</span></div>{x.note?<p className="mt-1 text-[var(--color-muted-text)]">{x.note}</p>:null}</div>):<p className="text-sm text-[var(--color-muted-text)]">{t("noAvailability")}</p>}</div>
      </section>
    </div>
    <footer className="mt-5 rounded-2xl border p-4 text-xs text-[var(--color-muted-text)]">{t("confidence")}: {p.data_confidence}{p.last_verified_at?` · ${t("verified")} ${new Date(p.last_verified_at).toLocaleDateString(locale)}`:""}{p.source_url?<a className="ms-2 underline" href={p.source_url} target="_blank" rel="noreferrer">{p.source_name||t("source")}</a>:null}</footer>
  </div>;
}
