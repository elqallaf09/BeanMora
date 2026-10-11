/** Literal label spellings. These aliases never infer a coffee's origin or taste. */
export const coffeeOrigins = [
  ['Brazil', 'Brasil', 'Brazilian', 'البرازيل', 'برازيل', 'برازيلي'],
  ['Colombia', 'Colombian', 'كولومبيا', 'كولومبي'],
  ['Ethiopia', 'Ethiopian', 'إثيوبيا', 'اثيوبيا', 'إثيوبي'],
  ['Indonesia', 'Indonesian', 'إندونيسيا', 'اندونيسيا'],
  ['Kenya', 'Kenyan', 'كينيا'], ['Yemen', 'Yemeni', 'اليمن', 'يمن'],
  ['Panama', 'بنما'], ['Guatemala', 'غواتيمالا'], ['Peru', 'بيرو'],
  ['Rwanda', 'رواندا'], ['Uganda', 'أوغندا'], ['India', 'الهند'],
  ['Mexico', 'المكسيك', 'مكسيك'], ['Ecuador', 'الإكوادور', 'اكوادور'],
  ['Bolivia', 'بوليفيا'], ['Honduras', 'هندوراس'], ['Nicaragua', 'نيكاراغوا'],
  ['Burundi', 'بوروندي'], ['Costa Rica', 'كوستاريكا', 'كوستا ريكا'],
  ['El Salvador', 'Salvador', 'السلفادور', 'سلفادور'],
  ['China', 'الصين'], ['Thailand', 'تايلند', 'تايلاند'],
] as const;
export const coffeeVarieties = [
  ['Castillo', 'كاستيلو', 'كاستيو', 'كاستييو'],
  ['Caturra', 'كاتورا', 'كاتورّا', 'كاتورا'],
  ['Catuai', 'كاتواي', 'كاتوي'], ['Bourbon', 'بوربون'],
  ['Typica', 'تيبيكا', 'تيبيكا'], ['Gesha', 'Geisha', 'غيشا', 'جيشا', 'قيشا', 'قيشة'],
  ['Pacamara', 'باكامارا', 'باكمارا'], ['Sidra', 'سيدرا'],
  ['Wush Wush', 'Wushwush', 'وش وش', 'ووش ووش'],
  ['Heirloom', 'هيرلوم', 'سلالات محلية'], ['SL28', 'SL 28', 'اس ال 28'],
  ['SL34', 'SL 34', 'اس ال 34'], ['Maracaturra', 'ماراكاتورا'],
  ['Java', 'جاوا'], ['Catimor', 'كاتيمور'], ['Sarchimor', 'سارتشيمور'],
] as const;
export const coffeeProcesses = [
  ['washed', 'fully washed', 'مغسول', 'مغسولة'],
  ['natural', 'dry processed', 'طبيعي', 'مجفف'],
  ['honey', 'honey processed', 'عسلية', 'عسلي'],
  ['anaerobic', 'لاهوائي', 'لاهوائية'],
  ['wet hulled', 'giling basah', 'تقشير رطب'],
] as const;
export const coffeeRoasts = [
  ['light', 'light roast', 'فاتح', 'فاتحة'],
  ['medium', 'medium roast', 'متوسط', 'متوسطة'],
  ['dark', 'dark roast', 'داكن', 'غامق', 'داكنة'],
] as const;
export const coffeeLabelVocabulary = [...coffeeOrigins, ...coffeeVarieties] as const;
