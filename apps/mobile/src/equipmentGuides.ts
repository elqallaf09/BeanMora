import { equipmentKind, type EquipmentItem } from "./catalog";

export interface EquipmentGuide {
  intro: string;
  pros: string[];
  cons: string[];
  care: string;
}
// Practical category guidance. Exact model facts and attribution remain in its catalog source.
const guides: Record<string, [EquipmentGuide, EquipmentGuide]> = {
  v60_dripper: [
    {
      intro: "قطّارة مخروطية تمنحك تحكماً مباشراً في الطحن والصب ومذاق الكوب.",
      pros: [
        "مرونة في الجرعة والنسبة وطريقة الصب.",
        "مناسبة لتعلّم أثر تغيير الطحن وحرارة الماء.",
      ],
      cons: [
        "ثبات النتيجة يحتاج تكرار طريقة الصب.",
        "تحتاج فلاتر مناسبة وماءً وميزاناً للتحضير بدقة.",
      ],
      care: "اشطف الفلتر قبل التحضير، واستخدم حجم الفلتر المطابق للقطّارة. اتبع تعليمات تنظيف مادة هذا الموديل.",
    },
    {
      intro:
        "A conical dripper with direct control over grind, pouring and the cup.",
      pros: [
        "Flexible dose, ratio and pouring technique.",
        "Explore the effects of grind and water temperature.",
      ],
      cons: [
        "Consistency depends on repeating your pouring technique.",
        "Suitable filters and a scale help you brew accurately.",
      ],
      care: "Rinse the filter and use the size intended for the dripper. Follow the cleaning instructions for its material.",
    },
  ],
  chemex: [
    {
      intro:
        "تحضير بالترشيح في وعاء تقديم واحد؛ يناسب مشاركة أكثر من كوب حسب حجم الموديل.",
      pros: [
        "التحضير والتقديم في الوعاء نفسه.",
        "سهولة متابعة الصب وكمية القهوة.",
      ],
      cons: [
        "تحتاج فلاتر Chemex المناسبة.",
        "الزجاج يحتاج عناية، والطحن يؤثر في سرعة التصريف.",
      ],
      care: "ضع الفلتر وفق تعليمات المصنع، وحافظ على ممر الهواء. تعامل برفق مع الزجاج وأزل الملحقات حسب تعليمات التنظيف.",
    },
    {
      intro:
        "Filter brewing and serving in one vessel, with capacity depending on the model.",
      pros: [
        "Brew and serve in the same vessel.",
        "Watch pouring and the amount of brewed coffee.",
      ],
      cons: [
        "Requires the appropriate Chemex filters.",
        "Glass needs care; grind affects drawdown.",
      ],
      care: "Place the filter as instructed and keep the air channel clear. Handle glass gently and remove accessories as directed before cleaning.",
    },
  ],
  aeropress: [
    {
      intro:
        "تحضير بالنقع والضغط اليدوي، مع وصفات متنوعة للكوب المركز أو المخفف.",
      pros: [
        "إمكانية تعديل النسبة ومدة النقع.",
        "تحضير يدوي دون ماكينة إسبريسو.",
      ],
      cons: [
        "سعة التحضير تعتمد على الموديل.",
        "التخفيف والفلاتر وطريقة الضغط تغيّر النتيجة.",
      ],
      care: "ركّب الغطاء بإحكام واضغط برفق على وعاء ثابت. اتبع الطريقة القياسية وتعليمات المصنع للتعامل مع الماء الساخن.",
    },
    {
      intro:
        "Immersion and hand pressing, with recipes for concentrated or diluted coffee.",
      pros: [
        "Adjust the ratio and steeping time.",
        "Hand brewing without an espresso machine.",
      ],
      cons: [
        "Brew capacity depends on the model.",
        "Dilution, filters and pressing technique affect the result.",
      ],
      care: "Secure the cap and press gently into a stable vessel. Follow the standard method and manufacturer hot-water instructions.",
    },
  ],
  french_press: [
    {
      intro: "تحضير بالنقع مع فلتر معدني، لمن يفضّل كوباً ممتلئاً.",
      pros: [
        "طريقة صب بسيطة دون صبات متتابعة.",
        "تغيير مدة النقع والنسبة بسهولة.",
      ],
      cons: [
        "قد تبقى رواسب دقيقة في الكوب.",
        "ترك القهوة في الوعاء بعد التحضير يؤثر في الطعم.",
      ],
      care: "اضغط برفق وقدّم القهوة بعد انتهاء النقع. فك الفلتر ونظفه وفق تعليمات الموديل.",
    },
    {
      intro: "Immersion brewing with a metal filter for a full-bodied cup.",
      pros: [
        "Simple pouring without several separate pours.",
        "Easy adjustments to steeping time and ratio.",
      ],
      cons: [
        "Fine sediment can remain in the cup.",
        "Leaving brewed coffee in the vessel affects taste.",
      ],
      care: "Press gently and serve when steeping finishes. Disassemble and clean the filter as the model instructions specify.",
    },
  ],
  kettle: [
    {
      intro: "الغلاية تساعدك على ضبط الماء وطريقة الصب في وصفات الترشيح.",
      pros: [
        "التحكم في الصب حسب شكل الفوهة.",
        "الموديلات التي تدعم ضبط الحرارة تساعد على تكرار الإعداد.",
      ],
      cons: [
        "ضبط الحرارة غير متوفر في كل غلاية.",
        "سعة الماء ومصدر الطاقة يختلفان بين الموديلات.",
      ],
      care: "التزم بحدّي الماء الأدنى والأقصى، وأزل الترسّبات بالطريقة الموصى بها. لا تغمر قاعدة الغلاية الكهربائية بالماء.",
    },
    {
      intro: "A kettle helps control water and pouring for filter recipes.",
      pros: [
        "Pour control depends on spout design.",
        "Temperature-control models help repeat a setting.",
      ],
      cons: [
        "Not every kettle has temperature control.",
        "Capacity and power source vary by model.",
      ],
      care: "Respect minimum and maximum fill levels and descale as directed. Do not immerse an electric kettle base.",
    },
  ],
  manual_espresso: [
    {
      intro: "إسبريسو بالضغط اليدوي؛ أنت تتحكم في حركة الرافعة والتحضير.",
      pros: [
        "تفاعل مباشر مع الاستخلاص.",
        "إمكانية تجربة الطحن والجرعة وطريقة الضغط.",
      ],
      cons: [
        "الطحن والتوزيع والتسخين تؤثر بقوة في النتيجة.",
        "عدد الأجزاء وطريقة التسخين تختلف حسب الموديل.",
      ],
      care: "راجع حدود الضغط والجرعة وتعليمات التسخين لهذا الموديل. اترك الأجزاء الساخنة تبرد قبل الفك.",
    },
    {
      intro:
        "Hand-pressure espresso with direct involvement in lever movement and preparation.",
      pros: [
        "Direct interaction with extraction.",
        "Experiment with grind, dose and pressure technique.",
      ],
      cons: [
        "Grind, distribution and heating strongly affect the result.",
        "Parts and heating requirements vary by model.",
      ],
      care: "Check the model’s pressure, dose and heating instructions. Let hot parts cool before disassembly.",
    },
  ],
  espresso_machine: [
    {
      intro:
        "ماكينة لإعداد الإسبريسو؛ جودة الطحن وتحضير البن جزء أساسي من النتيجة.",
      pros: [
        "إعداد كوب مركز مع إمكانية تكرار الوصفة.",
        "إمكانات إضافية مثل البخار بحسب تجهيز الموديل.",
      ],
      cons: [
        "تحتاج ضبط الطحن والجرعة والتنظيف المنتظم.",
        "زمن التسخين وحجم الخزان والبخار تختلف حسب الموديل.",
      ],
      care: "اتبع دليل الموديل لتنظيف مجموعة التحضير والماء المناسب وإزالة الترسّبات. لا تنفذ تنظيفاً عكسياً إلا إذا سمح المصنع به.",
    },
    {
      intro:
        "An espresso machine; grinding and coffee preparation remain central to the result.",
      pros: [
        "Concentrated coffee with repeatable recipes.",
        "Features such as steaming depend on the model.",
      ],
      cons: [
        "Requires grind and dose adjustment and regular cleaning.",
        "Heating time, tank capacity and steam performance vary.",
      ],
      care: "Follow the model’s group-cleaning, water and descaling instructions. Backflush only if the manufacturer permits it.",
    },
  ],
  kalita_wave: [
    {
      intro:
        "قطّارة بقاعدة مسطحة وفلاتر Wave، مع وصفات يمكن تعديلها حسب حجم الأداة.",
      pros: [
        "متابعة الصبات ومدة التصريف بسهولة.",
        "تجربة الجرعة والنسبة والطحن.",
      ],
      cons: [
        "تحتاج حجم فلتر Wave المناسب.",
        "مادة الموديل وفتحات التصريف تؤثر في طريقة التحضير.",
      ],
      care: "حافظ على شكل الفلتر وعدم انسداد فتحات التصريف. راجع مقاس الفلتر وتعليمات تنظيف الموديل.",
    },
    {
      intro:
        "A flat-bottom dripper using Wave filters, with recipes adapted to its size.",
      pros: [
        "Observe pours and drawdown.",
        "Experiment with dose, ratio and grind.",
      ],
      cons: [
        "Needs the correct Wave filter size.",
        "Model material and drain holes affect brewing.",
      ],
      care: "Keep the filter shape and drain holes clear. Check the correct filter size and model cleaning instructions.",
    },
  ],
  origami: [
    {
      intro:
        "قطّارة ذات أضلاع واضحة؛ اختيار الفلتر والحامل جزء من إعداد التحضير.",
      pros: [
        "يمكن تعديل الوصفة مع الفلتر المناسب.",
        "متابعة الصب والتصريف مباشرة.",
      ],
      cons: [
        "توافق الفلاتر يعتمد على حجم الموديل.",
        "تحتاج حاملاً مناسباً وثابتاً فوق الوعاء.",
      ],
      care: "اختر الفلتر والحامل الموصى بهما لهذا المقاس. اتبع تعليمات العناية بمادة القطّارة.",
    },
    {
      intro:
        "A ribbed dripper whose filter and holder form part of the brewing setup.",
      pros: [
        "Adapt recipes with a suitable filter.",
        "Observe pouring and drawdown directly.",
      ],
      cons: [
        "Filter compatibility depends on model size.",
        "Needs a suitable stable holder over the vessel.",
      ],
      care: "Choose the recommended filter and holder for the size. Follow the dripper material’s care instructions.",
    },
  ],
};

export function categoryGuide(
  item: EquipmentItem,
  ar: boolean,
): EquipmentGuide | null {
  const kind = equipmentKind(item);
  const name = item.name.toLowerCase();
  const category = /kalita/.test(name)
    ? "kalita_wave"
    : /origami/.test(name)
      ? "origami"
      : /french/.test(name)
        ? "french_press"
        : /flair|nanopresso/.test(name)
          ? "manual_espresso"
          : kind;
  return guides[category]?.[ar ? 0 : 1] ?? null;
}
