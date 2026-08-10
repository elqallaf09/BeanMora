import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock, Database, ExternalLink, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { SectionIntro, StatRibbon } from "@/components/coffee/editorial";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { ReviewCard } from "./review-card";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

/**
 * Ingestion review queue.
 *
 * This is the human gate: nothing the pipeline discovers becomes a real
 * recipe without a moderator approving it here. The page shows the
 * EXTRACTED PARAMETERS alongside a link to the original, so a reviewer can
 * verify the numbers against the source before publishing.
 */
export default async function IngestionAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  // Page-level role gate on top of the admin-only RLS on these tables.
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user!.id);
  const isStaff = ((roles ?? []) as AnyRow[]).some((r) =>
    ["admin", "moderator"].includes(r.role),
  );
  if (!isStaff) redirect({ href: "/home", locale });

  const [{ data: queueRaw }, { data: sourcesRaw }, { data: runsRaw }] = await Promise.all([
    supabase
      .from("ingestion_review_queue")
      .select("*")
      .order("confidence", { ascending: false })
      .limit(50),
    supabase
      .from("ingestion_sources")
      .select("id, slug, name, access_mode, trust_tier, is_enabled, is_configured, last_success_at, consecutive_failures")
      .order("name"),
    supabase
      .from("ingestion_runs")
      .select("id, status, started_at, items_seen, items_extracted, items_duplicate")
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const queue = (queueRaw ?? []) as AnyRow[];
  const sources = (sourcesRaw ?? []) as AnyRow[];
  const runs = (runsRaw ?? []) as AnyRow[];

  const activeSources = sources.filter((s) => s.is_enabled && s.is_configured).length;
  const dormantSources = sources.filter((s) => !s.is_configured).length;
  const lastRun = runs[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
      <header className="mb-7">
        <p className="type-eyebrow text-[var(--color-copper)]">{t("nav.admin")}</p>
        <h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">
          {t("ingestion.title")}
        </h1>
        <p className="type-lede mt-3 max-w-[52ch] text-[var(--color-muted-text)]">
          {t("ingestion.lede")}
        </p>
      </header>

      <StatRibbon
        className="mb-9"
        stats={[
          { icon: Clock, value: queue.length, label: t("ingestion.statPending") },
          { icon: Radio, value: activeSources, label: t("ingestion.statActive") },
          { icon: Database, value: dormantSources, label: t("ingestion.statDormant") },
          {
            icon: CheckCircle2,
            value: lastRun?.items_extracted ?? 0,
            label: t("ingestion.statLastRun"),
          },
        ]}
      />

      {/* -------- Review queue -------- */}
      <section className="mb-12">
        <SectionIntro
          index="01"
          eyebrow={t("ingestion.queueEyebrow")}
          title={t("ingestion.queueTitle")}
          lede={t("ingestion.queueLede")}
        />

        {queue.length === 0 ? (
          <RichEmptyState
            icon={CheckCircle2}
            title={t("ingestion.queueEmptyTitle")}
            description={t("ingestion.queueEmptyHint")}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {queue.map((item) => (
              <ReviewCard key={item.item_id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* -------- Sources -------- */}
      <section className="mb-12">
        <SectionIntro
          index="02"
          eyebrow={t("ingestion.sourcesEyebrow")}
          title={t("ingestion.sourcesTitle")}
        />
        <ul className="flex flex-col gap-2">
          {sources.map((s) => (
            <li
              key={s.id}
              className="surface-panel flex items-center gap-4 rounded-[var(--radius-tile)] px-5 py-3.5"
            >
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  !s.is_configured
                    ? "bg-[var(--color-muted-text)]"
                    : !s.is_enabled
                      ? "bg-[var(--color-error)]"
                      : s.consecutive_failures > 0
                        ? "bg-[var(--color-warning)]"
                        : "bg-[var(--color-success)]"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--color-espresso)]">{s.name}</p>
                <p className="text-[11px] text-[var(--color-muted-text)]">
                  {s.access_mode} · {s.trust_tier}
                  {s.consecutive_failures > 0
                    ? ` · ${s.consecutive_failures} ${t("ingestion.failures")}`
                    : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[var(--color-muted-text)]">
                {!s.is_configured
                  ? t("ingestion.dormant")
                  : s.last_success_at
                    ? new Date(s.last_success_at).toISOString().slice(0, 10)
                    : t("ingestion.neverRun")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* -------- Recent runs -------- */}
      {runs.length > 0 ? (
        <section>
          <SectionIntro index="03" eyebrow={t("ingestion.runsEyebrow")} title={t("ingestion.runsTitle")} />
          <ul className="flex flex-col gap-1.5">
            {runs.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-4 rounded-[var(--radius-tile)] border border-[var(--border-soft)] px-4 py-2.5 text-xs"
              >
                <span className="font-bold text-[var(--color-espresso)]">{r.status}</span>
                <span className="text-[var(--color-muted-text)] tabular-nums">
                  {r.items_seen} seen · {r.items_extracted} extracted · {r.items_duplicate} dupes
                </span>
                <span className="ms-auto text-[var(--color-muted-text)] tabular-nums">
                  {new Date(r.started_at).toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 flex items-start gap-2 rounded-[var(--radius-tile)] bg-[var(--surface-sunken)] px-5 py-4 text-xs leading-relaxed text-[var(--color-muted-text)]">
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("ingestion.legalNote")}
      </p>
    </div>
  );
}
