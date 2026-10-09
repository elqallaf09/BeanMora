/** Official manufacturer catalogs reviewed 2026-10-09. No live price/stock claims. */
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
  {
    id: "zill",
    name: { ar: "Zill — كبسولات القهوة العربية", en: "Zill Arabic coffee" },
    description: {
      ar: "كبسولات Zill مخصصة لجهاز Zill للقهوة العربية. يذكر المصنع ١٠–١٢ فنجالًا للكبسولة. لا تُستبدل بكبسولات نسبريسو. تحتوي الخلطات المدرجة مشتقات الحليب.",
      en: "Zill capsules are made for the Zill Arabic-coffee machine. The manufacturer states 10–12 finjals per capsule. They cannot be replaced with Nespresso capsules. The listed blends contain milk derivatives.",
    },
    examples: {
      ar: "شقراء، أوريجينال، غمجة، كينيا",
      en: "Shagra, Original, Ghamjah, Kenya",
    },
    shop: "https://www.zillcoffee.com/collections/all",
    region: {
      ar: "المتجر الرسمي؛ اختر بلد التوصيل",
      en: "Official store; select delivery country",
    },
    source:
      "https://www.zillcoffee.com/products/zill-coffee-capsules-original-flavour",
  },
];

export type CapsuleProduct = {
  id: string;
  system: string;
  name: { ar: string; en: string };
  source: string;
  detail?: { ar: string; en: string };
  image?: string;
};
/** Reviewed product names; no inferred caffeine, intensity, stock or compatibility. */
export const capsuleProducts: CapsuleProduct[] = [
  {
    id: "nespresso-original-pumpkin-spice-cake",
    system: "nespresso-original",
    name: {
      ar: "كيك اليقطين والتوابل",
      en: "Pumpkin Spice Cake",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-maple-pecan",
    system: "nespresso-original",
    name: {
      ar: "قيقب وبيكان",
      en: "Maple Pecan",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-freddo-intenso",
    system: "nespresso-original",
    name: {
      ar: "فريدو إنتنسو",
      en: "Freddo Intenso",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-yuzu-vanilla-over-ice",
    system: "nespresso-original",
    name: {
      ar: "يوزو فانيلا مع الثلج",
      en: "Yuzu Vanilla Over Ice",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-firenze-arpeggio-decaffeinato",
    system: "nespresso-original",
    name: {
      ar: "فيرينزي أربيجيو منزوع الكافيين",
      en: "Firenze Arpeggio Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-arpeggio-extra",
    system: "nespresso-original",
    name: {
      ar: "أربيجيو إكسترا",
      en: "Arpeggio Extra",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-venezia",
    system: "nespresso-original",
    name: {
      ar: "فينيتسيا",
      en: "Venezia",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-napoli",
    system: "nespresso-original",
    name: {
      ar: "نابولي",
      en: "Napoli",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-palermo-kazaar",
    system: "nespresso-original",
    name: {
      ar: "باليرمو كازار",
      en: "Palermo Kazaar",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-ristretto-italiano",
    system: "nespresso-original",
    name: {
      ar: "ريستريتو إيتاليانو",
      en: "Ristretto Italiano",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-ristretto-italiano-decaffeinato",
    system: "nespresso-original",
    name: {
      ar: "ريستريتو إيتاليانو منزوع الكافيين",
      en: "Ristretto Italiano Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-firenze-arpeggio",
    system: "nespresso-original",
    name: {
      ar: "فيرينزي أربيجيو",
      en: "Firenze Arpeggio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-ispirazione-roma",
    system: "nespresso-original",
    name: {
      ar: "إسبيراتسيوني روما",
      en: "Ispirazione Roma",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-genova-livanto",
    system: "nespresso-original",
    name: {
      ar: "جينوفا ليفانتو",
      en: "Genova Livanto",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-vaniglia-decaffeinato",
    system: "nespresso-original",
    name: {
      ar: "فانيليا منزوع الكافيين",
      en: "Vaniglia Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-nocciola",
    system: "nespresso-original",
    name: {
      ar: "نوتشولا — بندق",
      en: "Nocciola",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-caramello",
    system: "nespresso-original",
    name: {
      ar: "كاراميلو — كراميل",
      en: "Caramello",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-cioccolatino",
    system: "nespresso-original",
    name: {
      ar: "تشوكولاتينو — شوكولاتة",
      en: "Cioccolatino",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-scuro",
    system: "nespresso-original",
    name: {
      ar: "سكورو",
      en: "Scuro",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-vaniglia",
    system: "nespresso-original",
    name: {
      ar: "فانيليا",
      en: "Vaniglia",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-colombia",
    system: "nespresso-original",
    name: {
      ar: "كولومبيا",
      en: "Colombia",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-india",
    system: "nespresso-original",
    name: {
      ar: "الهند",
      en: "India",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-cosi",
    system: "nespresso-original",
    name: {
      ar: "كوزي",
      en: "Cosi",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-volluto-decaffeinato",
    system: "nespresso-original",
    name: {
      ar: "فولوتو منزوع الكافيين",
      en: "Volluto Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-volluto",
    system: "nespresso-original",
    name: {
      ar: "فولوتو",
      en: "Volluto",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-capriccio",
    system: "nespresso-original",
    name: {
      ar: "كابريتشيو",
      en: "Capriccio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-vienna-linizio-lungo",
    system: "nespresso-original",
    name: {
      ar: "فيينا لينيتسيو لونغو",
      en: "Vienna Linizio Lungo",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-buenos-aires-lungo",
    system: "nespresso-original",
    name: {
      ar: "بوينس آيرس لونغو",
      en: "Buenos Aires Lungo",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-stockholm-fortissio-lungo",
    system: "nespresso-original",
    name: {
      ar: "ستوكهولم فورتيسيو لونغو",
      en: "Stockholm Fortissio Lungo",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-tokyo-vivalto-lungo",
    system: "nespresso-original",
    name: {
      ar: "طوكيو فيفالتو لونغو",
      en: "Tokyo Vivalto Lungo",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-original-cape-town-envivo-lungo",
    system: "nespresso-original",
    name: {
      ar: "كيب تاون إنفيفو لونغو",
      en: "Cape Town Envivo Lungo",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/original",
  },
  {
    id: "nespresso-vertuo-cinnamon-apple-crisp",
    system: "nespresso-vertuo",
    name: {
      ar: "تفاح وقرفة",
      en: "Cinnamon Apple Crisp",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-samra-togetherness-blend",
    system: "nespresso-vertuo",
    name: {
      ar: "خلطة سمرة",
      en: "Samra Togetherness Blend",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-pumpkin-spice-cake",
    system: "nespresso-vertuo",
    name: {
      ar: "كيك اليقطين والتوابل",
      en: "Pumpkin Spice Cake",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-ristretto-intenso",
    system: "nespresso-vertuo",
    name: {
      ar: "ريستريتو إنتنسو",
      en: "Ristretto Intenso",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-ristretto-classico",
    system: "nespresso-vertuo",
    name: {
      ar: "ريستريتو كلاسيكو",
      en: "Ristretto Classico",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-sweet-vanilla-decaffeinato",
    system: "nespresso-vertuo",
    name: {
      ar: "فانيلا حلوة منزوع الكافيين",
      en: "Sweet Vanilla Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-rich-chocolate",
    system: "nespresso-vertuo",
    name: {
      ar: "شوكولاتة غنية",
      en: "Rich Chocolate",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-bianco-doppio",
    system: "nespresso-vertuo",
    name: {
      ar: "بيانكو دوبيو",
      en: "Bianco Doppio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-roasted-hazelnut",
    system: "nespresso-vertuo",
    name: {
      ar: "بندق محمص",
      en: "Roasted Hazelnut",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-golden-caramel",
    system: "nespresso-vertuo",
    name: {
      ar: "كراميل ذهبي",
      en: "Golden Caramel",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-el-salvador",
    system: "nespresso-vertuo",
    name: {
      ar: "السلفادور",
      en: "El Salvador",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-ethiopia",
    system: "nespresso-vertuo",
    name: {
      ar: "إثيوبيا",
      en: "Ethiopia",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-mexico",
    system: "nespresso-vertuo",
    name: {
      ar: "المكسيك",
      en: "Mexico",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-costa-rica",
    system: "nespresso-vertuo",
    name: {
      ar: "كوستاريكا",
      en: "Costa Rica",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-colombia",
    system: "nespresso-vertuo",
    name: {
      ar: "كولومبيا",
      en: "Colombia",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-melozio-decaffeinato",
    system: "nespresso-vertuo",
    name: {
      ar: "ميلوزيو منزوع الكافيين",
      en: "Melozio Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-melozio",
    system: "nespresso-vertuo",
    name: {
      ar: "ميلوزيو",
      en: "Melozio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-odacio",
    system: "nespresso-vertuo",
    name: {
      ar: "أوداشيو",
      en: "Odacio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-stormio",
    system: "nespresso-vertuo",
    name: {
      ar: "ستورميو",
      en: "Stormio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-intenso",
    system: "nespresso-vertuo",
    name: {
      ar: "إنتنسو",
      en: "Intenso",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-solelio",
    system: "nespresso-vertuo",
    name: {
      ar: "سوليليو",
      en: "Solelio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-half-caffeinato",
    system: "nespresso-vertuo",
    name: {
      ar: "هاف كافيناتو — نصف كافيين",
      en: "Half Caffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-double-espresso-chiaro-decaffeinato",
    system: "nespresso-vertuo",
    name: {
      ar: "دبل إسبريسو كيارو منزوع الكافيين",
      en: "Double Espresso Chiaro Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-double-espresso-dolce",
    system: "nespresso-vertuo",
    name: {
      ar: "دبل إسبريسو دولتشي",
      en: "Double Espresso Dolce",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-double-espresso-scuro",
    system: "nespresso-vertuo",
    name: {
      ar: "دبل إسبريسو سكورو",
      en: "Double Espresso Scuro",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-double-espresso-chiaro",
    system: "nespresso-vertuo",
    name: {
      ar: "دبل إسبريسو كيارو",
      en: "Double Espresso Chiaro",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-inizio",
    system: "nespresso-vertuo",
    name: {
      ar: "إينيتسيو",
      en: "Inizio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-fortado-decaffeinato",
    system: "nespresso-vertuo",
    name: {
      ar: "فورتادو منزوع الكافيين",
      en: "Fortado Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-fortado",
    system: "nespresso-vertuo",
    name: {
      ar: "فورتادو",
      en: "Fortado",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-arondio",
    system: "nespresso-vertuo",
    name: {
      ar: "أرونديو",
      en: "Arondio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-altissio-decaffeinato",
    system: "nespresso-vertuo",
    name: {
      ar: "ألتيسيو منزوع الكافيين",
      en: "Altissio Decaffeinato",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-orafio",
    system: "nespresso-vertuo",
    name: {
      ar: "أورافيو",
      en: "Orafio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-diavolitto",
    system: "nespresso-vertuo",
    name: {
      ar: "ديافوليتو",
      en: "Diavolitto",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-il-caffe",
    system: "nespresso-vertuo",
    name: {
      ar: "إل كافي",
      en: "Il Caffe",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-altissio",
    system: "nespresso-vertuo",
    name: {
      ar: "ألتيسيو",
      en: "Altissio",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "nespresso-vertuo-voltesso",
    system: "nespresso-vertuo",
    name: {
      ar: "فولتيسو",
      en: "Voltesso",
    },
    source: "https://www.nespresso.com/kw/en/coffee-capsules/vertuo",
  },
  {
    id: "dolce-gusto-caf-au-lait-intenso",
    system: "dolce-gusto",
    name: {
      ar: "كافيه أوليه إنتنسو",
      en: "Café au Lait Intenso",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/cafe-au-lait-intenso-capsules-nescafe-dolce-gusto",
  },
  {
    id: "dolce-gusto-caf-au-lait",
    system: "dolce-gusto",
    name: {
      ar: "كافيه أوليه",
      en: "Café au Lait",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/cafe-au-lait-capsules",
  },
  {
    id: "dolce-gusto-americano",
    system: "dolce-gusto",
    name: {
      ar: "أمريكانو",
      en: "Americano",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/americano-2",
  },
  {
    id: "dolce-gusto-grande-intenso",
    system: "dolce-gusto",
    name: {
      ar: "غراندي إنتنسو",
      en: "Grande Intenso",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/grande-intenso",
  },
  {
    id: "dolce-gusto-cortado",
    system: "dolce-gusto",
    name: {
      ar: "كورتادو",
      en: "Cortado",
    },
    source: "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/cortado-1",
  },
  {
    id: "dolce-gusto-espresso",
    system: "dolce-gusto",
    name: {
      ar: "إسبريسو",
      en: "Espresso",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/espresso-x16",
  },
  {
    id: "dolce-gusto-espresso-decaf",
    system: "dolce-gusto",
    name: {
      ar: "إسبريسو منزوع الكافيين",
      en: "Espresso Decaf",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/espresso-decaf-blue",
  },
  {
    id: "dolce-gusto-espresso-napoli",
    system: "dolce-gusto",
    name: {
      ar: "إسبريسو نابولي",
      en: "Espresso Napoli",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/espresso-napoli",
  },
  {
    id: "dolce-gusto-espresso-roma",
    system: "dolce-gusto",
    name: {
      ar: "إسبريسو روما",
      en: "Espresso Roma",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/espresso-roma",
  },
  {
    id: "dolce-gusto-cappuccino-skinny",
    system: "dolce-gusto",
    name: {
      ar: "كابتشينو سكيني",
      en: "Cappuccino Skinny",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/cappuccino-skinny",
  },
  {
    id: "dolce-gusto-espresso-intenso",
    system: "dolce-gusto",
    name: {
      ar: "إسبريسو إنتنسو",
      en: "Espresso Intenso",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/espresso-intenso-capsules-2",
  },
  {
    id: "dolce-gusto-cappuccino",
    system: "dolce-gusto",
    name: {
      ar: "كابتشينو",
      en: "Cappuccino",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/cappuccino",
  },
  {
    id: "dolce-gusto-chococino",
    system: "dolce-gusto",
    name: {
      ar: "تشوكوتشينو",
      en: "Chococino",
    },
    source: "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/chococino",
  },
  {
    id: "dolce-gusto-flat-white",
    system: "dolce-gusto",
    name: {
      ar: "فلات وايت",
      en: "Flat White",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/flat-white-pod1",
  },
  {
    id: "dolce-gusto-nesquik",
    system: "dolce-gusto",
    name: {
      ar: "نسكويك",
      en: "Nesquik",
    },
    source: "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/nesquik",
  },
  {
    id: "dolce-gusto-caramel-latte-macchiato",
    system: "dolce-gusto",
    name: {
      ar: "لاتيه ماكياتو كراميل",
      en: "Caramel Latte Macchiato",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/latte-macchiato-caramel",
  },
  {
    id: "dolce-gusto-starbucks-blonde-espresso-roast",
    system: "dolce-gusto",
    name: {
      ar: "ستاربكس بلوند إسبريسو",
      en: "STARBUCKS ® BLonde Espresso Roast",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/starbucks-blonde-espresso-roast-12-capsulas",
  },
  {
    id: "dolce-gusto-starbucks-americano-veranda-blend",
    system: "dolce-gusto",
    name: {
      ar: "ستاربكس أمريكانو فيراندا",
      en: "STARBUCKS ® Americano Veranda Blend",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/starbucks-americano-veranda-blend-pods",
  },
  {
    id: "dolce-gusto-starbucks-americano-house-blend",
    system: "dolce-gusto",
    name: {
      ar: "ستاربكس أمريكانو هاوس",
      en: "STARBUCKS ® Americano House Blend",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/americano-house-blend",
  },
  {
    id: "dolce-gusto-starbucks-espresso-roast",
    system: "dolce-gusto",
    name: {
      ar: "ستاربكس إسبريسو روست",
      en: "STARBUCKS ® Espresso Roast",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/starbucks-espresso-roast",
  },
  {
    id: "dolce-gusto-starbucks-cappuccino",
    system: "dolce-gusto",
    name: {
      ar: "ستاربكس كابتشينو",
      en: "STARBUCKS ® Cappuccino",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/starbucks-cappuccino",
  },
  {
    id: "dolce-gusto-starbucks-caramel-macchiato",
    system: "dolce-gusto",
    name: {
      ar: "ستاربكس كراميل ماكياتو",
      en: "STARBUCKS ® Caramel Macchiato",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/starbucks-caramel-macchiato",
  },
  {
    id: "dolce-gusto-starbucks-caff-latte",
    system: "dolce-gusto",
    name: {
      ar: "ستاربكس كافيه لاتيه",
      en: "STARBUCKS ® Caffè Latte",
    },
    source:
      "https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks/starbucks-caffe-latte",
  },
  {
    id: "lavazza-a-modo-mio-intenso",
    system: "lavazza-a-modo-mio",
    name: {
      ar: "إنتنسو",
      en: "Intenso",
    },
    source: "https://www.lavazza.com/en/coffee-capsules-pods/a-modo-mio",
  },
  {
    id: "lavazza-a-modo-mio-divino",
    system: "lavazza-a-modo-mio",
    name: {
      ar: "ديفينو",
      en: "Divino",
    },
    source: "https://www.lavazza.com/en/coffee-capsules-pods/a-modo-mio",
  },
  {
    id: "lavazza-a-modo-mio-passionale",
    system: "lavazza-a-modo-mio",
    name: {
      ar: "باسيونالي",
      en: "Passionale",
    },
    source: "https://www.lavazza.com/en/coffee-capsules-pods/a-modo-mio",
  },
  {
    id: "lavazza-a-modo-mio-qualit-rossa",
    system: "lavazza-a-modo-mio",
    name: {
      ar: "كواليتا روسا",
      en: "Qualità Rossa",
    },
    source: "https://www.lavazza.com/en/coffee-capsules-pods/a-modo-mio",
  },
  {
    id: "illy-iperespresso-classico",
    system: "illy-iperespresso",
    name: {
      ar: "كلاسيكو",
      en: "Classico",
    },
    source:
      "https://www.illy.com/en-us/eshop/coffee/iperespresso-espresso-capsules/",
  },
  {
    id: "illy-iperespresso-classico-lungo",
    system: "illy-iperespresso",
    name: {
      ar: "كلاسيكو لونغو",
      en: "Classico Lungo",
    },
    source:
      "https://www.illy.com/en-us/eshop/coffee/iperespresso-espresso-capsules/",
  },
  {
    id: "illy-iperespresso-classico-decaf",
    system: "illy-iperespresso",
    name: {
      ar: "كلاسيكو منزوع الكافيين",
      en: "Classico Decaf",
    },
    source:
      "https://www.illy.com/en-us/eshop/coffee/iperespresso-espresso-capsules/",
  },
  {
    id: "zill-kenya-zill-capsules",
    system: "zill",
    name: {
      ar: "كينيا",
      en: "Kenya Zill Capsules",
    },
    source: "https://www.zillcoffee.com/products/kenya-zill-capsules",
    detail: {
      ar: "حمصة متوسط · ٦ كبسولات · ١٠–١٢ فنجالًا للكبسولة. لجهاز Zill فقط. يحتوي مشتقات الحليب.",
      en: "Medium roast · 6 capsules · 10–12 finjals per capsule. Zill machines only. Contains milk derivatives.",
    },
    image:
      "https://cdn.shopify.com/s/files/1/0275/3537/6495/files/ChatGPTImageSep10_2026_02_04_29PM.png?v=1790071825",
  },
  {
    id: "zill-shagra-zill-capsules",
    system: "zill",
    name: {
      ar: "شقراء",
      en: "Shagra Zill Capsules",
    },
    source: "https://www.zillcoffee.com/products/shagra-zill-capsules",
    detail: {
      ar: "حمصة فاتح · ٦ كبسولات · ١٠–١٢ فنجالًا للكبسولة. لجهاز Zill فقط. يحتوي مشتقات الحليب.",
      en: "Light roast · 6 capsules · 10–12 finjals per capsule. Zill machines only. Contains milk derivatives.",
    },
    image:
      "https://cdn.shopify.com/s/files/1/0275/3537/6495/files/Zill-21.jpg?v=1696430634",
  },
  {
    id: "zill-ghamjah-zill-capsules",
    system: "zill",
    name: {
      ar: "غمجة",
      en: "Ghamjah Zill Capsules",
    },
    source: "https://www.zillcoffee.com/products/zill-capsules-saffron",
    detail: {
      ar: "حمصة داكن · ٦ كبسولات · ١٠–١٢ فنجالًا للكبسولة. لجهاز Zill فقط. يحتوي مشتقات الحليب.",
      en: "Dark roast · 6 capsules · 10–12 finjals per capsule. Zill machines only. Contains milk derivatives.",
    },
    image:
      "https://cdn.shopify.com/s/files/1/0275/3537/6495/files/Zill-19.jpg?v=1696430578",
  },
  {
    id: "zill-original-zill-capsules",
    system: "zill",
    name: {
      ar: "أوريجينال",
      en: "Original Zill Capsules",
    },
    source:
      "https://www.zillcoffee.com/products/zill-coffee-capsules-original-flavour",
    detail: {
      ar: "حمصة متوسط · ٦ كبسولات · ١٠–١٢ فنجالًا للكبسولة. لجهاز Zill فقط. يحتوي مشتقات الحليب.",
      en: "Medium roast · 6 capsules · 10–12 finjals per capsule. Zill machines only. Contains milk derivatives.",
    },
    image:
      "https://cdn.shopify.com/s/files/1/0275/3537/6495/files/Zill-20.jpg?v=1696430611",
  },
];
