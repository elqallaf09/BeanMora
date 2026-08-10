import { redirect } from "@/i18n/navigation";

/**
 * A standalone recipe list is redundant with Discover's "recipes" category
 * (see discover/page.tsx — category=recipes runs the same query with full
 * search/filter/sort support), so this route forwards there instead of
 * maintaining a second, weaker listing UI.
 */
export default async function RecipesListRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/discover?category=recipes", locale });
}
