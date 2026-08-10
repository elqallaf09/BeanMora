import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Bookmark, Coffee, FolderHeart, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/localized";
import { processLabel, roastLabel, brewMethodLabelKey } from "@/lib/catalog-labels";
import { BeanCard, RoasterCard, RecipeCard, type BeanCardData, type RecipeCardData } from "@/components/coffee/cards";
import { RichEmptyState } from "@/components/coffee/empty-states";
// RemoveSavedButton is no longer imported here: every saved item now renders
// as a BeanCard / RoasterCard / RecipeCard, each of which carries its own
// SaveButton that un-saves on toggle. It stays exported from ./saved-actions
// for the collections list below.
import { CreateCollectionButton, DeleteCollectionButton } from "./saved-actions";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export default async function SavedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale: routeLocale } = await params;
  const { tab } = await searchParams;
  const activeTab = tab && ["recipes", "beans", "roasters", "collections"].includes(tab) ? tab : "recipes";
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale: routeLocale });
  }

  const tabs = [
    { key: "recipes", label: t("saved.tabRecipes"), icon: Coffee },
    { key: "beans", label: t("saved.tabBeans"), icon: Bookmark },
    { key: "roasters", label: t("saved.tabRoasters"), icon: Users },
    { key: "collections", label: t("saved.tabCollections"), icon: FolderHeart },
  ];

  let content: React.ReactNode = null;

  if (activeTab === "recipes") {
    const { data } = await supabase
      .from("recipe_saves")
      .select("recipe:recipes!inner(id, title, brew_method, dose_grams, water_grams)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    const recipes: AnyRow[] = (((data ?? []).map((s: AnyRow) => s.recipe).filter(Boolean)) ?? []);

    content =
      recipes.length === 0 ? (
        <RichEmptyState icon={Coffee} title={t("saved.emptyRecipesTitle")} description={t("saved.emptyRecipesHint")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {recipes.map((r) => {
            const card: RecipeCardData = {
              id: r.id,
              title: r.title,
              ratio: r.dose_grams && r.water_grams ? `1:${Math.round(r.water_grams / r.dose_grams)}` : null,
              brewTimeLabel: r.total_time_seconds
                ? `${Math.floor(r.total_time_seconds / 60)}:${String(r.total_time_seconds % 60).padStart(2, "0")}`
                : null,
              methodLabel: r.brew_method ? t(brewMethodLabelKey(r.brew_method)) : null,
              rating: r.rating ?? null,
              coverSeed: r.id,
              saved: true,
            };
            return <RecipeCard key={r.id} recipe={card} isAuthenticated width="w-full" />;
          })}
        </div>
      );
  } else if (activeTab === "beans") {
    const { data } = await supabase
      .from("bean_saves")
      .select(
        "bean:beans!inner(id, slug, name_ar, name_en, origin_country, origin_region, process, roast_level, suitable_for_v60, suitable_for_espresso, suitable_for_xbloom, roaster:roasters(name_ar, name_en), flavors:bean_flavor_notes(flavor), images:bean_images(url, position))",
      )
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    const beans: AnyRow[] = (((data ?? []).map((s: AnyRow) => s.bean).filter(Boolean)) ?? []);
    const compatLabels = { v60: t("nav.v60"), espresso: t("nav.espresso"), xbloom: t("nav.xbloom") };

    content =
      beans.length === 0 ? (
        <RichEmptyState icon={Bookmark} title={t("saved.emptyBeansTitle")} description={t("saved.emptyBeansHint")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {beans.map((b) => {
            const card: BeanCardData = {
              id: b.id,
              slug: b.slug,
              name: localizedField(b, "name", locale),
              roasterName: b.roaster ? localizedField(b.roaster, "name", locale) : null,
              originCountry: b.origin_country,
              originRegion: b.origin_region,
              processLabel: processLabel(t, b.process),
              roastLevel: b.roast_level,
              roastLevelLabel: roastLabel(t, b.roast_level),
              flavors: (b.flavors ?? []).map((f: AnyRow) => f.flavor),
              compatible: { v60: b.suitable_for_v60, espresso: b.suitable_for_espresso, xbloom: b.suitable_for_xbloom },
              imageUrl: b.images?.[0]?.url ?? null,
              saved: true,
            };
            return <BeanCard key={b.id} bean={card} isAuthenticated width="w-full" size="lg" labels={compatLabels} />;
          })}
        </div>
      );
  } else if (activeTab === "roasters") {
    const { data } = await supabase
      .from("roaster_saves")
      .select("roaster:roasters!inner(id, slug, name_ar, name_en, country, logo_url, is_verified)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    const roasters: AnyRow[] = (((data ?? []).map((s: AnyRow) => s.roaster).filter(Boolean)) ?? []);

    content =
      roasters.length === 0 ? (
        <RichEmptyState icon={Users} title={t("saved.emptyRoastersTitle")} description={t("saved.emptyRoastersHint")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {roasters.map((r) => (
            <RoasterCard
              key={r.id}
              id={r.id}
              slug={r.slug}
              name={localizedField(r, "name", locale)}
              country={r.country}
              logoUrl={r.logo_url}
              isVerified={r.is_verified}
              className="w-full"
            />
          ))}
        </div>
      );
  } else {
    const { data: collections } = await supabase
      .from("recipe_collections")
      .select("id, name, description, items:recipe_collection_items(count)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    content = (
      <div className="flex flex-col gap-3">
        <div>
          <CreateCollectionButton />
        </div>
        {!collections || collections.length === 0 ? (
          <RichEmptyState icon={FolderHeart} title={t("saved.emptyCollectionsTitle")} description={t("saved.emptyCollectionsHint")} />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(collections as AnyRow[]).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-3">
                <div>
                  <p className="text-sm font-bold text-[var(--color-espresso)]">{c.name}</p>
                  <p className="text-xs text-[var(--color-muted-text)]">
                    {t("saved.itemsCount", { count: c.items?.[0]?.count ?? 0 })}
                  </p>
                </div>
                <DeleteCollectionButton collectionId={c.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-8">
      <header className="mb-6"><p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p><h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("saved.title")}</h1></header>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/saved?tab=${key}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === key ? "bg-[var(--color-ink-fixed)] text-[var(--color-soft-white)]" : "bg-[var(--color-cream)] text-[var(--color-dark-text-fixed)]"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </div>

      {content}
    </div>
  );
}
