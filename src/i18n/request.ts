import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [messages, recommendations, brewing] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/recommendations/${locale}.json`),
    import(`../../messages/brewing/${locale}.json`),
  ]);
  return { locale, messages: { ...messages.default, recommendations: recommendations.default, brewOutcome: brewing.default } };
});
