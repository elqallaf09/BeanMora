import { getLocale } from "next-intl/server";
import { CapsuleCatalog } from "@/components/coffee/capsule-catalog";
export default async function Capsules() {
  const locale = await getLocale();
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="type-headline">
        {locale === "ar" ? "الكبسولات" : "Capsules"}
      </h1>
      <CapsuleCatalog />
    </div>
  );
}
