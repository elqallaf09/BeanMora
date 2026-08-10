/**
 * BeanMora content tables store bilingual columns as `<field>_ar` /
 * `<field>_en` pairs (beans.name_ar/name_en, roasters.name_ar/name_en, ...)
 * rather than a single localized column, so both languages are always
 * available without a join. This picks the column for the active locale,
 * falling back to the other language rather than showing nothing if one
 * side is missing (never mix languages within a single UI string, but a
 * present translation beats a blank one).
 */
export function localizedField<T extends Record<string, unknown>>(
  row: T | null | undefined,
  field: string,
  locale: string,
): string {
  if (!row) return "";
  const primary = row[`${field}_${locale}`];
  const fallbackLocale = locale === "ar" ? "en" : "ar";
  const fallback = row[`${field}_${fallbackLocale}`];
  return (typeof primary === "string" && primary) || (typeof fallback === "string" && fallback) || "";
}
