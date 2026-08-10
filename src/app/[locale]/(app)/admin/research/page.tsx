import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState } from "@/components/shared/state-views";
import { Badge } from "@/components/ui/badge";

export default async function AdminResearchJobsPage() {
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

  const { data: jobs, error } = await supabase
    .from("research_jobs")
    .select("job_key, country_code, stage, status, roasters_found, products_found, recipes_found, pending_records, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--color-espresso)]">Research Jobs</h1>

      {error ? (
        <ErrorState message="Could not load research jobs." />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState
          title="No research jobs recorded yet"
          hint="Wave 1 (Kuwait) results are staged as files in supabase/research/kuwait/ pending import — see the job's README. Once the Import System (Phase 2) writes to research_jobs, runs will appear here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {jobs.map((job) => (
            <li
              key={job.job_key}
              className="flex items-center justify-between rounded-[var(--radius-brand)] border border-[var(--color-border,#ece1d3)] p-4"
            >
              <div>
                <p className="font-medium">{job.job_key}</p>
                <p className="text-xs text-[var(--color-muted-text)]">
                  {job.roasters_found} roasters · {job.products_found} products · {job.recipes_found} recipes ·{" "}
                  {job.pending_records} pending
                </p>
              </div>
              <Badge variant={job.status === "completed" ? "teal" : "outline"}>{job.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
