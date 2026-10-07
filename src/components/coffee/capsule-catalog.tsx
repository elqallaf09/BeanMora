"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { capsuleSystems } from "@/lib/capsules";
export function CapsuleCatalog() {
  const locale = useLocale() === "ar" ? "ar" : "en",
    ar = locale === "ar";
  const [system, setSystem] = useState("all"),
    [q, setQ] = useState("");
  const rows = capsuleSystems.filter(
    (c) =>
      (system === "all" || c.id === system) &&
      [c.name.ar, c.name.en, c.examples.ar, c.examples.en]
        .join(" ")
        .toLowerCase()
        .includes(q.trim().toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <p>
        {ar
          ? "اختر نظام ماكينتك، ثم تصفح الأنواع ومواقع الطلب."
          : "Choose your machine system, then explore capsules and order sites."}
      </p>
      <input
        aria-label={ar ? "بحث الكبسولات" : "Search capsules"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={ar ? "اسم النظام أو الكبسولة" : "System or capsule name"}
        className="min-h-11 w-full rounded-xl border p-3"
      />
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", name: { ar: "الكل", en: "All" } },
          ...capsuleSystems,
        ].map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={system === c.id}
            onClick={() => setSystem(c.id)}
            className={`min-h-11 rounded-xl border px-3 text-sm ${system === c.id ? "bg-[var(--color-espresso)] text-white" : ""}`}
          >
            {c.name[locale]}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((c) => (
          <article
            key={c.id}
            className="space-y-3 rounded-2xl border bg-white p-5"
          >
            <h2 className="text-lg font-bold">{c.name[locale]}</h2>
            <p className="text-sm leading-7">{c.description[locale]}</p>
            <p className="text-sm">
              {(ar ? "أمثلة: " : "Examples: ") + c.examples[locale]}
            </p>
            <p className="text-xs text-[var(--color-muted-text)]">
              {c.region[locale]}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <a
                href={c.shop}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 underline"
              >
                {ar ? "الأنواع وموقع الطلب" : "Capsules and order site"}
              </a>
              <a
                href={c.source}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 underline"
              >
                {ar ? "مصدر التوافق" : "Compatibility source"}
              </a>
            </div>
          </article>
        ))}
      </div>
      {!rows.length ? (
        <p>
          {ar
            ? "لا توجد نتائج؛ جرّب اسم النظام."
            : "No results; try the system name."}
        </p>
      ) : null}
      <p className="text-xs text-[var(--color-muted-text)]">
        {ar
          ? "مراجعة المصادر: ٧ أكتوبر ٢٠٢٦. السعر والمخزون والتوصيل بحسب المتجر عند الطلب."
          : "Sources reviewed: 7 October 2026. Price, stock and delivery depend on the store at ordering."}
      </p>
    </div>
  );
}
