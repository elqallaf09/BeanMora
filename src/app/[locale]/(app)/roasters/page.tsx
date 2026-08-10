import { redirect } from "@/i18n/navigation";

/**
 * A standalone roaster list is redundant with Discover's "roasters"
 * category (see discover/page.tsx), which runs the same query with full
 * search/sort support, so this route forwards there instead of maintaining
 * a second, weaker listing UI.
 */
export default async function RoastersListRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/discover?category=roasters", locale });
}
