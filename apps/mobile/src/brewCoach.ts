export type TasteSignal = 'sharp_sour' | 'bitter_dry' | 'thin_weak' | 'balanced' | 'other';
export type GrindSuggestion = 'finer' | 'same' | 'coarser' | null;

export interface BrewCoachSuggestion {
  grind: GrindSuggestion;
  ar: string;
  en: string;
  reasonAr: string;
  reasonEn: string;
}

export function brewCoach(signal:TasteSignal):BrewCoachSuggestion {
  if(signal==='sharp_sour') return {
    grind:'finer',
    ar:'ابدأ بمحاولة طحن أنعم قليلًا.',
    en:'Start by trying a slightly finer grind.',
    reasonAr:'الحموضة الحادة غير المتوازنة قد ترتبط باستخلاص أقل من المطلوب، لكن غيّر متغيرًا واحدًا فقط وراقب النتيجة.',
    reasonEn:'Sharp, unbalanced sourness can be associated with lower extraction, but change only one variable and compare.',
  };
  if(signal==='bitter_dry') return {
    grind:'coarser',
    ar:'ابدأ بمحاولة طحن أخشن قليلًا.',
    en:'Start by trying a slightly coarser grind.',
    reasonAr:'المرارة والجفاف قد يتحسنان مع تقليل الاستخلاص قليلًا، مع تثبيت بقية الإعدادات.',
    reasonEn:'Bitterness and dryness may improve with slightly less extraction while keeping other variables fixed.',
  };
  if(signal==='balanced') return {
    grind:'same',
    ar:'خل الطحن نفسه في المحاولة الياية.',
    en:'Keep the same grind next time.',
    reasonAr:'أنت وصفت الكوب بأنه متوازن، لذلك الأفضل تثبيت نقطة البداية بدل تغييرها بدون سبب.',
    reasonEn:'You described the cup as balanced, so keeping the same baseline is more useful than changing it without evidence.',
  };
  if(signal==='thin_weak') return {
    grind:null,
    ar:'لا نغيّر الطحن تلقائيًا من هالوصف وحده.',
    en:'Do not change grind automatically from this signal alone.',
    reasonAr:'الكوب الخفيف أو الضعيف ممكن يكون من النسبة أو الجرعة أو الطحن؛ نحتاج معلومة إضافية قبل اقتراح محدد.',
    reasonEn:'A thin or weak cup can come from ratio, dose or grind; more context is needed before suggesting one change.',
  };
  return {
    grind:null,
    ar:'سجّل ملاحظتك وغيّر عاملًا واحدًا فقط في المحاولة الياية.',
    en:'Record your note and change one variable only on the next attempt.',
    reasonAr:'ما عندنا دليل كافي لتحديد اتجاه الطحن بدون تخمين.',
    reasonEn:'There is not enough evidence to choose a grind direction without guessing.',
  };
}
