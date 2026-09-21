import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic="force-dynamic";

export default async function CatalogFreshnessPage(){
 const t=await getTranslations("freshness"); const locale=await getLocale(); const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser(); if(!user)notFound();
 const {data:role}=await supabase.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle(); if(!role)notFound();
 const {data,error}=await supabase.from("roasted_product_freshness").select("roasted_product_id,last_verified_at,freshness_status,days_since_verification,needs_reverification").order("days_since_verification",{ascending:false,nullsFirst:true}).limit(500);
 const ids=(data??[]).map((x:any)=>x.roasted_product_id);
 const {data:products}=ids.length?await supabase.from("roasted_products").select("id,slug,name_ar,name_en,roaster:roasters(name_ar,name_en,country)").in("id",ids):{data:[] as any[]};
 const byId=new Map((products??[]).map((p:any)=>[p.id,p]));
 const counts=(data??[]).reduce((a:any,x:any)=>{a[x.freshness_status]=(a[x.freshness_status]||0)+1;return a},{});
 return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h1 className="text-2xl font-bold">{t("title")}</h1><p className="mt-2 text-sm text-[var(--color-muted-text)]">{t("lede")}</p>
 <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{["fresh","aging","stale","unverified"].map(k=><div key={k} className="rounded-2xl border p-4"><strong className="text-2xl">{counts[k]||0}</strong><p className="text-xs text-[var(--color-muted-text)]">{t(k)}</p></div>)}</div>
 {error?<p className="mt-6 text-sm">{t("error")}</p>:<div className="mt-6 overflow-x-auto rounded-2xl border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-[var(--color-surface-muted,#f6f0e8)]"><tr><th className="p-3 text-start">{t("product")}</th><th className="p-3 text-start">{t("roaster")}</th><th className="p-3 text-start">{t("status")}</th><th className="p-3 text-end">{t("days")}</th><th className="p-3 text-end">{t("lastVerified")}</th></tr></thead><tbody>{(data??[]).map((x:any)=>{const p:any=byId.get(x.roasted_product_id);return <tr key={x.roasted_product_id} className="border-t"><td className="p-3 font-semibold">{p?<Link href={`/products/${p.slug}`}>{locale==="ar"?(p.name_ar||p.name_en):(p.name_en||p.name_ar)}</Link>:x.roasted_product_id}</td><td className="p-3">{p?.roaster?(locale==="ar"?(p.roaster.name_ar||p.roaster.name_en):(p.roaster.name_en||p.roaster.name_ar)):"—"}</td><td className="p-3"><span className="rounded-full border px-2 py-1 text-xs">{t(x.freshness_status)}</span></td><td className="p-3 text-end">{x.days_since_verification??"—"}</td><td className="p-3 text-end text-xs">{x.last_verified_at?new Date(x.last_verified_at).toLocaleDateString(locale):"—"}</td></tr>})}</tbody></table></div>}</div>;
}