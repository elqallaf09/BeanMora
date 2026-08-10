"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ExternalLink, GitMerge, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

/**
 * One item awaiting review.
 *
 * Shows the extracted PARAMETERS — the facts — next to a link to the
 * original. The excerpt is shown only so the reviewer can check the numbers
 * against the source; it is never rendered on a public page and is cleared
 * from the database once a decision is recorded.
 *
 * Approving creates a real recipe from the parameters, crediting the source
 * via recipe_sources. It never copies the source's prose or media.
 */
export function ReviewCard({ item }: { item: AnyRow }) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const params: Array<[string, string | null]> = [
    [t("recipe.dose"), item.dose_grams ? `${item.dose_grams}g` : null],
    [t("recipe.water"), item.water_grams ? `${item.water_grams}g` : null],
    ["Yield", item.yield_grams ? `${item.yield_grams}g` : null],
    [t("recipe.ratio"), item.ratio ? `1:${item.ratio}` : null],
    [t("recipe.temp"), item.water_temp_c ? `${item.water_temp_c}°C` : null],
    [t("recipeCreate.grinderLabel"), item.grind_setting ?? null],
    ["Grinder", item.grinder_name ?? null],
    ["Brewer", item.brewer_name ?? null],
    [t("recipe.bloomPour"), item.bloom_seconds ? `${item.bloom_seconds}s` : null],
    [
      t("recipe.totalTime"),
      item.total_time_seconds
        ? `${Math.floor(item.total_time_seconds / 60)}:${String(item.total_time_seconds % 60).padStart(2, "0")}`
        : null,
    ],
    ["TDS", item.tds ? `${item.tds}%` : null],
    ["EY", item.extraction_yield ? `${item.extraction_yield}%` : null],
  ];
  const present = params.filter(([, v]) => v);

  async function decide(decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let createdRecipeId: string | null = null;

      if (decision === "approved") {
        // Build a recipe from the extracted FACTS only. Title falls back to
        // a generated one rather than reusing the source headline verbatim.
        const title =
          item.title?.trim() ||
          `${item.brew_method ?? "Coffee"} — ${item.dose_grams ?? "?"}g`;

        const { data: recipe, error: insertError } = await supabase
          .from("recipes")
          .insert({
            user_id: user.id,
            title,
            brew_method: item.brew_method ?? "v60",
            dose_grams: item.dose_grams,
            water_grams: item.water_grams ?? item.yield_grams,
            water_temp_c: item.water_temp_c,
            grinder_setting: item.grind_setting,
            total_time_seconds: item.total_time_seconds,
            bean_id: item.matched_bean_id,
            // Ingested recipes start unpublished; a second, editorial pass
            // decides what actually goes live.
            visibility: "draft",
            content_language: "en",
          })
          .select("id")
          .single();

        if (insertError || !recipe) {
          setError(t("errors.saveFailed"));
          return;
        }
        createdRecipeId = (recipe as AnyRow).id;

        // Attribution is mandatory — every ingested recipe links back.
        await supabase.from("recipe_sources").insert({
          recipe_id: createdRecipeId,
          source_url: item.url,
          source_name: item.source_name,
          author_name: item.author_name,
          published_at: item.published_at,
        });

        if (item.extraction_id) {
          await supabase
            .from("ingestion_extractions")
            .update({ created_recipe_id: createdRecipeId })
            .eq("id", item.extraction_id);
        }
      }

      await supabase.from("ingestion_reviews").insert({
        item_id: item.item_id,
        reviewer_id: user.id,
        decision,
      });

      // Clearing the excerpt here as well as in the scheduled purge means
      // third-party text is gone the moment it stops being needed.
      await supabase
        .from("ingestion_items")
        .update({ status: decision, raw_excerpt: null })
        .eq("id", item.item_id);

      setResolved(decision);
      router.refresh();
    });
  }

  if (resolved) {
    return (
      <div className="surface-panel flex items-center gap-3 rounded-[var(--radius-card)] px-5 py-4 opacity-60">
        {resolved === "approved" ? (
          <Check className="h-4 w-4 text-[var(--color-success)]" aria-hidden />
        ) : (
          <X className="h-4 w-4 text-[var(--color-muted-text)]" aria-hidden />
        )}
        <p className="text-sm text-[var(--color-muted-text)]">
          {resolved === "approved" ? t("ingestion.approved") : t("ingestion.rejected")}
        </p>
      </div>
    );
  }

  return (
    <article className="surface-panel overflow-hidden rounded-[var(--radius-card)]">
      <header className="flex items-start gap-3 border-b border-[var(--border-soft)] px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="type-eyebrow text-[var(--color-copper)]">
            {item.source_name} · {item.trust_tier}
          </p>
          <h3 className="mt-1.5 line-clamp-2 text-base font-extrabold text-[var(--color-espresso)]">
            {item.title ?? item.url}
          </h3>
          <p className="mt-1 text-[11px] text-[var(--color-muted-text)]">
            {[item.author_name, item.published_at?.slice(0, 10)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-caramel)]/15 px-3 py-1.5 text-[11px] font-bold tabular-nums text-[var(--color-copper)]">
          {Math.round((item.confidence ?? 0) * 100)}%
        </span>
      </header>

      {/* Extracted facts */}
      <div className="flex flex-wrap gap-2 px-5 py-4">
        {item.brew_method ? (
          <span className="rounded-full bg-[var(--color-teal)]/12 px-3 py-1.5 text-xs font-bold text-[var(--color-teal-dark)]">
            {item.brew_method}
          </span>
        ) : null}
        {present.map(([label, value]) => (
          <span
            key={label}
            className="rounded-full bg-[var(--surface-sunken)] px-3 py-1.5 text-xs font-medium text-[var(--color-dark-text)]"
          >
            <span className="text-[var(--color-muted-text)]">{label}:</span>{" "}
            <span className="font-bold tabular-nums">{value}</span>
          </span>
        ))}
      </div>

      {/* Moderator-only excerpt for verifying the numbers */}
      {item.raw_excerpt ? (
        <p className="mx-5 mb-4 rounded-[var(--radius-tile)] bg-[var(--surface-sunken)] px-4 py-3 text-xs italic leading-relaxed text-[var(--color-muted-text)]">
          {item.raw_excerpt}
        </p>
      ) : null}

      {error ? (
        <p className="mx-5 mb-3 text-xs font-semibold text-[var(--color-error)]">{error}</p>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)] px-5 py-3.5">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-copper)] hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("ingestion.viewSource")}
        </a>
        <div className="ms-auto flex gap-2">
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => decide("rejected")}>
            <X className="h-4 w-4" aria-hidden />
            {t("ingestion.reject")}
          </Button>
          <Button size="sm" variant="accent" disabled={isPending} onClick={() => decide("approved")}>
            <GitMerge className="h-4 w-4" aria-hidden />
            {t("ingestion.approve")}
          </Button>
        </div>
      </footer>
    </article>
  );
}
