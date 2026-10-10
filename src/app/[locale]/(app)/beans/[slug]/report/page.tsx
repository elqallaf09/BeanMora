import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BeanCorrectionForm } from "@/components/coffee/bean-correction-form";
import { Link, redirect } from "@/i18n/navigation";
import { localizedField } from "@/lib/localized";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ReportBean({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const ar = locale === "ar";
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const returnTo = `/beans/${encodeURIComponent(slug)}/report`;
  if (!user) redirect({ href: `/login?next=${encodeURIComponent(returnTo)}`, locale });
  // The existing correction policy intentionally accepts session-owned guest
  // feedback. It does not publish edits or grant any moderation permission.
  const { data: bean, error } = await db.from("beans").select("id,name_ar,name_en").eq("slug", slug).maybeSingle();
  if (error || !bean) notFound();
  return <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
    <h1 className="type-headline">{ar ? "إبلاغ عن معلومة غير صحيحة" : "Report incorrect info"}</h1>
    <p>{localizedField(bean, "name", locale)}</p>
    <p className="text-sm text-[var(--color-muted-text)]">{ar ? "تُراجع الملاحظة قبل تغيير معلومات البن." : "Corrections are reviewed before coffee information changes."}</p>
    <BeanCorrectionForm beanId={bean.id} />
    <Link href={`/beans/${encodeURIComponent(slug)}`} className="inline-block underline">{ar ? "الرجوع للبن" : "Back to coffee"}</Link>
  </div>;
}
