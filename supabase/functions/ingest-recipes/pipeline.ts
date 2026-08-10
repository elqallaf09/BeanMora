/**
 * Ingestion orchestrator.
 *
 * Runs one cycle: for each enabled, configured source — fetch, extract
 * parameters, dedupe, and queue for human review. Nothing is published
 * automatically; the last step is always a row in the review queue.
 *
 * Runs with the service role (scheduled function context), because the
 * ingestion tables are admin-only under RLS and there is no user session.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { extractParameters, looksLikeRecipe, contentHash } from "./extract.ts";
import { fetchSource, MissingCredentialsError, BlockedSourceError, type FetchedItem } from "./fetchers.ts";
import { SOURCE_REGISTRY, isConfigured, type SourceDefinition } from "./sources.ts";
// Reuses the existing duplicate-detection scorers rather than a parallel
// normaliser, so ingestion and the admin merge queue agree on what
// "the same thing" means.
import { exactSimilarity, tokenSimilarity } from "./duplicate-detection.ts";

// The ingestion tables are not in the generated types (Database = any), so
// queries here use the same loose-row convention as the rest of the app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export interface SourceRunSummary {
  source: string;
  status: "success" | "partial" | "failed" | "skipped";
  seen: number;
  created: number;
  extracted: number;
  duplicates: number;
  reason?: string;
}

/** Only the first 500 chars are retained, and only for moderator review. */
const EXCERPT_LIMIT = 500;

function excerpt(text: string): string {
  return text.slice(0, EXCERPT_LIMIT);
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Duplicate detection                                                 */
/* ------------------------------------------------------------------ */

/**
 * An item is a duplicate when either:
 *  - another ingested item produced the same parameter hash, or
 *  - an existing published recipe has a near-identical title AND the same
 *    brew method (titles alone are too weak — "V60 Recipe" is everywhere).
 */
async function findDuplicate(
  db: Db,
  hash: string,
  title: string | null,
  brewMethod: string | null,
): Promise<{ isDuplicate: boolean; recipeId?: string }> {
  const { data: sameHash } = await db
    .from("ingestion_items")
    .select("id")
    .eq("content_hash", hash)
    .neq("status", "rejected")
    .limit(1);
  if (sameHash && (sameHash as AnyRow[]).length > 0) return { isDuplicate: true };

  if (title && brewMethod && title.trim().length >= 8) {
    const { data: recipes } = await db
      .from("recipes")
      .select("id, title")
      .eq("brew_method", brewMethod)
      .limit(200);
    // Exact-after-normalisation, or a very high token overlap. The bar is
    // deliberately high: "V60 Recipe" appears on hundreds of unrelated
    // posts, so a loose title match would collapse distinct recipes.
    const match = ((recipes ?? []) as AnyRow[]).find(
      (r) => exactSimilarity(r.title, title) === 1 || tokenSimilarity(r.title, title) >= 0.85,
    );
    if (match) return { isDuplicate: true, recipeId: match.id };
  }

  return { isDuplicate: false };
}

/* ------------------------------------------------------------------ */
/* Entity matching                                                     */
/* ------------------------------------------------------------------ */

/**
 * Link an item to an existing roaster/bean by looking for their catalogue
 * names inside the source text.
 *
 * Pulling a roaster or bean name OUT of free prose reliably is a hard NLP
 * problem and a wrong guess is worse than none — so this runs the match the
 * other way round: we already know every name in our catalogue, so we check
 * which of those appear verbatim. That is high-precision by construction.
 * Names shorter than four characters are skipped, since those produce
 * accidental substring hits.
 */
async function matchEntities(
  db: Db,
  text: string,
): Promise<{ roasterId: string | null; beanId: string | null }> {
  const haystack = text.toLowerCase();
  const mentions = (name: string | null | undefined): boolean => {
    const n = (name ?? "").trim().toLowerCase();
    return n.length >= 4 && haystack.includes(n);
  };

  const [{ data: roasters }, { data: beans }] = await Promise.all([
    db.from("roasters").select("id, name_en, name_ar").limit(500),
    db.from("beans").select("id, name_en, name_ar").limit(500),
  ]);

  const roaster = ((roasters ?? []) as AnyRow[]).find(
    (r) => mentions(r.name_en) || mentions(r.name_ar),
  );
  const bean = ((beans ?? []) as AnyRow[]).find((b) => mentions(b.name_en) || mentions(b.name_ar));

  return { roasterId: roaster?.id ?? null, beanId: bean?.id ?? null };
}

/* ------------------------------------------------------------------ */
/* Single source                                                       */
/* ------------------------------------------------------------------ */

export async function runSource(db: Db, source: SourceDefinition): Promise<SourceRunSummary> {
  const { data: sourceRow } = await db
    .from("ingestion_sources")
    .select("id, is_enabled, is_configured, http_etag, last_run_at, min_interval_seconds")
    .eq("slug", source.slug)
    .maybeSingle();

  const row = sourceRow as AnyRow;
  if (!row) {
    return { source: source.slug, status: "skipped", seen: 0, created: 0, extracted: 0, duplicates: 0, reason: "not registered" };
  }
  if (!row.is_enabled || !row.is_configured) {
    return { source: source.slug, status: "skipped", seen: 0, created: 0, extracted: 0, duplicates: 0, reason: "disabled or unconfigured" };
  }

  // Per-source politeness on top of the global schedule.
  if (row.last_run_at) {
    const elapsed = (Date.now() - new Date(row.last_run_at).getTime()) / 1000;
    if (elapsed < (row.min_interval_seconds ?? 10800)) {
      return { source: source.slug, status: "skipped", seen: 0, created: 0, extracted: 0, duplicates: 0, reason: "rate limited" };
    }
  }

  const { data: runRow } = await db
    .from("ingestion_runs")
    .insert({ source_id: row.id, status: "running" })
    .select("id")
    .single();
  const runId = (runRow as AnyRow)?.id;

  let seen = 0;
  let created = 0;
  let extractedCount = 0;
  let duplicates = 0;

  try {
    const { data: lastRun } = await db
      .from("ingestion_runs")
      .select("http_etag, http_last_modified")
      .eq("source_id", row.id)
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const result = await fetchSource(source, {
      etag: (lastRun as AnyRow)?.http_etag,
      lastModified: (lastRun as AnyRow)?.http_last_modified,
    });

    if (result.notModified) {
      await db
        .from("ingestion_runs")
        .update({ status: "success", finished_at: new Date().toISOString(), items_seen: 0 })
        .eq("id", runId);
      await db
        .from("ingestion_sources")
        .update({ last_run_at: new Date().toISOString(), last_success_at: new Date().toISOString(), consecutive_failures: 0 })
        .eq("id", row.id);
      return { source: source.slug, status: "success", seen: 0, created: 0, extracted: 0, duplicates: 0, reason: "not modified" };
    }

    for (const item of result.items as FetchedItem[]) {
      seen++;

      // Skip anything already seen from this source.
      const { data: existing } = await db
        .from("ingestion_items")
        .select("id")
        .eq("source_id", row.id)
        .eq("external_id", item.externalId)
        .maybeSingle();
      if (existing) continue;

      const params = extractParameters(item.text);

      // Nothing recipe-shaped: record it so we don't re-parse next cycle,
      // but keep no excerpt — there is no review to support.
      if (!looksLikeRecipe(params)) {
        await db.from("ingestion_items").insert({
          source_id: row.id,
          run_id: runId,
          external_id: item.externalId,
          url: item.url,
          title: item.title,
          author_name: item.authorName,
          author_url: item.authorUrl,
          published_at: parseDate(item.publishedAt),
          status: "no_recipe",
        });
        created++;
        continue;
      }

      const hash = contentHash(params);
      const dup = await findDuplicate(db, hash, item.title, params.brewMethod);

      const { data: inserted } = await db
        .from("ingestion_items")
        .insert({
          source_id: row.id,
          run_id: runId,
          external_id: item.externalId,
          url: item.url,
          title: item.title,
          author_name: item.authorName,
          author_url: item.authorUrl,
          published_at: parseDate(item.publishedAt),
          source_image_url: item.imageUrl,
          raw_excerpt: dup.isDuplicate ? null : excerpt(item.text),
          content_hash: hash,
          status: dup.isDuplicate ? "duplicate" : "extracted",
        })
        .select("id")
        .single();
      created++;

      if (dup.isDuplicate) {
        duplicates++;
        continue;
      }

      const itemId = (inserted as AnyRow)?.id;
      if (!itemId) continue;

      const { roasterId, beanId } = await matchEntities(db, item.text);

      await db.from("ingestion_extractions").insert({
        item_id: itemId,
        brew_method: params.brewMethod,
        dose_grams: params.doseGrams,
        water_grams: params.waterGrams,
        yield_grams: params.yieldGrams,
        ratio: params.ratio,
        water_temp_c: params.waterTempC,
        grinder_name: params.grinderName,
        grind_setting: params.grindSetting,
        brewer_name: params.brewerName,
        filter_type: params.filterType,
        bloom_seconds: params.bloomSeconds,
        total_time_seconds: params.totalTimeSeconds,
        pressure_profile: params.pressureProfile,
        pour_schedule: params.pourSchedule,
        tds: params.tds,
        extraction_yield: params.extractionYield,
        origin_country: params.originCountry,
        process: params.process,
        varietal: params.varietal,
        roast_level: params.roastLevel,
        extracted_fields: params.extractedFields,
        confidence: params.confidence,
        matched_roaster_id: roasterId,
        matched_bean_id: beanId,
      });
      extractedCount++;
    }

    await db
      .from("ingestion_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        items_seen: seen,
        items_new: created,
        items_extracted: extractedCount,
        items_duplicate: duplicates,
        http_etag: result.etag ?? null,
        http_last_modified: result.lastModified ?? null,
      })
      .eq("id", runId);

    await db
      .from("ingestion_sources")
      .update({
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        consecutive_failures: 0,
      })
      .eq("id", row.id);

    return { source: source.slug, status: "success", seen, created, extracted: extractedCount, duplicates };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // A dormant connector is an expected state, not a failure — it must not
    // trip the consecutive-failure backoff.
    const isDormant = error instanceof MissingCredentialsError;
    const isBlocked = error instanceof BlockedSourceError;

    await db
      .from("ingestion_runs")
      .update({
        status: isDormant ? "skipped" : "failed",
        finished_at: new Date().toISOString(),
        items_seen: seen,
        error_message: message,
      })
      .eq("id", runId);

    if (!isDormant) {
      await db
        .from("ingestion_sources")
        .update({
          last_run_at: new Date().toISOString(),
          consecutive_failures: (row.consecutive_failures ?? 0) + 1,
          // A source we are not permitted to read is disabled outright
          // rather than retried.
          ...(isBlocked ? { is_enabled: false } : {}),
        })
        .eq("id", row.id);
    }

    return {
      source: source.slug,
      status: isDormant ? "skipped" : "failed",
      seen,
      created,
      extracted: extractedCount,
      duplicates,
      reason: message,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Full cycle                                                          */
/* ------------------------------------------------------------------ */

export async function runIngestionCycle(db: Db): Promise<SourceRunSummary[]> {
  const summaries: SourceRunSummary[] = [];

  for (const source of SOURCE_REGISTRY) {
    if (!isConfigured(source)) {
      summaries.push({
        source: source.slug,
        status: "skipped",
        seen: 0,
        created: 0,
        extracted: 0,
        duplicates: 0,
        reason: `dormant: ${source.requiresEnv} not set`,
      });
      continue;
    }
    summaries.push(await runSource(db, source));
  }

  // Third-party excerpts are only kept while a review is outstanding.
  await db.rpc("purge_reviewed_excerpts");

  return summaries;
}
