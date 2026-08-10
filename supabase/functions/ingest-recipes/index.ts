/**
 * Scheduled recipe ingestion — runs every 3 hours.
 *
 * Deploy:
 *   supabase functions deploy ingest-recipes
 *
 * Schedule (every 3 hours), via pg_cron in the Supabase SQL editor:
 *   select cron.schedule(
 *     'beanmora-ingest',
 *     '0 *\/3 * * *',
 *     $$ select net.http_post(
 *          url     := 'https://<project-ref>.supabase.co/functions/v1/ingest-recipes',
 *          headers := jsonb_build_object(
 *            'Content-Type', 'application/json',
 *            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
 *          )
 *        ) $$
 *   );
 *
 * Required secrets:
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Optional — each unlocks its connector, which stays dormant until set:
 *   supabase secrets set YOUTUBE_API_KEY=...
 *   supabase secrets set REDDIT_CLIENT_ID=...  REDDIT_CLIENT_SECRET=...
 *   supabase secrets set X_API_BEARER_TOKEN=...
 *
 * This function runs with the service role because the ingestion tables are
 * admin-only under RLS and a scheduled job has no user session. It writes
 * ONLY to the ingestion_* tables — it can never publish a recipe, because
 * publication requires a human decision in the review queue.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// Deno global, not present in the Next.js tsconfig — this file is deployed
// to Supabase Edge Functions, not bundled with the app.
// @ts-expect-error -- Deno namespace exists only in the Edge runtime.
const env = (k: string) => Deno.env.get(k);

Deno.serve(async (req: Request) => {
  // Only the scheduler (service-role bearer) may trigger a run.
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(env("SUPABASE_URL")!, serviceKey, {
    auth: { persistSession: false },
  });

  const startedAt = new Date().toISOString();

  try {
    // The pipeline module is bundled with the function at deploy time.
    const { runIngestionCycle } = await import("./pipeline.ts");
    const summaries = await runIngestionCycle(supabase);

    const totals = summaries.reduce(
      (acc, s) => ({
        seen: acc.seen + s.seen,
        extracted: acc.extracted + s.extracted,
        duplicates: acc.duplicates + s.duplicates,
      }),
      { seen: 0, extracted: 0, duplicates: 0 },
    );

    return new Response(
      JSON.stringify({
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        totals,
        sources: summaries,
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, startedAt, error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
