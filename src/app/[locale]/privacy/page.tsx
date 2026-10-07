import { legalContent, legalUpdated } from "@/lib/legal-content";
import { Link } from "@/i18n/navigation";
export default async function Privacy({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ar = locale !== "en";
  const doc = legalContent[ar ? "ar" : "en"].privacy;
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
      <Link href="/home">BeanMora</Link>
      <h1 className="text-3xl font-bold">{doc.title}</h1>
      <p>
        {ar ? "آخر تحديث: " : "Updated: "}
        {legalUpdated}
      </p>
      {doc.sections.map(([title, body]) => (
        <section key={title} className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="leading-8">{body}</p>
        </section>
      ))}
      <Link href="/terms">{ar ? "شروط الاستخدام" : "Terms of use"}</Link>
    </main>
  );
}
