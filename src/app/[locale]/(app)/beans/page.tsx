import { redirect } from "@/i18n/navigation";

/**
 * A standalone bean list is redundant with Discover's "beans" category
 * (the default tab — see discover/page.tsx), which runs the same query
 * with full search/filter/sort support, so this route forwards there
 * instead of maintaining a second, weaker listing UI.
 */
export default async function BeansListRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/discover?category=beans", locale });
}
