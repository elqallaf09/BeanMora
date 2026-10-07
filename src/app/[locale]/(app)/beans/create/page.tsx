import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { MemberContributionForm } from "@/components/coffee/member-contribution-form";
export const dynamic = "force-dynamic";
export default async function CreateBean({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.is_anonymous) redirect({ href: "/login", locale });
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="type-headline">
        {locale === "ar" ? "إضافة بن" : "Add coffee"}
      </h1>
      <MemberContributionForm kind="bean" />
    </div>
  );
}
