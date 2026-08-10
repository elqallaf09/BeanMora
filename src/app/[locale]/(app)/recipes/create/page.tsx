import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { isGuestUser } from "@/lib/guest";
import { RecipeBuilderForm } from "./recipe-builder-form";

export const dynamic = "force-dynamic";

export default async function CreateRecipePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 lg:py-8">
      <header className="mb-7"><p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p><h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("recipeCreate.title")}</h1></header>
      <RecipeBuilderForm isGuest={isGuestUser(user)} locale={locale} />
    </div>
  );
}
