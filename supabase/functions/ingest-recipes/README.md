# ingest-recipes

Scheduled recipe-parameter ingestion. Runs every 3 hours.

This directory is a **self-contained Deno bundle**. `extract.ts`,
`fetchers.ts`, `sources.ts`, `pipeline.ts` and `duplicate-detection.ts` are
copies of their `src/lib/` counterparts with Deno-style relative imports —
Deno has no `@/` path alias. Keep them in sync when the originals change;
`src/lib/ingestion/**` is the source of truth and is what the unit tests
cover.

## Deploy

    supabase functions deploy ingest-recipes

## Schedule (pg_cron, every 3 hours)

    select cron.schedule(
      'beanmora-ingest',
      '0 */3 * * *',
      $$ select net.http_post(
           url     := 'https://<project-ref>.supabase.co/functions/v1/ingest-recipes',
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
           )
         ) $$
    );

## Secrets

Required:

    supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...

Optional — each activates one dormant connector:

    supabase secrets set YOUTUBE_API_KEY=...
    supabase secrets set REDDIT_CLIENT_ID=...
    supabase secrets set REDDIT_CLIENT_SECRET=...
    supabase secrets set X_API_BEARER_TOKEN=...

Sources whose env vars are absent are reported as `skipped: dormant` and do
not count as failures.
