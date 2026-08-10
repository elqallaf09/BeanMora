import { getLocale, getTranslations } from "next-intl/server";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { RichEmptyState, ErrorCard } from "@/components/coffee/empty-states";
import { AddBeanDialog } from "./add-bean-dialog";
import { ArchiveBagButton, LogBrewLink } from "./bag-actions";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export default async function MyBeansPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: itemsRaw, error } = await supabase
    .from("user_bean_inventory")
    .select(
      "id, roast_date, opened_at, original_weight_grams, remaining_weight_grams, storage_location, brew_count, last_grind_setting, archived_at, bean:beans(id, slug, name_ar, name_en, roaster:roasters(name_ar, name_en)), preferred_recipe:recipes(title)",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const items = ((itemsRaw ?? []) as AnyRow[]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 flex items-center justify-between">
        <div><p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p><h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("myBeans.title")}</h1></div>
        <AddBeanDialog />
      </div>

      {error ? (
        <ErrorCard message={t("errors.supabase")} />
      ) : items.length === 0 ? (
        <RichEmptyState icon={Package} title={t("myBeans.emptyTitle")} description={t("myBeans.emptyHint")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const name = item.bean ? localizedField(item.bean, "name", locale) : "—";
            const roasterName = item.bean?.roaster ? localizedField(item.bean.roaster, "name", locale) : null;
            const daysSinceRoast = item.roast_date
              ? Math.floor((Date.now() - new Date(item.roast_date).getTime()) / 86_400_000)
              : null;
            const remainingPct =
              item.original_weight_grams && item.remaining_weight_grams != null
                ? Math.round((item.remaining_weight_grams / item.original_weight_grams) * 100)
                : null;

            return (
              <div key={item.id} className="flex gap-3 rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream)]">
                  <ImageWithFallback src={null} alt={name} fallbackSeed={item.id} fill sizes="80px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-bold text-[var(--color-espresso)]">{name}</p>
                  {roasterName ? <p className="line-clamp-1 text-xs text-[var(--color-muted-text)]">{roasterName}</p> : null}

                  {daysSinceRoast !== null ? (
                    <p className="mt-1 text-[11px] font-medium text-[var(--color-teal-dark)]">
                      {daysSinceRoast <= 21 ? t("myBeans.freshBestWindow") : daysSinceRoast > 60 ? t("myBeans.freshGettingOld") : t("myBeans.daysSinceRoast", { days: daysSinceRoast })}
                    </p>
                  ) : null}

                  {remainingPct !== null ? (
                    <div className="mt-1.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-cream)]">
                        <div
                          className={`h-full rounded-full ${remainingPct > 20 ? "bg-[var(--color-teal)]" : "bg-[var(--color-warning)]"}`}
                          style={{ width: `${remainingPct}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--color-muted-text)]">
                        {remainingPct <= 15 ? t("myBeans.almostEmpty") : t("myBeans.remaining", { percent: remainingPct })}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-muted-text)]">
                    {item.storage_location ? <span>{t("myBeans.storageLocation")}: {item.storage_location}</span> : null}
                    {item.last_grind_setting ? <span>{t("myBeans.lastGrind")}: {item.last_grind_setting}</span> : null}
                    <span>{t("myBeans.brewsCount", { count: item.brew_count ?? 0 })}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {item.bean ? <LogBrewLink beanId={item.bean.id} /> : null}
                    <ArchiveBagButton itemId={item.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
