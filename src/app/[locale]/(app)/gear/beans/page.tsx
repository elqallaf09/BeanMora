import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState } from "@/components/shared/state-views";
import { Button } from "@/components/ui/button";

/**
 * "My Coffee Inventory" (spec §14). Real query against
 * user_bean_inventory, scoped to the signed-in user by RLS. Freshness
 * alerts ("best window", "bag almost empty", etc.) are computed here from
 * roast_date/opened_at/weights rather than stored, so they never go stale.
 */
// Supabase's query builder can report an embedded to-one relation as either
// a single object or a single-element array depending on how the FK
// relationship metadata is inferred (this project has no generated schema
// types yet — see src/lib/supabase/types.ts). Normalize defensively instead
// of assuming one shape.
type RoastedProductRef = { name_ar: string | null; name_en: string | null };
function firstRoastedProduct(
  value: RoastedProductRef | RoastedProductRef[] | null,
): RoastedProductRef | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function MyBeansPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("user_bean_inventory")
    .select(
      `id, roast_date, opened_at, original_weight_grams, remaining_weight_grams,
       storage_location, brew_count, last_grind_setting,
       roasted_products ( name_ar, name_en )`,
    )
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-espresso)]">My Beans</h1>
        <Button variant="accent" size="sm">
          Add bean
        </Button>
      </div>

      {error ? (
        <ErrorState message={t("errors.supabase")} />
      ) : !items || items.length === 0 ? (
        <EmptyState title={t("empty.noGear")} hint={t("empty.noGearHint")} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const roastedProduct = firstRoastedProduct(item.roasted_products);
            const daysSinceRoast = item.roast_date
              ? Math.floor((Date.now() - new Date(item.roast_date).getTime()) / 86_400_000)
              : null;
            const remainingPct =
              item.original_weight_grams && item.remaining_weight_grams
                ? Math.round((item.remaining_weight_grams / item.original_weight_grams) * 100)
                : null;

            return (
              <li
                key={item.id}
                className="rounded-[var(--radius-brand)] border border-[var(--color-border,#ece1d3)] p-4"
              >
                <p className="font-medium">
                  {roastedProduct?.name_en ?? roastedProduct?.name_ar ?? "—"}
                </p>
                {daysSinceRoast !== null ? (
                  <p className="text-xs text-[var(--color-muted-text)]">
                    {daysSinceRoast <= 21
                      ? "In its best window"
                      : daysSinceRoast > 60
                        ? "It's been a while since roast"
                        : `${daysSinceRoast} days since roast`}
                  </p>
                ) : null}
                {remainingPct !== null && remainingPct <= 15 ? (
                  <p className="text-xs text-[var(--color-warning)]">Bag almost empty</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
