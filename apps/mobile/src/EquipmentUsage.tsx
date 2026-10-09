import { useContext } from "react";
import { View } from "./native";
import type { EquipmentItem } from "./catalog";
import { equipmentKind } from "./catalog";
import { Disclosure } from "./Disclosure";
import { SourceLink } from "./SourceLink";
import { Language, Txt, styles } from "./ui";
type Steps = readonly (readonly [string, string])[];
const filter: Steps = [
  [
    "ثبّت القطّارة والفلتر المناسبين، واشطف الفلتر وسخّن الوعاء ثم تخلّص من ماء الشطف.",
    "Fit the correct dripper and filter, rinse and preheat, then discard rinse water.",
  ],
  [
    "زِن البن واطحنه حسب الوصفة، وضعه فوق الميزان وصفّر الوزن.",
    "Weigh and grind the coffee for your recipe, place the brewer on the scale and tare.",
  ],
  [
    "ابدأ المؤقت، نفّذ التزهير والصبات إلى الوزن الإجمالي في الوصفة.",
    "Start the timer and follow the recipe’s bloom and pours to its total water weight.",
  ],
  [
    "قارن وقت التصريف والطعم؛ غيّر متغيرًا واحدًا في المحاولة التالية.",
    "Compare drawdown and taste; change one variable in the next trial.",
  ],
];
const usage: Record<string, Steps> = {
  manual_espresso: [
    [
      "جهّز البن والسلة والماء الساخن؛ سخّن مجموعة التحضير بالطريقة الخاصة بموديلك.",
      "Prepare coffee, basket and hot water; preheat the brew group as directed for your model.",
    ],
    [
      "زِن الجرعة ووزّع الطحن الناعم واكبس بمقاس السلة الصحيح.",
      "Weigh the dose, distribute fine grounds and tamp with the correct basket size.",
    ],
    [
      "أضف الماء ضمن حد التعبئة، ثم استخدم الذراع أو المضخة اليدوية دون تجاوز ضغط دليل الجهاز. زِن الناتج وسجّل الوقت.",
      "Fill within the limit, then use the lever or hand pump without exceeding the manual’s pressure limits. Weigh output and record time.",
    ],
    [
      "فرّغ الضغط واترك الأجزاء تبرد قبل الفك. عدّل الطحن أو النسبة وتذوق المحاولة التالية.",
      "Release pressure and let parts cool before disassembly. Adjust grind or ratio and taste the next trial.",
    ],
  ],
  auto_drip: [
    [
      "ركّب الفلتر والسلة الصحيحين وحدد حجم الدفعة ضمن سعة الجهاز.",
      "Fit the correct filter and basket and choose a batch within machine capacity.",
    ],
    [
      "زِن البن والماء، واضبط الطحن والوصفة؛ في Aiden اختر ملف التحضير المناسب وحجم الدفعة.",
      "Weigh coffee and water and choose the grind and recipe; on Aiden select the brew profile and batch size.",
    ],
    [
      "ابدأ الدورة واتركها تكتمل؛ قارن الناتج والطعم قبل تعديل الطحن أو النسبة.",
      "Start and complete the cycle; compare yield and taste before changing grind or ratio.",
    ],
    [
      "أفرغ البن ونظّف السلة والوعاء وأزل الترسّبات حسب دليل الموديل.",
      "Discard grounds, clean basket and vessel and descale as the model manual directs.",
    ],
  ],
  capsule: [
    [
      "طابق نظام الكبسولة مع الماكينة، وجهّز خزان الماء والكوب حسب الدليل.",
      "Match the capsule system to the machine and prepare the water tank and cup as directed.",
    ],
    [
      "ثبّت كبسولة واحدة بالطريقة الصحيحة واختر حجم المشروب المدعوم.",
      "Fit one capsule correctly and select a supported drink size.",
    ],
    [
      "بعد الدورة أخرج الكبسولة ونظّف صينية التنقيط؛ اتبع دورة إزالة الترسّبات الخاصة بالموديل.",
      "After brewing eject the capsule and clean the drip tray; follow the model’s descaling cycle.",
    ],
  ],
  storage: [
    [
      "ضع بنًا جافًا بعيدًا عن الحرارة والضوء، واترك مساحة لإغلاق الغطاء.",
      "Store dry coffee away from heat and light with room to close the lid.",
    ],
    [
      "في Atmos لف الغطاء حتى يظهر مؤشر الفراغ كما يوضح الدليل؛ راجع المؤشر مع الاستخدام.",
      "On Atmos twist the lid until the vacuum indicator appears as directed; check the indicator during use.",
    ],
    [
      "سجّل تاريخ التحميص، وأخرج حاجتك ثم أغلق الوعاء؛ نظّف وجفّف قبل التعبئة.",
      "Record roast date, remove what you need and reseal; clean and dry before refilling.",
    ],
  ],
  milk: [
    [
      "اختر كمية حليب ضمن سعة الإبريق أو حدود جهاز الرغوة.",
      "Choose milk within pitcher capacity or frother fill limits.",
    ],
    [
      "للإبريق استخدم بخار جهازك لصنع قوام متجانس؛ لجهاز الرغوة اتبع برنامجه، ولا تضع إبريقًا غير مخصص على النار.",
      "With a pitcher use your machine’s steam for even texture; for a frother follow its program and never heat a non-stovetop pitcher on a hob.",
    ],
    [
      "صب بعد التجانس ثم نظّف بقايا الحليب فورًا وفق دليل الأداة.",
      "Pour once textured, then promptly clean milk residue as directed.",
    ],
  ],
  sifter: [
    [
      "ركّب الشبكات المطلوبة وثبّت المجموعة حسب دليل الأداة.",
      "Fit the required sieves and assemble as directed.",
    ],
    [
      "زِن عينة الطحن وانخل بلطف؛ قارن الأجزاء الناعمة والخشنة مع الاحتفاظ بعينة مرجعية.",
      "Weigh a sample and sift gently; compare fines and coarse fractions while retaining a reference sample.",
    ],
    [
      "زِن البن المستخدم بعد الغربلة، وسجّل الشبكات والناتج حتى تقارن التحضير بإنصاف.",
      "Weigh the coffee used after sifting and record sieves and retained yield for a fair brew comparison.",
    ],
  ],
  melodrip: [
    [
      "ثبّت أداة الصب فوق القطّارة دون ملامسة البن.",
      "Hold the dispersion tool above the dripper without touching the grounds.",
    ],
    [
      "صب بتدفق مناسب للوصفة عبر الأداة، وراقب وصول الماء وتوزيعه.",
      "Pour through the tool at the recipe’s flow rate and observe water distribution.",
    ],
    [
      "قارن الوقت والطعم مع نفس الجرعة والطحن، واشطف الأداة بعد الاستخدام.",
      "Compare time and taste with the same dose and grind and rinse after use.",
    ],
  ],
  wdt: [
    [
      "املأ السلة بجرعتك وثبّتها على سطح مستقر.",
      "Fill the basket with your dose and secure it on a stable surface.",
    ],
    [
      "حرّك الإبر برفق لتفكيك التكتلات وتوزيع البن دون خدش السلة أو ثني الإبر.",
      "Move needles gently to break clumps and distribute grounds without scratching the basket or bending needles.",
    ],
    [
      "سوِّ السطح واكبس، ثم نظّف الإبر وخزّنها بأمان.",
      "Level and tamp, then clean and store the needles safely.",
    ],
  ],
  funnel: [
    [
      "طابق قطر قمع الجرعة مع السلة وثبّته قبل الطحن.",
      "Match the dosing funnel diameter to the basket and fit before grinding.",
    ],
    [
      "أضف الجرعة ووزّع دون انسكاب، ثم انزع القمع قبل الكبس ما لم يسمح تصميمه بذلك.",
      "Add and distribute grounds without spilling, then remove the funnel before tamping unless its design permits it.",
    ],
    [
      "نظّف القمع ونقطة تثبيته بعد الاستخدام.",
      "Clean the funnel and its attachment surface after use.",
    ],
  ],
  shaker: [
    [
      "اطحن الجرعة داخل الوعاء، وثبّت الغطاء حسب تعليمات الأداة.",
      "Grind the dose into the vessel and fit its lid as directed.",
    ],
    [
      "اخلط بالطريقة المحددة، ثم أفرغ البن في السلة دون فقد الجرعة.",
      "Mix as directed, then release coffee into the basket without losing the dose.",
    ],
    [
      "سوِّ السطح واكبس، وسجّل الوقت والطعم مع تثبيت باقي المتغيرات.",
      "Level and tamp and record time and taste while keeping other variables fixed.",
    ],
  ],
  knock_box: [
    [
      "ضع صندوق التفريغ على سطح ثابت؛ لا تفرّغ المقبض على حافة صلبة.",
      "Place the knock box on a stable surface; avoid knocking the portafilter against a hard edge.",
    ],
    [
      "فرّغ قرص البن على القضيب المخصص دون ضرب السلة بعنف.",
      "Knock out the puck on the designated bar without striking the basket forcefully.",
    ],
    [
      "أفرغ الصندوق ونظّفه وجفّفه بانتظام.",
      "Empty, clean and dry the box regularly.",
    ],
  ],
  grinder: [
    [
      "حدّد موديل الطاحونة ونوع الشفرات ومعايرة الصفر من دليل المصنع.",
      "Identify the grinder, burrs and zero calibration from the manufacturer guide.",
    ],
    [
      "اختر نقطة بداية لنفس طريقة التحضير؛ رقم طاحونة ثانية لا ينتقل مباشرة.",
      "Choose a starting point for your brew method; another grinder’s number does not transfer directly.",
    ],
    [
      "زِن الجرعة، اضبط الطحن كما يسمح الدليل، ثم اطحن. لا تُجبر الشفرات على الإغلاق.",
      "Weigh the dose, adjust as the manual permits and grind. Do not force burrs shut.",
    ],
    [
      "سجّل الدرجة والموديل والحمصة والوقت والطعم. نظّف بالفرشاة وفق الدليل.",
      "Log the setting, model, roast, time and taste. Brush-clean as directed.",
    ],
  ],
  espresso_machine: [
    [
      "املأ بالماء المطابق لدليل الجهاز، وشغّل التسخين حتى تستقر مجموعة التحضير.",
      "Use water meeting the machine manual and heat until the brew group is ready.",
    ],
    [
      "زِن الجرعة في السلة المناسبة، وزّع الطحن واكبس بشكل مستوٍ.",
      "Weigh the dose for the basket, distribute the grounds and tamp level.",
    ],
    [
      "ضع الكوب على ميزان، ابدأ الاستخلاص وسجّل وزن المشروب والوقت.",
      "Place the cup on a scale, extract and record drink weight and time.",
    ],
    [
      "عدّل الطحن حسب الطعم والنسبة. نظّف المجموعة والبخار؛ التنظيف العكسي فقط للموديلات التي تسمح به.",
      "Dial in by taste and ratio. Clean the group and steam wand; backflush only when permitted for this model.",
    ],
  ],
  xbloom: [
    [
      "ركّب القطّارة المناسبة وافحص الخزان والميزان؛ اتبع دليل Original أو Studio الصحيح.",
      "Fit the correct dripper and check water and scale; use the correct Original or Studio guide.",
    ],
    [
      "اختر كبسولة xPod أو بنّك ووصفتك بالطريقة التي يدعمها الموديل.",
      "Choose an xPod or your own beans and recipe using the model’s supported workflow.",
    ],
    [
      "راجع الجرعة والطحن والحرارة والصبات قبل البدء. لا تنقل درجة Original إلى Studio تلقائيًا.",
      "Review dose, grind, temperature and pours before starting. Do not transfer Original settings to Studio automatically.",
    ],
    [
      "اترك الدورة تكتمل، قيّم الطعم ونظّف القطّارة ومسار البن وفق التعليمات.",
      "Let the cycle finish, taste and clean the dripper and coffee path as instructed.",
    ],
  ],
  aeropress: [
    [
      "ثبّت الفلتر والغطاء وتأكد من دعم الكوب للأداة.",
      "Fit the filter and cap and use a cup that supports the brewer.",
    ],
    [
      "أضف جرعة البن والماء حسب وصفة مناسبة لمقاس الأداة.",
      "Add coffee and water following a recipe for your brewer size.",
    ],
    [
      "حرّك واترك النقع حسب الوصفة، ثم اضغط برفق وببطء.",
      "Stir and steep as directed, then press gently and slowly.",
    ],
    [
      "أخرج قرص البن واشطف الأجزاء؛ لا تضع يدك تحت أداة ساخنة.",
      "Eject the puck and rinse the parts; keep hands away from the hot underside.",
    ],
  ],
  french_press: [
    [
      "سخّن الوعاء، وأضف البن والماء بالوزن حسب الوصفة.",
      "Preheat the vessel and add coffee and water by weight.",
    ],
    [
      "حرّك برفق واترك مدة النقع في الوصفة.",
      "Stir gently and steep for the recipe’s duration.",
    ],
    [
      "أنزل المكبس بهدوء دون قوة، ثم صب المشروب لتوقف استمرار النقع.",
      "Lower the plunger gently without force, then decant to end continued steeping.",
    ],
    [
      "فك شبكة الفلتر ونظّفها وفق دليل الموديل.",
      "Disassemble and clean the filter mesh as the manual directs.",
    ],
  ],
  moka_pot: [
    [
      "املأ القاعدة حتى أسفل صمام الأمان، وتأكد من سلامة الحشية والصمام.",
      "Fill below the safety valve and inspect the gasket and valve.",
    ],
    [
      "املأ السلة ببن مناسب دون كبس؛ لا تسد فتحة الصمام.",
      "Fill the basket with suitable grounds without tamping; keep the valve clear.",
    ],
    [
      "أغلق الأداة جيدًا واستخدم تسخينًا مناسبًا، ثم أوقفه عند نهاية التدفق.",
      "Close securely, use suitable heat and stop heating at the end of flow.",
    ],
    [
      "اتركها تبرد قبل الفتح؛ اغسل بحسب تعليمات مادتها.",
      "Let it cool before opening; wash as directed for its material.",
    ],
  ],
  scale: [
    [
      "ضع الميزان على سطح ثابت وجاف بعيدًا عن حرارة مباشرة.",
      "Place the scale on a stable dry surface away from direct heat.",
    ],
    [
      "اختر الغرام، ضع الوعاء وصفّر الوزن قبل الجرعة أو الصب.",
      "Select grams, place the vessel and tare before dosing or pouring.",
    ],
    [
      "استخدم المؤقت إذا كان الموديل يدعمه وسجّل وزن البن والماء أو المشروب.",
      "Use the timer if available and log coffee, water or drink weights.",
    ],
    [
      "المعايرة والتنظيف حسب الدليل؛ مقاومة الماء تختلف بين الموديلات.",
      "Calibrate and clean as directed; water resistance varies by model.",
    ],
  ],
  kettle: [
    [
      "املأ ضمن الحدين الأدنى والأقصى ودون تبليل القاعدة الكهربائية.",
      "Fill between the minimum and maximum without wetting the electrical base.",
    ],
    [
      "اضبط الحرارة إذا كان الموديل يدعمها، وانتظر جاهزية الماء.",
      "Set the temperature when supported and wait until ready.",
    ],
    [
      "صب فوق الميزان بتدفق مناسب للوصفة مع الانتباه للبخار.",
      "Pour over a scale at the recipe’s flow rate and avoid hot steam.",
    ],
    [
      "أزل الترسّبات وفق الدليل؛ لا تغمر القاعدة الكهربائية.",
      "Descale as directed and never immerse the electrical base.",
    ],
  ],
  filter: [
    [
      "اختَر الشكل والمقاس المناسبين للقطّارة؛ لا تسد مسار التصريف.",
      "Choose the correct shape and size without blocking drainage.",
    ],
    [
      "اشطف الفلتر وسخّن الوعاء إذا أوصت الوصفة، ثم أفرغ ماء الشطف.",
      "Rinse and preheat when recommended, then discard rinse water.",
    ],
    [
      "أضف البن واتبع الصبات؛ الورق والمعدن لهما تنظيف وعمر مختلفان.",
      "Add coffee and follow the pours; paper and metal have different cleaning and reuse rules.",
    ],
  ],
  portafilter_basket: [
    [
      "تأكد من توافق قطر السلة مع المقبض والجهاز.",
      "Check basket diameter compatibility with the portafilter and machine.",
    ],
    [
      "استخدم جرعة مناسبة لسعة السلة الفعلية دون ضغط البن على شاشة المجموعة.",
      "Use a dose suitable for the basket without pressing coffee against the group screen.",
    ],
    [
      "وزّع واكبس واستخرج فوق ميزان، ثم نظّف الثقوب وفق الدليل.",
      "Distribute, tamp and extract over a scale, then clean basket holes as directed.",
    ],
  ],
  distribution_tool: [
    [
      "اختَر مقاس الأداة المناسب للسلة.",
      "Choose the tool size that fits the basket.",
    ],
    [
      "وزّع البن بلطف قبل الكبس؛ عمق أداة التوزيع يعتمد على الجرعة.",
      "Distribute gently before tamping; distribution depth depends on dose.",
    ],
    [
      "اكبس بشكل مستوٍ دون طرق السلة، ونظّف الأداة بعد الاستخدام.",
      "Tamp level without striking the basket and clean the tool after use.",
    ],
  ],
  roaster: [
    [
      "راجع قدرة الدفعة والتهوية المسموح بها، وافحص مجمّع القشور.",
      "Check permitted batch size and ventilation and inspect the chaff collector.",
    ],
    [
      "اتبع تعليمات تسخين الموديل، وزِن البن الأخضر وسجّل وزن البداية.",
      "Follow model preheating instructions and weigh and record green coffee.",
    ],
    [
      "راقب اللون والرائحة وفرقعة البن وفق ملف تجريبي؛ حرارة أجهزة التحميص غير قابلة للنقل مباشرة.",
      "Track colour, aroma and cracks in a trial profile; roaster temperatures do not transfer directly.",
    ],
    [
      "برّد فور نهاية التحميص، وسجّل فقد الوزن والطعم بعد الراحة ونظّف بعد البرودة.",
      "Cool immediately, log weight loss and taste after rest, and clean once cool.",
    ],
  ],
  other: [
    [
      "تأكد من اسم الموديل والغرض منه قبل التركيب.",
      "Confirm the exact model and intended use before assembly.",
    ],
    [
      "راجع صفحة المصنع للأجزاء المتوافقة وحدود الاستخدام.",
      "Check the manufacturer page for compatible parts and operating limits.",
    ],
    [
      "استخدمه حسب كتيّبه وسجّل تأثيره على تحضيرك؛ نظّفه بعد الاستخدام بالطريقة المعتمدة.",
      "Use the model manual, record its effect on your brew and clean as instructed.",
    ],
  ],
};
const zill: Steps = [
  [
    "استخدم كبسولات Zill المخصّصة للجهاز؛ كبسولات نسبريسو أو البن السائب ليست بديلًا لها.",
    "Use capsules made for Zill; Nespresso capsules and loose beans are not substitutes.",
  ],
  [
    "جهّز الماء والوعاء وثبّت الكبسولة وفق كتيّب جهازك وحدود التعبئة.",
    "Prepare water and the vessel and fit the capsule following your model manual and fill limits.",
  ],
  [
    "شغّل دورة التحضير وفق تعليمات الجهاز. يذكر المصنع تحضيرًا خلال دقيقتين و10–12 فنجالًا للكبسولة.",
    "Start the cycle as instructed. The manufacturer states preparation within two minutes and 10–12 finjals per capsule.",
  ],
  [
    "اترك الأجزاء الساخنة تبرد ثم أزل الكبسولة ونظّف بحسب الكتيّب. الدلّة غير مشمولة بالجهاز.",
    "Let hot parts cool, remove the capsule and clean as directed. The dallah is not included with the machine.",
  ],
];
export function EquipmentUsage({ item }: { item: EquipmentItem }) {
  const ar = useContext(Language) === "ar";
  const original = item.originalName ?? item.name;
  const isZill = /zill|زِل|زيل|زل/i.test(original);
  const kind = /flair|nanopresso|picopresso/i.test(original)
    ? "manual_espresso"
    : /aiden|kbgv|kbts|moccamaster/i.test(original)
      ? "auto_drip"
      : /atmos/i.test(original)
        ? "storage"
        : /milk pitcher|nanofoamer/i.test(original)
          ? "milk"
          : /sifter/i.test(original)
            ? "sifter"
            : /melodrip/i.test(original)
              ? "melodrip"
              : /wdt/i.test(original)
                ? "wdt"
                : /funnel/i.test(original)
                  ? "funnel"
                  : /shaker/i.test(original)
                    ? "shaker"
                    : /knock box/i.test(original)
                      ? "knock_box"
                      : /bottomless portafilter/i.test(original)
                        ? "portafilter_basket"
                        : /april|orea/i.test(original)
                          ? "pour_over"
                          : /french press/i.test(original)
                            ? "french_press"
                            : /nespresso|vertuo|essenza|pixie|citi[sz]/i.test(
                                  original,
                                )
                              ? "capsule"
                              : /prismo/i.test(original)
                                ? "aeropress"
                                : equipmentKind(item);
  const steps = isZill
    ? zill
    : (usage[kind] ??
      ([
        "v60_dripper",
        "chemex",
        "kalita_dripper",
        "origami_dripper",
        "pour_over",
      ].includes(kind)
        ? filter
        : usage.other));
  return (
    <Disclosure
      title={ar ? "شلون تستخدمها؟" : "How to use it"}
      testID="equipment-how-to"
    >
      <Txt style={styles.muted}>
        {isZill
          ? ar
            ? "جهاز كبسولات للقهوة العربية من مشروع كويتي."
            : "An Arabic-coffee capsule machine from a Kuwaiti project."
          : ar
            ? "خطوات عملية لنوع الأداة؛ تعليمات الموديل هي المرجع للجرعة والتسخين والتنظيف."
            : "Practical steps for this type of equipment; the model manual governs dosing, heating and cleaning."}
      </Txt>
      {steps.map(([arabic, english], i) => (
        <View key={i} style={{ gap: 4 }}>
          <Txt>
            {i + 1}. {ar ? arabic : english}
          </Txt>
        </View>
      ))}
      {item.sourceUrl ? (
        <SourceLink
          title={ar ? "الموديل لدى المصنع" : "Model at the manufacturer"}
          url={item.sourceUrl}
        />
      ) : null}
      {kind === "capsule" ? (
        <SourceLink
          title={
            ar
              ? "فيديوهات نسبريسو — اختر موديلك"
              : "Nespresso videos — choose your model"
          }
          url="https://www.youtube.com/channel/UCdrsm2O-1i3zl5K0lVOEC2A/playlists?shelf_id=6&sort=dd&view=50"
        />
      ) : null}
      {/aiden/i.test(original) ? (
        <SourceLink
          title={
            ar ? "شرح Aiden والطحن بالفيديو" : "Aiden grind setup video guide"
          }
          url="https://help.fellowproducts.com/hc/en-us/articles/29101533994267-How-should-I-dial-in-my-grinder-when-brewing-with-Aiden-Getting-Started-With-Aiden-Pt-3"
        />
      ) : null}
      {original === "Baratza Encore ESP" ? (
        <SourceLink
          title={
            ar
              ? "دليل Encore ESP ودرجات البداية"
              : "Encore ESP manual and starting settings"
          }
          url="https://assets.breville.com/ZCG495/manual-encoreesp-v1-0-en-010923.pdf"
        />
      ) : null}
      {original === "Comandante C40 MK4" ? (
        <SourceLink
          title={
            ar ? "درجات C40 ومعايرة الصفر" : "C40 settings and zero calibration"
          }
          url="https://comandantegrinder.co.uk/pages/frequently-asked-questions"
        />
      ) : null}
    </Disclosure>
  );
}
