import type { Caveat, Reason, Method } from './core/engine';
import type { Outcome, SaveError } from './core/outcome';
export type Locale = 'ar' | 'en';
const en = {
  tagline: 'Your next good cup.', preview: 'Expo Go preview · Connected to your BeanMora data',
  beans: 'Coffee', recipes: 'Recipes', forYou: 'For you', account: 'Account',
  loading: 'Loading your coffee…', retry: 'Try again', refresh: 'Refresh', back: 'Back',
  search: 'Search loaded results', all: 'All methods', empty: 'No matching reviewed records.',
  partial: 'Some data could not be loaded. Missing information is not an empty catalog.',
  limited: 'Showing up to 200 recent records per source, not a complete catalog ranking.',
  matching: 'Why this fits', general: 'Explore this record; no personal match established yet.',
  ruleNote: 'Explainable matching, not an AI confidence score. Community evidence is not loaded in this mobile preview.',
  stockUnknown: 'Purchasable stock has not been verified.', verified: 'Last verification', unknown: 'Unknown',
  source: 'Open data source', sourceError: 'Could not open this source.',
  details: 'Coffee details', instructions: 'Recipe instructions', noSteps: 'No written steps recorded.',
  noNotes: 'No additional notes recorded.', dose: 'Coffee (g)', water: 'Water / output (g)', seconds: 'Actual time (seconds, optional)',
  amountNote: 'For espresso, record beverage output; for filter recipes, record brewing water. Review the source instructions.',
  record: 'Record my brew', outcome: 'How did it turn out?', modified: 'I changed the recipe', brewed: 'I actually brewed this cup',
  share: 'Share this attempt with the community (optional)', shareNote: 'Shares your account, recipe, outcome, modification status and recorded time. Off by default.',
  save: 'Save result', saving: 'Saving…', saved: 'Your brew was saved.', next: 'Back to recommendations',
  frozen: 'This request is kept unchanged for a safe retry. Do not submit a second cup while the result is uncertain.',
  loginFirst: 'Sign in with your existing BeanMora email and password to record outcomes.',
  email: 'Email', password: 'Password', login: 'Sign in', logout: 'Sign out', guest: 'Browsing without an account',
  existing: 'Use the same BeanMora account. Public browsing does not require sign-in.',
  authNote: 'Preview sessions stay in memory only: sign in again after closing or reloading. Google login, signup and push notifications are not included in this preview.',
  authError: 'Sign-in failed. Check your email/password, email confirmation and connection.',
  logoutError: 'Could not sign out. Try again.', show: 'Show password', hide: 'Hide password',
  profileNote: 'Recommendations use your saved web preferences, equipment, bean inventory and latest own brew results. These are not changed here.',
  setup: 'Connect BeanMora', setupNote: 'Run npm run setup inside apps/mobile, then restart Expo. Only the project URL and publishable/anon key are needed. Never use a service-role key.',
};
const ar: Record<keyof typeof en, string> = {
  tagline: 'كوبك القادم يبدأ هنا.', preview: 'نسخة Expo Go التجريبية · مرتبطة ببيانات BeanMora',
  beans: 'البن', recipes: 'الوصفات', forYou: 'لك أنت', account: 'حسابي',
  loading: 'جارٍ تحميل قهوتك…', retry: 'إعادة المحاولة', refresh: 'تحديث', back: 'رجوع',
  search: 'ابحث ضمن النتائج المحمّلة', all: 'كل طرق التحضير', empty: 'لا توجد سجلات مراجعة مطابقة.',
  partial: 'تعذّر تحميل بعض البيانات. نقص المعلومات لا يعني أن الدليل فارغ.',
  limited: 'يُعرض حتى 200 سجل حديث من كل مصدر؛ هذا ليس ترتيبًا للدليل كاملًا.',
  matching: 'لماذا يناسبك؟', general: 'اقتراح للاستكشاف؛ لم تُثبت مطابقة شخصية بعد.',
  ruleNote: 'مطابقة بقواعد واضحة، وليست نسبة ثقة ذكاء اصطناعي. أدلة المجتمع لا تُحمّل في نسخة الموبايل التجريبية.',
  stockUnknown: 'توفر هذا البن للشراء غير متحقق.', verified: 'آخر تحقق', unknown: 'غير معروف',
  source: 'فتح مصدر البيانات', sourceError: 'تعذّر فتح المصدر.',
  details: 'تفاصيل البن', instructions: 'خطوات الوصفة', noSteps: 'لم تُسجّل خطوات مكتوبة.',
  noNotes: 'لا توجد ملاحظات إضافية مسجلة.', dose: 'البن (غرام)', water: 'الماء / الناتج (غرام)', seconds: 'الوقت الفعلي بالثواني — اختياري',
  amountNote: 'للإسبريسو سجّل وزن المشروب الناتج، وللترشيح سجّل ماء التحضير. راجع تعليمات المصدر.',
  record: 'سجّل نتيجة تحضيري', outcome: 'شلون كانت النتيجة؟', modified: 'عدّلت على الوصفة', brewed: 'حضّرت هذا الكوب فعلًا',
  share: 'مشاركة المحاولة مع المجتمع — اختياري', shareNote: 'تُشارك هوية الحساب والوصفة والنتيجة وحالة التعديل والوقت المسجل. المشاركة مغلقة افتراضيًا.',
  save: 'حفظ النتيجة', saving: 'جارٍ الحفظ…', saved: 'تم حفظ تجربة التحضير.', next: 'العودة لاقتراحاتي',
  frozen: 'احتفظنا بنفس الطلب لإعادة المحاولة بأمان. لا تسجّل كوبًا ثانيًا ما دامت نتيجة الحفظ غير مؤكدة.',
  loginFirst: 'سجّل الدخول ببريد وكلمة مرور حسابك في BeanMora لحفظ التجربة.',
  email: 'البريد الإلكتروني', password: 'كلمة المرور', login: 'تسجيل الدخول', logout: 'تسجيل الخروج', guest: 'تصفح بدون حساب',
  existing: 'استخدم حساب BeanMora نفسه. تصفح الدليل العام لا يحتاج تسجيل دخول.',
  authNote: 'جلسة النسخة التجريبية في الذاكرة فقط: سجّل الدخول مجددًا بعد إغلاقها أو إعادة تحميلها. تسجيل Google وإنشاء الحساب والتنبيهات الفورية خارج هذه النسخة.',
  authError: 'تعذّر الدخول. تحقق من البريد وكلمة المرور وتأكيد البريد والاتصال.', logoutError: 'تعذّر تسجيل الخروج. حاول مجددًا.',
  show: 'إظهار كلمة المرور', hide: 'إخفاء كلمة المرور',
  profileNote: 'تستخدم الاقتراحات تفضيلاتك ومعداتك ومخزون البن وآخر نتائجك المسجلة في حساب الويب؛ لا تُعدّل هذه البيانات هنا.',
  setup: 'ربط BeanMora', setupNote: 'شغّل npm run setup داخل apps/mobile ثم أعد تشغيل Expo. تحتاج رابط المشروع ومفتاح القراءة العام فقط، وليس مفتاح service_role.',
};
export const copy = { en, ar };
export const methods: Record<Locale, Record<Method, string>> = {
  en: { v60: 'V60', espresso: 'Espresso', xbloom: 'xBloom', aeropress: 'AeroPress', chemex: 'Chemex', french_press: 'French press', cold_brew: 'Cold brew', moka_pot: 'Moka pot' },
  ar: { v60: 'V60', espresso: 'إسبريسو', xbloom: 'xBloom', aeropress: 'إيروبرس', chemex: 'كيمكس', french_press: 'فرنش برس', cold_brew: 'كولد برو', moka_pot: 'موكا بوت' },
};
export const reasons: Record<Locale, Record<Reason, string>> = {
  en: { method: 'Preferred brew method', gearMethod: 'Fits your brewing gear', flavor: 'Matches your flavor preferences', roast: 'Preferred roast family', inventory: 'Coffee in your inventory', exactEquipment: 'Recorded equipment matches', beginner: 'Beginner-friendly label', ownSuccess: 'You last enjoyed this recipe', community: 'Positive community evidence' },
  ar: { method: 'طريقة تحضيرك المفضلة', gearMethod: 'يناسب نوع معداتك', flavor: 'يطابق تفضيلات النكهة', roast: 'عائلة التحميص المفضلة', inventory: 'البن موجود في مخزونك', exactEquipment: 'المعدات المسجلة متطابقة', beginner: 'موسوم للمبتدئين', ownSuccess: 'أعجبتك آخر تجربة لهذه الوصفة', community: 'نتائج مجتمع إيجابية' },
};
export const caveats: Record<Locale, Record<Caveat, string>> = {
  en: { stockUnknown: en.stockUnknown, stale: 'Verification is over 90 days old.', unverified: 'Verification date is missing or invalid.', equipmentUnknown: 'Your brewing equipment is not known.', equipmentDifferent: 'Some recorded equipment differs; do not copy grinder numbers.', incomplete: 'Some recipe evidence or quantities are missing.', communityLimited: 'No sufficient community evidence loaded.' },
  ar: { stockUnknown: ar.stockUnknown, stale: 'مرّ أكثر من 90 يومًا على التحقق.', unverified: 'تاريخ التحقق مفقود أو غير صالح.', equipmentUnknown: 'معدات التحضير لديك غير معروفة.', equipmentDifferent: 'بعض المعدات مختلفة؛ لا تنقل أرقام الطحن بين الطواحين.', incomplete: 'بعض معلومات الوصفة أو كمياتها ناقصة.', communityLimited: 'لا تتوفر أدلة مجتمع كافية محمّلة.' },
};
export const outcomes: Record<Locale, Record<Outcome, string>> = {
  en: { excellent: 'Excellent', good: 'Good', needs_adjustment: 'Needs adjustment', poor: 'Poor' },
  ar: { excellent: 'ممتازة', good: 'جيدة', needs_adjustment: 'تحتاج تعديل', poor: 'غير مرضية' },
};
export const errors: Record<Locale, Record<SaveError, string>> = {
  en: { invalid: 'Check quantities, time, result and actual-brew confirmation.', auth: 'A permanent signed-in account is required.', unavailable: 'Recipe or save service unavailable.', retry: 'Save was not confirmed. Retry the same request.', conflict: 'This request was already used with different values.' },
  ar: { invalid: 'راجع الكميات والوقت والنتيجة وتأكيد التحضير الفعلي.', auth: 'يجب تسجيل الدخول بحساب دائم.', unavailable: 'الوصفة أو خدمة الحفظ غير متاحة.', retry: 'لم يتأكد الحفظ. أعد محاولة الطلب نفسه.', conflict: 'استُخدم هذا الطلب سابقًا بقيم مختلفة.' },
};
