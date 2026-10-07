import { createClient } from "@/lib/supabase/server";
import { Link, redirect } from "@/i18n/navigation";
import { localizedRecipeTitle } from "@/lib/localized";
export const dynamic = "force-dynamic";
export default async function MyRecipes({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    ar = locale === "ar";
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.is_anonymous) redirect({ href: "/login", locale });
  const { data, error } = await db
    .from("recipes")
    .select("id,title,title_ar,visibility")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="type-headline">
        {ar ? "وصفاتي المضافة" : "My submitted recipes"}
      </h1>
      <Link
        className="inline-block rounded-xl border px-4 py-3"
        href="/recipes/create"
      >
        {ar ? "إضافة وصفة" : "Add recipe"}
      </Link>
      {error ? (
        <p role="alert">
          {ar ? "تعذّر التحميل؛ أعد المحاولة." : "Could not load; try again."}
        </p>
      ) : (
        data?.map((r) => (
          <Link
            className="block space-y-2 rounded-xl border bg-white p-4"
            key={r.id}
            href={`/recipes/${r.id}`}
          >
            <span className="block font-bold">
              {localizedRecipeTitle(r, locale)}
            </span>
            <span className="block text-sm">
              {r.visibility === "public"
                ? ar
                  ? "عامة"
                  : "Public"
                : ar
                  ? "خاصة"
                  : "Private"}
            </span>
          </Link>
        ))
      )}
      {!error && !data?.length ? (
        <p>{ar ? "لم تضف وصفة بعد." : "No submitted recipes yet."}</p>
      ) : null}
    </div>
  );
}
