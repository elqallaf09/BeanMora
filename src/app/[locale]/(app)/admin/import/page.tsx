import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState } from "@/components/shared/state-views";
import { Link } from "@/i18n/navigation";

export default async function AdminImportPage() {
  const t = await getTranslations("adminImport");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!role) notFound();

  const { data: importJobs, error } = await supabase.from("data_import_jobs")
    .select("id,file_name,source_type,target_table,status,total_rows,new_rows,duplicate_rows,missing_field_rows,invalid_image_rows,broken_link_rows,conflict_rows,created_at")
    .order("created_at", { ascending: false });

  return <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
    <h1 className="text-2xl font-semibold text-[var(--color-espresso)]">{t("title")}</h1>
    <p className="mb-6 mt-2 text-sm text-[var(--color-muted-text)]">{t("lede")}</p>
    {error ? <ErrorState message={t("loadError")} /> : !importJobs?.length ? <EmptyState title={t("empty")} hint={t("emptyHint")} /> :
    <div className="grid gap-4">{importJobs.map(job => {
      const problems=job.duplicate_rows+job.missing_field_rows+job.invalid_image_rows+job.broken_link_rows+job.conflict_rows;
      return <Link href={`/admin/import/${job.id}`} key={job.id} className="rounded-3xl border bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{job.file_name || `${job.target_table} · ${job.source_type}`}</p><p className="mt-1 text-xs text-[var(--color-muted-text)]">{new Date(job.created_at).toLocaleString()}</p></div><span className="rounded-full border px-3 py-1 text-xs">{job.status}</span></div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{[[t("total"),job.total_rows],[t("new"),job.new_rows],[t("duplicates"),job.duplicate_rows],[t("incomplete"),job.missing_field_rows],[t("conflicts"),job.conflict_rows],[t("problems"),problems]].map(([label,n])=><div key={String(label)} className="rounded-2xl bg-[var(--color-surface-muted,#f6f0e8)] p-3"><strong className="block text-lg">{n}</strong><span className="text-[11px] text-[var(--color-muted-text)]">{label}</span></div>)}</div>
      </Link>
    })}</div>}
  </div>;
}
