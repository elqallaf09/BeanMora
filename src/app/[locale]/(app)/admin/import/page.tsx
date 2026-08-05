import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState } from "@/components/shared/state-views";

export default async function AdminImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) notFound();

  const { data: importJobs, error } = await supabase
    .from("data_import_jobs")
    .select("id, source_type, target_table, status, total_rows, new_rows, duplicate_rows, missing_field_rows, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--color-espresso)]">Data Import</h1>
      <p className="mb-6 text-sm text-[var(--color-muted-text)]">
        CSV/Excel/JSON import with a review preview (new / duplicate / missing fields / invalid images / broken
        links / conflicts) before anything reaches production — nothing here writes to public tables automatically.
      </p>

      {error ? (
        <ErrorState message="Could not load import jobs." />
      ) : !importJobs || importJobs.length === 0 ? (
        <EmptyState
          title="No import jobs yet"
          hint="supabase/research/kuwait/roasters.json is a ready-to-review Wave 1 batch — the CSV/Excel/JSON upload + preview UI itself is scheduled for the next Phase 2 iteration (see docs/ROADMAP.md)."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {importJobs.map((job) => (
            <li key={job.id} className="rounded-[var(--radius-brand)] border border-[var(--color-border,#ece1d3)] p-4">
              <p className="font-medium">
                {job.target_table} · {job.source_type}
              </p>
              <p className="text-xs text-[var(--color-muted-text)]">
                {job.total_rows} rows — {job.new_rows} new, {job.duplicate_rows} duplicate, {job.missing_field_rows} incomplete
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
