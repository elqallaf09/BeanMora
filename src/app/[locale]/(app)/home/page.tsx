import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState } from "@/components/shared/state-views";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("name, username").eq("id", user.id).maybeSingle()
    : { data: null };

  // Real query against the recipes table. Until migrations are applied to
  // the linked Supabase project and content exists, this returns an empty
  // array or a schema error — both are handled explicitly below, never
  // papered over with placeholder/mock cards.
  const { data: recentRecipes, error } = await supabase
    .from("recipes")
    .select("id, title, brew_method, created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(6);

  const displayName = profile?.name ?? profile?.username ?? user?.email ?? "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-espresso)]">
            {displayName
              ? t("onboarding.welcomeTitle").replace("BeanMora", displayName)
              : t("brand.name")}
          </h1>
          <p className="text-sm text-[var(--color-muted-text)]">{t("brand.tagline")}</p>
        </div>
        <Button asChild variant="default">
          <Link href="/brew">{t("nav.brew")}</Link>
        </Button>
      </div>

      <section aria-labelledby="recent-recipes-heading">
        <h2 id="recent-recipes-heading" className="mb-3 text-lg font-semibold text-[var(--color-espresso)]">
          {t("nav.recipes")}
        </h2>

        {error ? (
          <ErrorState message={t("errors.supabase")} />
        ) : !recentRecipes || recentRecipes.length === 0 ? (
          <EmptyState
            title={t("empty.noRecipes")}
            hint={t("empty.noRecipesHint")}
            action={
              <Button asChild size="sm" variant="accent">
                <Link href="/recipes/create">{t("nav.recipes")}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {recentRecipes.map((recipe) => (
              <li
                key={recipe.id}
                className="rounded-[var(--radius-brand)] border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-4"
              >
                <p className="font-medium text-[var(--color-dark-text)]">{recipe.title}</p>
                <p className="text-xs text-[var(--color-muted-text)]">{recipe.brew_method}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
