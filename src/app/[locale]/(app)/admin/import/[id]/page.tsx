import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function ImportReviewPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params; const t=await getTranslations("adminImport"); const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser(); if(!user) notFound();
 const {data:role}=await supabase.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle(); if(!role) notFound();
 const [{data:job},{data:rows}]=await Promise.all([
  supabase.from("data_import_jobs").select("*").eq("id",id).maybeSingle(),
  supabase.from("data_import_rows").select("id,row_number,raw_data,status,issues,matched_existing_id").eq("import_job_id",id).order("row_number").limit(500)
 ]); if(!job) notFound();
 const grouped=(rows??[]).reduce((a:any,r:any)=>{(a[r.status]??=[]).push(r);return a},{});
 return <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[var(--color-copper)]">{job.target_table} · {job.source_type}</p><h1 className="mt-1 text-2xl font-semibold">{job.file_name||t("reviewTitle")}</h1></div><span className="rounded-full border px-3 py-1 text-xs">{job.status}</span></div>
  <p className="mt-3 text-sm text-[var(--color-muted-text)]">{t("reviewSafety")}</p>
  <div className="mt-6 flex flex-wrap gap-2">{Object.entries(grouped).map(([status,list]:any)=><span key={status} className="rounded-full border px-3 py-1.5 text-xs">{status}: {list.length}</span>)}</div>
  <div className="mt-6 overflow-x-auto rounded-2xl border"><table className="w-full min-w-[800px] text-sm"><thead className="bg-[var(--color-surface-muted,#f6f0e8)] text-start"><tr><th className="p-3">{t("row")}</th><th className="p-3">{t("status")}</th><th className="p-3">{t("issues")}</th><th className="p-3">{t("preview")}</th><th className="p-3">{t("match")}</th></tr></thead><tbody>{(rows??[]).map((r:any)=><tr key={r.id} className="border-t align-top"><td className="p-3 font-mono">{r.row_number}</td><td className="p-3"><span className="rounded-full border px-2 py-1 text-xs">{r.status}</span></td><td className="p-3 text-xs text-[var(--color-muted-text)]">{r.issues?.join(" · ")||"—"}</td><td className="max-w-xl p-3"><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(r.raw_data,null,2)}</pre></td><td className="p-3 font-mono text-xs">{r.matched_existing_id||"—"}</td></tr>)}</tbody></table></div>
  <p className="mt-4 text-xs text-[var(--color-muted-text)]">{t("approvalNote")}</p>
 </div>;
}