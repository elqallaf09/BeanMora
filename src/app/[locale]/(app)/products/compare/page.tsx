import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { Link } from "@/i18n/navigation";

export const dynamic="force-dynamic";

export default async function ComparePricesPage(){
 const locale=await getLocale(); const t=await getTranslations("priceCompare"); const supabase=await createClient();
 const {data}=await supabase.from("roasted_products").select("id,slug,name_ar,name_en,weight_grams,status,roaster:roasters(name_ar,name_en,country),prices:product_prices(price,currency,recorded_at)").eq("requires_review",false).not("weight_grams","is",null).limit(100);
 const rows=(data??[]).map((p:any)=>{const latest=[...(p.prices??[])].sort((a:any,b:any)=>new Date(b.recorded_at).getTime()-new Date(a.recorded_at).getTime())[0]; if(!latest)return null;return {...p,latest,per100:Number(latest.price)*100/Number(p.weight_grams)}}).filter(Boolean).sort((a:any,b:any)=>a.latest.currency.localeCompare(b.latest.currency)||a.per100-b.per100);
 return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><header><p className="type-eyebrow text-[var(--color-copper)]">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">{t("title")}</h1><p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-text)]">{t("lede")}</p></header>
 <div className="mt-6 overflow-x-auto rounded-3xl border bg-[var(--color-surface)]"><table className="w-full min-w-[760px] text-sm"><thead className="bg-[var(--color-surface-muted,#f6f0e8)]"><tr><th className="p-3 text-start">{t("product")}</th><th className="p-3 text-start">{t("roaster")}</th><th className="p-3 text-start">{t("country")}</th><th className="p-3 text-end">{t("bag")}</th><th className="p-3 text-end">{t("price")}</th><th className="p-3 text-end">{t("per100")}</th><th className="p-3 text-end">{t("verified")}</th></tr></thead><tbody>{rows.map((p:any)=><tr key={p.id} className="border-t"><td className="p-3 font-semibold"><Link href={`/products/${p.slug}`}>{localizedField(p,"name",locale)}</Link></td><td className="p-3">{p.roaster?localizedField(p.roaster,"name",locale):"—"}</td><td className="p-3">{p.roaster?.country||"—"}</td><td className="p-3 text-end">{p.weight_grams} g</td><td className="p-3 text-end">{Number(p.latest.price).toLocaleString(locale)} {p.latest.currency}</td><td className="p-3 text-end font-bold">{p.per100.toLocaleString(locale,{maximumFractionDigits:3})} {p.latest.currency}</td><td className="p-3 text-end text-xs text-[var(--color-muted-text)]">{new Date(p.latest.recorded_at).toLocaleDateString(locale)}</td></tr>)}</tbody></table></div>
 <p className="mt-3 text-xs text-[var(--color-muted-text)]">{t("currencyNote")}</p></div>;
}