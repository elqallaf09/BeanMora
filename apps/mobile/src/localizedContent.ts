import { arabicRecipeTitles } from './foreignTitles';
import type { Locale } from './copy';
import { methods } from './copy';
import { isMethod } from './core/engine';

// Display translations never change the source identifier or the stored recipe.
// Use this only for catalog names and enums, never for a member's own prose.
const names: Record<string, string> = {
  'French Press': 'فرنش برس',
  'Cold Brew': 'كولد برو',
  'Pour Over': 'ترشيح يدوي',
  'Single Origin': 'أحادي المنشأ',
  'Black Honey': 'عسلي أسود',
  'Double Anaerobic': 'لاهوائي مزدوج',
  'Wet Hulled': 'تقشير رطب',
  'Thermal Shock': 'صدمة حرارية',
  'xBloom Official': 'xBloom الرسمي',
  'Jeed roastery': 'محمصة جيد',
  'Onyx Coffee Lab': 'مختبر أونيكس للقهوة',
  'Workshop Coffee': 'وركشوب كوفي',
  "Verve's Coffee Department": 'قسم القهوة في فيرف',
  "Toby's Estate": 'توبيز إيستيت',
  'ONA Coffee': 'أونا كوفي',
  'NOMAD Coffee': 'نوماد كوفي',
  'Methods Roastery': 'محمصة ميثودز',
  'April Coffee Roasters': 'محمصة أبريل',
  'Quarter Horse Coffee': 'كوارتر هورس كوفي',
  'Five Senses Coffee': 'فايف سينسز كوفي',
  'Rubens Gardelli': 'روبينز غارديلي',
  'Roots Roastery': 'محمصة روتس',
  'Coffee Collective': 'كوفي كولكتيف',
  'Stumptown Coffee Roasters': 'محمصة ستامبتاون',
  'Origin Coffee Roasters': 'محمصة أوريجن',
  'Carmo de Minas': 'كارمو دي ميناس',
  'Central America & Africa': 'أمريكا الوسطى وأفريقيا',
  'East Africa': 'شرق أفريقيا',
  'Papua New Guinea': 'بابوا غينيا الجديدة',
  'Costa Rica': 'كوستاريكا',
  'El Salvador': 'السلفادور',
  'Saudi Arabia': 'السعودية',
  'United States': 'الولايات المتحدة',
  'United Kingdom': 'المملكة المتحدة',
  'New Zealand': 'نيوزيلندا',
  'South Korea': 'كوريا الجنوبية',
  Bolivia: 'بوليفيا',
  Brazil: 'البرازيل',
  Colombia: 'كولومبيا',
  Ecuador: 'الإكوادور',
  Ethiopia: 'إثيوبيا',
  Guatemala: 'غواتيمالا',
  Honduras: 'هندوراس',
  India: 'الهند',
  Indonesia: 'إندونيسيا',
  Kenya: 'كينيا',
  Mexico: 'المكسيك',
  Panama: 'بنما',
  Peru: 'بيرو',
  Rwanda: 'رواندا',
  Tanzania: 'تنزانيا',
  Uganda: 'أوغندا',
  Yemen: 'اليمن',
  China: 'الصين',
  Thailand: 'تايلند',
  Germany: 'ألمانيا',
  Netherlands: 'هولندا',
  Denmark: 'الدنمارك',
  France: 'فرنسا',
  Spain: 'إسبانيا',
  Sweden: 'السويد',
  Japan: 'اليابان',
  Australia: 'أستراليا',
  Singapore: 'سنغافورة',
  Canada: 'كندا',
  Italy: 'إيطاليا',
  Kuwait: 'الكويت',
  Qatar: 'قطر',
  Bahrain: 'البحرين',
  Oman: 'عُمان',
  UAE: 'الإمارات',
  'Hong Kong': 'هونغ كونغ',
  Taiwan: 'تايوان',
};
const words: Record<string, string> = {
  ice: 'مثلّج',
  iced: 'مثلّج',
  hot: 'حار',
  cold: 'بارد',
  natural: 'طبيعي',
  washed: 'مغسول',
  honey: 'عسلي',
  anaerobic: 'لاهوائي',
  blend: 'خلطة',
  decaf: 'منزوع الكافيين',
  coffee: 'قهوة',
  roastery: 'محمصة',
  roasters: 'محمصة',
  roaster: 'محمصة',
  official: 'رسمي',
  recipe: 'وصفة',
  filter: 'ترشيح',
  espresso: 'إسبريسو',
  classic: 'كلاسيك',
  original: 'الأصلي',
  studio: 'ستوديو',
  pro: 'برو',
  plus: 'بلس',
  gen: 'الجيل',
  cup: 'كوب',
  cups: 'أكواب',
  bomb: 'بومب',
  bombe: 'بومب',
  jeed: 'جيد',
  single: 'مفرد',
  origin: 'منشأ',
  chocolate: 'شوكولاتة',
  milk: 'حليب',
  milky: 'حليبي',
  cake: 'كيك',
  watermelon: 'بطيخ',
  whisky: 'ويسكي',
  washedwet: 'مغسول',
  process: 'معالجة',
  geisha: 'غيشا',
  gesha: 'غيشا',
  holiday: 'العطلات',
  house: 'المنزل',
  fruity: 'فاكهي',
  light: 'فاتح',
  medium: 'متوسط',
  dark: 'داكن',
  roast: 'تحميص',
  extended: 'ممتد',
  fermented: 'مخمّر',
  arabica: 'أرابيكا',
  robusta: 'روبوستا',
  heirloom: 'سلالات محلية',
  bourbon: 'بوربون',
  yellow: 'أصفر',
  red: 'أحمر',
  black: 'أسود',
  white: 'أبيض',
  blue: 'أزرق',
  green: 'أخضر',
  greenland: 'غرينلاند',
  wet: 'رطب',
  fermentednatural: 'طبيعي مخمّر',
  omni: 'متعدد الاستخدام',
  pour: 'صب',
  over: 'ترشيح',
  press: 'كبس',
  brew: 'تحضير',
  brewing: 'تحضير',
  arabian: 'عربي',
  ethiopian: 'إثيوبي',
  colombian: 'كولومبي',
  brazilian: 'برازيلي',
  comandante: 'كوماندانتي',
  fellow: 'فيلو',
  timemore: 'تايم مور',
  breville: 'بريفيل',
  baratza: 'باراتزا',
  acaia: 'أكايا',
  niche: 'نيش',
  kinu: 'كينو',
  gaggia: 'غاجيا',
  lelit: 'ليليت',
  rancilio: 'رانشيليو',
  hario: 'هاريو',
  bialetti: 'بياليتي',
  wacaco: 'واكاكو',
  aeroPress: 'إيروبريس',
  aeropress: 'إيروبريس',
  chemex: 'كيمكس',
  kalita: 'كاليتا',
  origami: 'أوريغامي',
  orea: 'أوريا',
  cafec: 'كافيك',
  normcore: 'نورمكور',
  ecuador: 'الإكوادور',
  ethiopia: 'إثيوبيا',
  brazil: 'البرازيل',
  colombia: 'كولومبيا',
  panama: 'بنما',
  kenya: 'كينيا',
  yemen: 'اليمن',
  guatemala: 'غواتيمالا',
  peru: 'بيرو',
  rwanda: 'رواندا',
  uganda: 'أوغندا',
  india: 'الهند',
  china: 'الصين',
  thailand: 'تايلند',
  indonesia: 'إندونيسيا',
  mexico: 'المكسيك',
  default: 'الافتراضي',
  new: 'جديد',
  double: 'مزدوج',
  lot: 'محصول',
  finca: 'فينكا',
  bloom: 'التزهير',
  people: 'بيبل',
  possession: 'بوسيشن',
  sidra: 'سيدرا',
  standout: 'ستاند آوت',
  pink: 'وردي',
  paperswan: 'بيبر سوان',
  caturra: 'كاتورا',
  catuai: 'كاتواي',
  santa: 'سانتا',
  future: 'فيوتشر',
  aricha: 'أريشا',
  lychee: 'ليتشي',
  strawberry: 'فراولة',
  brian: 'براين',
  burundi: 'بوروندي',
  peach: 'خوخ',
  ombligon: 'أومبليغون',
  standard: 'قياسي',
  passion: 'باشن',
  savage: 'سافج',
  poma: 'بوما',
  chiroso: 'تشيروزو',
  fazenda: 'فازيندا',
  lasso: 'لاسو',
  juan: 'خوان',
  fermentation: 'تخمير',
  ferment: 'تخمير',
  gotiti: 'غوتيتي',
  chelchele: 'تشيلتشيلي',
  hacienda: 'هاسييندا',
  onyx: 'أونيكس',
  fruit: 'فاكهة',
  school: 'سكول',
  pepe: 'بيبي',
  andes: 'أنديز',
  kebele: 'كيبيلي',
  blending: 'خلط',
  thermal: 'حراري',
  shock: 'صدمة',
  wave: 'ويف',
  fully: 'كامل',
  day: 'يوم',
  rainbow: 'قوس قزح',
  injerto: 'إنخيرتو',
  eighty: 'إيتي',
  paraiso: 'بارايسو',
  bermudez: 'بيرموديز',
  java: 'جافا',
  perlitas: 'بيرليتاس',
  cherry: 'كرز',
  triangulo: 'تريانغولو',
  rodrigo: 'رودريغو',
  sanchez: 'سانشيز',
  zero: 'زيرو',
  wild: 'وايلد',
  arriyadh: 'الرياض',
  mixed: 'مشكّل',
  test: 'تجربة',
  of: 'من',
  by: 'لدى',
  no: 'رقم',
  not: 'غير',
  the: 'الـ',
  and: 'و',
  with: 'مع',
  to: 'إلى',
  for: 'لـ',
  diego: 'دييغو',
  parra: 'بارا',
  wilder: 'وايلدر',
  lazo: 'لازو',
  bella: 'بيلا',
  alex: 'أليكس',
  aponte: 'أبونتي',
  proud: 'براود',
  mary: 'ماري',
  rhys: 'ريس',
  sean: 'شون',
  chad: 'تشاد',
  steven: 'ستيفن',
  lin: 'لين',
  french: 'فرنسي',
  mattari: 'مطري',
  guji: 'غوجي',
  sidama: 'سيداما',
  sidamo: 'سيدامو',
};
const pairs: Record<string, string> = {
  sh: 'ش',
  ch: 'تش',
  th: 'ث',
  ph: 'ف',
  kh: 'خ',
  gh: 'غ',
  ee: 'ي',
  oo: 'و',
  ou: 'و',
  ai: 'اي',
  ay: 'اي',
  ea: 'ي',
  ie: 'ي',
  ck: 'ك',
  qu: 'كو',
  ng: 'نغ',
};
const letters: Record<string, string> = {
  a: 'ا',
  b: 'ب',
  c: 'ك',
  d: 'د',
  e: 'ي',
  f: 'ف',
  g: 'غ',
  h: 'ه',
  i: 'ي',
  j: 'ج',
  k: 'ك',
  l: 'ل',
  m: 'م',
  n: 'ن',
  o: 'و',
  p: 'ب',
  q: 'ق',
  r: 'ر',
  s: 'س',
  t: 'ت',
  u: 'و',
  v: 'ف',
  w: 'و',
  x: 'كس',
  y: 'ي',
  z: 'ز',
};
export function catalogName(
  text: string | null | undefined,
  locale: Locale,
): string {
  if (!text || locale === 'en') return text || '';
  if (arabicRecipeTitles[text]) return arabicRecipeTitles[text];
  if (names[text]) return names[text];
  let value = text;
  for (const [name, translated] of Object.entries(names).sort(
    (a, b) => b[0].length - a[0].length,
  ))
    value = value.replace(
      new RegExp(
        '(^|[^\\p{L}\\p{N}])' +
          name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
          '(?=$|[^\\p{L}\\p{N}])',
        'giu',
      ),
      (_, prefix) => prefix + translated,
    );
  return value.replace(/[A-Za-z][A-Za-zÀ-ž0-9'’.-]*/g, (token) => {
    if (
      /^(xBloom|V60|OREA|PID|USB|RPM|C40|J|K|SL|CMN|AA|AB|EA|MQ|CGLE|AG|PP|RFID|COE|AN|AW|W|F|BoC|M2M|C)$/i.test(
        token,
      ) ||
      /^[A-Z]{1,4}\d+[A-Za-z0-9.-]*$/.test(token)
    )
      return token;
    const lower = token.toLowerCase();
    if (words[lower]) return words[lower];
    if (lower === 'g' || lower === 'ml' || lower === 's') return token;
    // Phonetic catalog-name fallback. The exact spelling remains in source details.
    const latin = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return latin
      .replace(
        /sh|ch|th|ph|kh|gh|ee|oo|ou|ai|ay|ea|ie|ck|qu|ng|[a-z]/g,
        (part) => pairs[part] ?? letters[part] ?? part,
      )
      .replace(/[اأ]{2,}/g, 'ا');
  });
}
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
