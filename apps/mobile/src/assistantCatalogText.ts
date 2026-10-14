import { localeLabel, type Locale } from './localeText';

export const importedRecipeSummary = 'Source brew settings; water is in ml. Open the original link for device-specific instructions. Total brew time was not published.';
const reviewedCatalogCopy: readonly (readonly [string,string])[] = [
  ['أداة إسبريسو محمولة بمضخة يدوية وسلة غير مضغوطة؛ لا تسخّن الماء.', 'Portable hand-pump espresso maker with an unpressurised basket; does not heat water.'],
  ['ماكينة إسبريسو يدوية مع مقياس ضغط وخياري فلتر.', 'Manual espresso machine with a pressure gauge and two portafilter options.'],
  ['ماكينة ذراع قابلة للطي والسفر؛ تحتاج ماء ساخنًا خارجيًا.', 'Folding travel lever machine requiring externally heated water.'],
  ['ذراع يدوي', 'Manual lever'],
  ['ذراع يدوي قابل للطي', 'Folding manual lever'],
  ['لا؛ يحتاج ماء ساخنًا خارجيًا', 'No; requires externally heated water'],
  ['حقيبة ومقياس ضغط', 'Case and pressure gauge'],
  ['مقياس ضغط وفلتران للتحكم بالتدفق والتحضير المكشوف', 'Pressure gauge, flow-control and bottomless portafilters'],
  ['9–12 بار في إرشادات الشركة', '9–12 bar in manufacturer guidance'],
];

function reviewedText(locale:Locale,english:string,arabic?:string):string|null {
  const pair=reviewedCatalogCopy.find(([,text])=>text===english);
  return pair?localeLabel(locale,arabic||pair[0],pair[1]):null;
}

/** Translate reviewed catalog copy; other publisher and member prose stays intact. */
export function assistantCatalogSummary(locale: Locale, arabic?: string | null, english?: string | null): string {
  if (english === importedRecipeSummary) return localeLabel(locale,
    'إعدادات التحضير من المصدر؛ الماء بالملليلتر. افتح الرابط الأصلي لتعليمات الجهاز. وقت التحضير الكلي غير منشور.',
    'Source brew settings; water is in ml. Open the original link for device-specific instructions. Total brew time was not published.');
  return reviewedText(locale,english??'',arabic??undefined) ?? (locale==='ar'?arabic:english) ?? '';
}

export function assistantCatalogFact(locale:Locale,key:string,value:unknown):string {
  const bilingual=Array.isArray(value)&&value.length===2&&value.every(v=>typeof v==='string');
  const english=bilingual?String(value[1]):String(value);
  const arabic=bilingual?String(value[0]):undefined;
  if(key==='heats_water'&&english==='No')return localeLabel(locale,'لا','No');
  if(key==='heats_water'&&english==='Yes')return localeLabel(locale,'نعم','Yes');
  const known=reviewedText(locale,english,arabic);if(known!==null)return known;
  const capacity=key==='capacity'?english.match(/^([0-9]+(?:\.[0-9]+)?) ml water$/):null;
  if(capacity)return localeLabel(locale,`${capacity[1]} مل ماء`,`${capacity[1]} ml water`);
  return bilingual?localeLabel(locale,arabic!,english):english;
}
