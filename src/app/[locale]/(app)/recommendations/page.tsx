import { getLocale, getTranslations } from "next-intl/server";
import { Coffee, FlaskConical, Sparkles, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { loadRecommendations, CATALOG_LIMIT } from "@/lib/recommendations/load";
import { FLAVORS, METHODS, ROASTS, hasPersonalSignals, recommendCoffees, recommendRecipes, validChoice } from "@/lib/recommendations/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };
type SearchParams = Record<string, string | string[] | undefined>;

export default async function RecommendationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, locale, t] = await Promise.all([searchParams, getLocale(), getTranslations("recommendations")]);
  const method = validChoice(params.method, METHODS);
  const flavor = validChoice(params.flavor, FLAVORS);
  const roast = validChoice(params.roast, ROASTS);
  const data = await loadRecommendations(locale, method);
  const profile = { ...data.profile, flavors: flavor ? [flavor] : data.profile.flavors, roast: roast ?? data.profile.roast };
  const coffees = recommendCoffees(data.coffees, profile, Date.now(), method);
  const recipes = recommendRecipes(data.recipes, profile, method);
  const mode = method || flavor || roast ? "explore" : data.signedIn && hasPersonalSignals(profile) ? "personal" : "discovery";
  const number = (value: number) => new Intl.NumberFormat(`${locale}-u-nu-latn`, { maximumFractionDigits: 1 }).format(value);
  const card = "min-w-0 rounded-3xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-5";
  const control = "mt-1 h-11 w-full min-w-0 rounded-xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-3 text-sm";
  const pill = "inline-flex rounded-full border border-[var(--color-border,#ece1d3)] px-3 py-2 text-sm font-medium";

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
    <header className={`${card} bg-gradient-to-br from-[var(--color-cream)] to-[var(--color-surface)]`}>
      <p className="flex items-center gap-2 text-xs font-semibold text-[var(--color-copper)]"><Sparkles className="h-4 w-4" aria-hidden />{t("eyebrow")}</p>
      <h1 className="mt-3 text-3xl font-bold text-[var(--color-espresso)]">{t("title")}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted-text)]">{t(`modes.${mode}`)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/gear" className={pill}><Wrench className="me-2 h-4 w-4" aria-hidden />{t("gear")}</Link>
        <Link href="/gear/beans" className={pill}>{t("inventory")}</Link>
        <Link href="/watches" className={pill}>{t("watches")}</Link>
        {!data.signedIn ? <Link href="/login?next=%2Frecommendations" className={pill}>{t("signIn")}</Link> : null}
      </div>
    </header>

    <form action={`/${locale}/recommendations`} method="get" className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("filters")}>
      <label className="text-sm font-medium">{t("method")}<select name="method" defaultValue={method ?? ""} className={control}>
        <option value="">{t("savedChoices")}</option>{METHODS.map(m => <option key={m} value={m}>{t(`methods.${m}`)}</option>)}
      </select></label>
      <label className="text-sm font-medium">{t("flavor")}<select name="flavor" defaultValue={flavor ?? ""} className={control}>
        <option value="">{t("savedChoices")}</option>{FLAVORS.map(f => <option key={f} value={f}>{t(`flavors.${f}`)}</option>)}
      </select></label>
      <label className="text-sm font-medium">{t("roast")}<select name="roast" defaultValue={roast ?? ""} className={control}>
        <option value="">{t("savedChoices")}</option>{ROASTS.map(r => <option key={r} value={r}>{t(`roasts.${r}`)}</option>)}
      </select></label>
      <div className="flex items-end gap-2"><button type="submit" className="h-11 flex-1 rounded-xl bg-[var(--color-espresso)] px-4 text-sm font-semibold text-white">{t("apply")}</button><Link href="/recommendations" className={pill}>{t("reset")}</Link></div>
    </form>
    <p className="mb-4 text-xs leading-6 text-[var(--color-muted-text)]">{t("filterNote")}</p>
    {data.warnings.length ? <div role="status" className="mb-4 rounded-2xl border border-amber-600/30 bg-amber-50 p-4 text-sm text-amber-950">{[...new Set(data.warnings)].map(w => <p key={w}>{t(`warnings.${w}`)}</p>)}</div> : null}
    <p className="mb-5 text-xs text-[var(--color-muted-text)]">{t("scope", { coffees: number(data.loaded.coffees), recipes: number(data.loaded.recipes) })}{data.limited ? ` ${t("limited", { limit: CATALOG_LIMIT })}` : ""}</p>

    <section aria-labelledby="recommended-coffee">
      <h2 id="recommended-coffee" className="mb-4 flex items-center gap-2 text-xl font-bold"><Coffee className="h-5 w-5" aria-hidden />{t("coffeeTitle")}</h2>
      {!coffees.length ? <p className={card}>{t("noCoffee")}</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{coffees.map(({ item, reasons, caveats, matchingFlavors }) => <article className={card} key={`${item.kind}-${item.id}`}>
        <p className="text-xs font-medium text-[var(--color-copper)]">{item.roaster}</p>
        <h3 className="mt-2 text-lg font-semibold"><Link href={`/${item.kind === "product" ? "products" : "beans"}/${item.slug}`}>{item.name || t("unnamed")}</Link></h3>
        <p className="mt-2 text-xs text-[var(--color-muted-text)]">{item.methods.map(m => t(`methods.${m}`)).join(" · ")}</p>
        <h4 className="mt-4 text-xs font-semibold">{t("why")}</h4>
        <ul className="mt-2 space-y-1 text-sm leading-6">{reasons.length ? reasons.map(reason => <li key={reason}>{t(`reasons.${reason}`)}{reason === "flavor" ? `: ${matchingFlavors.map(f => t(`flavors.${f}`)).join("، ")}` : ""}</li>) : <li>{t("noMatch")}</li>}</ul>
        {caveats.length ? <div className="mt-3 border-t pt-3 text-xs leading-6 text-[var(--color-muted-text)]">{caveats.map(caveat => <p key={caveat}>{t(`caveats.${caveat}`)}</p>)}</div> : null}
        {item.kind === "product" ? <p className="mt-3 text-xs">{t("recordedStock", { status: t(`stock.${item.status === "low_stock" ? "low_stock" : "available"}`) })}</p> : null}
      </article>)}</div>}
    </section>

    <section className="mt-8" aria-labelledby="recommended-recipes">
      <h2 id="recommended-recipes" className="mb-4 flex items-center gap-2 text-xl font-bold"><FlaskConical className="h-5 w-5" aria-hidden />{t("recipeTitle")}</h2>
      {!recipes.length ? <p className={card}>{t("noRecipes")}</p> : <div className="grid gap-4 sm:grid-cols-2">{recipes.map(({ item, reasons, caveats }) => <article className={card} key={item.id}>
        <p className="text-xs font-semibold text-[var(--color-copper)]">{t(`methods.${item.method}`)}</p>
        <h3 className="mt-2 text-lg font-semibold"><Link href={`/recipes/${item.id}`}>{item.title}</Link></h3>
        <p className="mt-2 text-sm text-[var(--color-muted-text)]">{item.dose ? t("dose", { value: number(item.dose) }) : ""}{item.water ? ` · ${t("water", { value: number(item.water) })}` : ""}{item.seconds ? ` · ${t("seconds", { value: number(item.seconds) })}` : ""}</p>
        <h4 className="mt-4 text-xs font-semibold">{t("why")}</h4>
        <ul className="mt-2 space-y-1 text-sm leading-6">{reasons.length ? reasons.map(reason => <li key={reason}>{t(`reasons.${reason}`)}</li>) : <li>{t("noMatch")}</li>}</ul>
        <p className="mt-3 text-xs text-[var(--color-muted-text)]">{item.evidence.rated ? t("observed", { successful: number(item.evidence.successful), total: number(item.evidence.rated) }) : t("noCommunity")}</p>
        {caveats.length ? <div className="mt-3 border-t pt-3 text-xs leading-6 text-[var(--color-muted-text)]">{caveats.map(caveat => <p key={caveat}>{t(`caveats.${caveat}`)}</p>)}</div> : null}
        <Link href={`/recipes/${item.id}`} className={`${pill} mt-4`}>{t("openRecipe")}</Link>
      </article>)}</div>}
    </section>
    <details className={`${card} mt-7 text-sm`}>
      <summary className="cursor-pointer font-semibold">{t("howTitle")}</summary>
      <p className="mt-3 leading-7 text-[var(--color-muted-text)]">{t("how")}</p>
    </details>
  </div>;
}
