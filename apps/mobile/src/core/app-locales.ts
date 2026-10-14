export const APP_LOCALES = ['ar', 'en', 'ja', 'fr', 'it', 'es', 'pt-BR', 'zh-CN'] as const;
export type AppLocale = typeof APP_LOCALES[number];
export const isAppLocale = (value:unknown):value is AppLocale => typeof value==='string' && (APP_LOCALES as readonly string[]).includes(value);
