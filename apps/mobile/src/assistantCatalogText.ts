import { localeLabel, type Locale } from './localeText';

export const importedRecipeSummary = 'Source brew settings; water is in ml. Open the original link for device-specific instructions. Total brew time was not published.';

/** Translate the importer's own notice; publisher and member prose stays intact. */
export function assistantCatalogSummary(locale: Locale, arabic?: string | null, english?: string | null): string {
  if (english === importedRecipeSummary) return localeLabel(locale,
    'إعدادات التحضير من المصدر؛ الماء بالملليلتر. افتح الرابط الأصلي لتعليمات الجهاز. وقت التحضير الكلي غير منشور.',
    'Source brew settings; water is in ml. Open the original link for device-specific instructions. Total brew time was not published.');
  return (locale === 'ar' ? arabic || english : english || arabic) ?? '';
}
