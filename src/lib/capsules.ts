/** Official manufacturer catalogs reviewed 2026-10-07. No live price/stock claims. */
export type CapsuleSystem = {
  id: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  examples: { ar: string; en: string };
  shop: string;
  region: { ar: string; en: string };
  source: string;
};
export const capsuleSystems: CapsuleSystem[] = [
  {
    id: "nespresso-original",
    name: { ar: "نسبريسو أوريجينال", en: "Nespresso Original" },
    description: {
      ar: "كبسولات نظام أوريجينال للإسبريسو واللونغو. لا تعمل في مكائن فيرتو. اختر الكبسولات الخارجية التي تنص عبوتها صراحة على توافقها مع أوريجينال.",
      en: "Original capsules for espresso and lungo. They do not fit Vertuo machines. Third-party capsules must explicitly state Original compatibility.",
    },
    examples: {
      ar: "أربيجيو، نابولي، ريستريتو إيتاليانو، فولوتو",
      en: "Arpeggio, Napoli, Ristretto Italiano, Volluto",
    },
    shop: "https://www.nespresso.com/kw/en/coffee-capsules/original",
    region: { ar: "متجر الكويت", en: "Kuwait store" },
    source: "https://www.contact.nespresso.com/faq-3/at/en",
  },
  {
    id: "nespresso-vertuo",
    name: { ar: "نسبريسو فيرتو", en: "Nespresso Vertuo" },
    description: {
      ar: "كبسولات نظام فيرتو بأحجام مشروب متعددة. غير متوافقة مع أوريجينال. تأكد من دعم موديل ماكينتك لحجم الكبسولة قبل الطلب.",
      en: "Vertuo capsules offer several drink sizes and are incompatible with Original. Check that your machine model supports the capsule size.",
    },
    examples: {
      ar: "ميلوزيو، إنتنسو، أوداشيو",
      en: "Melozio, Intenso, Odacio",
    },
    shop: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
    region: { ar: "متجر الكويت", en: "Kuwait store" },
    source: "https://www.nespresso.com/kw/en/faqs",
  },
  {
    id: "dolce-gusto",
    name: { ar: "نسكافيه دولتشي غوستو", en: "Nescafé Dolce Gusto" },
    description: {
      ar: "نظام كبسولات دولتشي غوستو التقليدي للقهوة ومشروبات الحليب. بعض المشروبات تحتاج كبسولتين. اختر النظام المكتوب على العبوة؛ نظام نيو له كبسولات مختلفة.",
      en: "Classic Dolce Gusto capsules for coffee and milk drinks. Some drinks need two capsules. Match the system printed on the pack; Neo uses a different pod format.",
    },
    examples: {
      ar: "إسبريسو إنتنسو، ومجموعة مشروبات دولتشي غوستو",
      en: "Espresso Intenso and the Dolce Gusto drinks range",
    },
    shop: "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks",
    region: {
      ar: "موقع الشرق الأوسط؛ تحقق من بلد التوصيل",
      en: "Middle East site; check delivery country",
    },
    source: "https://www.dolcegusto-me.com/ndg_mena_en/faqs-en",
  },
  {
    id: "lavazza-a-modo-mio",
    name: { ar: "لافاتزا آ مودو ميو", en: "Lavazza A Modo Mio" },
    description: {
      ar: "كبسولات آ مودو ميو مخصصة لنظامها. راجع توافق المنتج مع موديل الماكينة؛ بعض التشكيلات الحديثة تستثني موديلات أقدم. لا تختلط مع بلو أو كبسولات لافاتزا المتوافقة مع نسبريسو.",
      en: "A Modo Mio capsules use their own system. Check each product against your machine model: some new ranges exclude older models. BLUE and Lavazza Nespresso-compatible capsules are different formats.",
    },
    examples: {
      ar: "إنتنسو، ديفينو، باسيونالي",
      en: "Intenso, Divino, Passionale",
    },
    shop: "https://www.lavazza.com/en/coffee-capsules-pods/a-modo-mio",
    region: {
      ar: "الموقع الدولي؛ اختر بلدك والمتجر",
      en: "International catalog; select country and store",
    },
    source: "https://www.lavazza.com/en/coffee-capsules-pods/a-modo-mio",
  },
  {
    id: "lavazza-blue",
    name: { ar: "لافاتزا بلو", en: "Lavazza BLUE" },
    description: {
      ar: "نظام كبسولات بلو المخصص لمكائن لافاتزا بلو. تحقق من اسم النظام على الماكينة والعبوة؛ لا تستخدم كبسولات آ مودو ميو مكانها.",
      en: "BLUE capsules are for Lavazza BLUE machines. Match the system on the machine and pack; do not substitute A Modo Mio capsules.",
    },
    examples: { ar: "مجموعة بلو للمكاتب", en: "BLUE office coffee range" },
    shop: "https://www.lavazza.com/en/coffee-capsules-pods/blue",
    region: {
      ar: "الموقع الدولي؛ اختر بلدك والموزع",
      en: "International catalog; select country and distributor",
    },
    source: "https://www.lavazza.com/en/coffee-capsules-pods/blue",
  },
  {
    id: "illy-iperespresso",
    name: { ar: "إيلي إيبرإسبريسو", en: "illy iperEspresso" },
    description: {
      ar: "كبسولات إيبرإسبريسو لمكائن إيلي التي تدعم هذا النظام. تختلف عن كبسولات إيلي المتوافقة مع نسبريسو، وعن كبسولات إيبر للقهوة المفلترة.",
      en: "iperEspresso capsules fit illy machines supporting that system. They differ from illy Nespresso-compatible capsules and iper brewed-coffee capsules.",
    },
    examples: {
      ar: "كلاسيكو، كلاسيكو لونغو، كلاسيكو منزوع الكافيين",
      en: "Classico, Classico Lungo, Classico Decaf",
    },
    shop: "https://www.illy.com/en-us/eshop/coffee/iperespresso-espresso-capsules/iperespresso-coffee-capsules-classico-lungo-medium-roast/8845ST",
    region: {
      ar: "متجر الولايات المتحدة؛ تحقق من التوصيل أو الموزع المحلي",
      en: "US store; check delivery or a local distributor",
    },
    source:
      "https://www.illy.com/content/dam/product/machines/home/illy/ipso/y5-milk-e%26c/manual/Y5_Milk_manual.pdf",
  },
];
