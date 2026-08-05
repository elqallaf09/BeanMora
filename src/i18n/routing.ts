import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
