import { getLocale, getTranslations } from "next-intl/server";
import { Coffee, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const value = (sp: SearchParams, key: string) => typeof sp[key] === "string" ? sp[key] as string : "";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const t = await getTranslations("products");
  const locale = await getLocale();
  const supabase = await createClient();
  const q = value(sp, "q");
  const roast = value(sp, "roast");
  const method = value(sp, "method");
  const status = value(sp, "status");
  const country = value(sp, "country");
  const currency = value(sp, "currency");

  let query = supabase.from("roasted_products").select(
    "id,slug,name_ar,name_en,short_description,roast_level,status,weight_grams,purchase_url,flavor_notes_on_bag,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom,last_verified_at,data_confidence,roaster:roasters(name_ar,name_en,country),lot:coffee_lots(origin_country,origin_region,process),prices:product_prices(price,currency,recorded_at),images:product_images(storage_path,image_usage_status,is_primary,position)"
  ).eq("requires_review", false).limit(48);

  if (q) query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);
  if (roast) query = query.eq("roast_level", roast);
  if (status) query = query.eq("status", status);
  if (method === "v60") query = query.eq("suitable_for_v60", true);
  if (method === "espresso") query = query.eq("suitable_for_espresso", true);
  if (method === "xbloom") query = query.eq("suitable_for_xbloom", true);

  const { data, error } = await query.order("updated_at", { ascending: false });
  let products = data ?? [];
  if (country) products = products.filter((p:any) => p.roaster?.country === country);
  if (currency) products = products.filter((p:any) => (p.prices ?? []).some((x:any) => x.currency === currency));

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <header className="mb-6">
      <p className="type-eyebrow text-[var(--color-copper)]">{t("eyebrow")}</p>
      <h1 className="type-headline mt-2 text-[var(--color-espresso)]">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-text)]">{t("lede")}</p>
    </header>
    <form className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <input name="q" defaultValue={q} placeholder={t("search")} className="h-11 rounded-xl border bg-[var(--color-surface)] px-3 lg:col-span-2" />
      <select name="method" defaultValue={method} className="h-11 rounded-xl border bg-[var(--color-surface)] px-3">
        <option value="">{t("allMethods")}</option><option value="v60">V60</option><option value="espresso">{t("espresso")}</option><option value="xbloom">xBloom</option>
      </select>
      <select name="country" defaultValue={country} className="h-11 rounded-xl border bg-[var(--color-surface)] px-3">
        <option value="">{t("allCountries")}</option>
        {["Kuwait","Saudi Arabia","United Arab Emirates","Qatar","Bahrain","Oman"].map(c=><option key={c} value={c}>{t(`countries.${c}`)}</option>)}
      </select>
      <select name="currency" defaultValue={currency} className="h-11 rounded-xl border bg-[var(--color-surface)] px-3">
        <option value="">{t("allCurrencies")}</option>
        {["KWD","SAR","AED","QAR","BHD","OMR"].map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <button className="h-11 rounded-xl bg-[var(--color-espresso)] px-4 font-semibold text-white">{t("apply")}</button>
    </form>
    {error ? <RichEmptyState icon={Coffee} title={t("error")} /> : products.length === 0 ? <RichEmptyState icon={Coffee} title={t("empty")} description={t("emptyHint")} /> :
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map((p:any) => {
      const latestPrice = [...(p.prices ?? [])].sort((a:any,b:any) => new Date(b.recorded_at).getTime()-new Date(a.recorded_at).getTime())[0];
      const name = localizedField(p, "name", locale);
      const roaster = p.roaster ? localizedField(p.roaster, "name", locale) : null;
      return <article key={p.id} className="rounded-3xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[var(--color-copper)]">{roaster}</p><h2 className="mt-1 text-lg font-bold text-[var(--color-espresso)]"><Link href={`/products/${p.slug}`}>{name}</Link></h2></div><span className="rounded-full bg-[var(--color-surface-muted,#f6f0e8)] px-2.5 py-1 text-xs">{t(`status.${p.status}`)}</span></div>
        <p className="mt-3 text-sm text-[var(--color-muted-text)]">{[p.lot?.origin_country,p.lot?.origin_region,p.lot?.process].filter(Boolean).join(" · ") || t("originUnknown")}</p>
        {p.flavor_notes_on_bag?.length ? <p className="mt-2 text-sm">{p.flavor_notes_on_bag.slice(0,4).join(" · ")}</p> : null}
        <div className="mt-4 flex items-end justify-between gap-3"><div>{latestPrice ? <p className="text-lg font-bold">{Number(latestPrice.price).toLocaleString(locale)} {latestPrice.currency}</p> : <p className="text-xs text-[var(--color-muted-text)]">{t("priceUnknown")}</p>}<p className="text-xs text-[var(--color-muted-text)]">{p.weight_grams ? `${p.weight_grams} g` : ""}</p></div>
        {p.purchase_url ? <a href={p.purchase_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-semibold">{t("buy")}<ExternalLink className="h-3.5 w-3.5" /></a> : null}</div>
        <p className="mt-4 border-t pt-3 text-[11px] text-[var(--color-muted-text)]">{t("confidence")}: {p.data_confidence} {p.last_verified_at ? "· "+new Date(p.last_verified_at).toLocaleDateString(locale) : ""}</p>
      </article>
    })}</div>}
  </div>;
}
