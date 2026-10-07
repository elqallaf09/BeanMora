import { catalogName } from './core/catalog-names';
export { catalogName } from './core/catalog-names';
import type { Locale } from './copy';
import { methods } from './copy';
import { isMethod } from './core/engine';

export function methodLabel(
  value: string | null | undefined,
  locale: Locale,
): string {
  return value && isMethod(value)
    ? methods[locale][value]
    : value
      ? catalogName(value.replaceAll('_', ' '), locale)
      : '—';
}
export const processLabel = (value: string, locale: Locale) =>
  ({
    washed: ['مغسول', 'Washed'],
    natural: ['طبيعي', 'Natural'],
    honey: ['عسلي', 'Honey'],
    anaerobic: ['لاهوائي', 'Anaerobic'],
    wet_hulled: ['تقشير رطب', 'Wet hulled'],
    other: ['معالجة أخرى', 'Other process'],
  })[value]?.[locale === 'ar' ? 0 : 1] || catalogName(value, locale);
export const modelLabel = (value: string, locale: Locale) =>
  locale === 'ar'
    ? ({ Original: 'الأصلي', Studio: 'ستوديو' }[value] ??
      catalogName(value, locale))
    : value;

const stepNames: Record<string, string> = {
  Bloom: 'التزهير',
  'Drain and serve': 'التصريف والتقديم',
  'Final pour': 'الصبة الأخيرة',
  'First pour': 'الصبة الأولى',
  'Second pour': 'الصبة الثانية',
  'Third pour': 'الصبة الثالثة',
  'Grind and dose': 'الطحن والجرعة',
  'Heat water': 'تسخين الماء',
  'Prep the filter': 'تجهيز الفلتر',
  'Prepare your setup': 'تجهيز أدوات التحضير',
};
const stepDescriptions: Record<string, string> = {
  'Place the V60 on the scales, tare to zero, start your timer, and pour over 45g of hot water in a circular motion, "blooming" the coffee.':
    'ضع V60 على الميزان وصفّره، ثم شغّل المؤقت وصب 45 غ من الماء الساخن بحركة دائرية لتزهير البن.',
  'Allow all the water to drip through, aiming for a total brew time of 3:00-3:30 minutes. Serve immediately and enjoy.':
    'اترك الماء يتصّرّف، مستهدفًا وقت تحضير إجماليًا من 3:00 إلى 3:30 دقائق، ثم قدّم القهوة.',
  'At 1:30, pour the final amount of water, totalling 250g on the scales.':
    'عند 1:30، صب الكمية الأخيرة حتى يصل الوزن الإجمالي على الميزان إلى 250 غ.',
  'Grind 15g of coffee to a medium consistency (caster sugar texture), add it to the brewer, and gently shake to level.':
    'اطحن 15 غ من البن بطحنة متوسطة بقوام السكر الناعم، وضعه في أداة التحضير وهزها برفق لتسوية السطح.',
  'Heat your brewing water to 94°C.': 'سخّن ماء التحضير إلى 94°C.',
  'Fold and place the filter in the brewer. Rinse thoroughly with hot water to remove any papery taste and preheat the server. After 60 seconds preheating, discard the rinse water from the server.':
    'اطوِ الفلتر وضعه في أداة التحضير، واشطفه جيدًا بالماء الساخن لإزالة الطعم الورقي وتسخين إبريق التقديم. تخلّص من ماء الشطف بعد 60 ثانية.',
  'Gather all ingredients and equipment.': 'جهّز جميع المقادير والأدوات.',
  'At 0:30, pour an additional 55g of water in a steady circular pattern, to 100g.':
    'عند 0:30، أضف 55 غ من الماء بحركة دائرية منتظمة حتى يصل المجموع إلى 100 غ.',
  'At 1:00, pour again until you reach 150g.':
    'عند 1:00، واصل الصب حتى يصل المجموع إلى 150 غ.',
};
export function localizeStep(
  title: string,
  description: string,
  locale: Locale,
) {
  if (locale === 'en') return { title, description };
  const pour = title.match(/^Pour\s+(\d+)$/i);
  const cumulative = description.match(
    /^Pour to a cumulative ([\d.]+)ml(?: \(final\))?\.$/,
  );
  const imported = description.match(
    /^Water: ([\d.]+) ml; source temperature: ([\d.]+); flow: ([\d.]+|unspecified) ml\/s; pause: ([\d.]+) s\. Check the original link for pouring pattern\.$/,
  );
  return {
    title:
      stepNames[title] ??
      (pour ? `الصبة ${pour[1]}` : catalogName(title, locale)),
    description:
      stepDescriptions[description] ??
      (cumulative
        ? `صب حتى يصل مجموع الماء إلى ${cumulative[1]} مل.`
        : imported
          ? `الماء: ${imported[1]} مل · حرارة المصدر: ${imported[2]} · التدفق: ${imported[3] === 'unspecified' ? 'غير منشور' : imported[3] + ' مل/ث'} · التوقف: ${imported[4]} ث. راجع نمط الصب في رابط المصدر.`
          : description),
  };
}
