export type LegalKind = 'privacy' | 'terms';
export const legalContent = {
  ar: {
    privacy: {
      title: 'سياسة الخصوصية',
      sections: [
        [
          'البيانات التي نعالجها',
          'يمكنك تصفح الكتالوج دون حساب. عند إنشاء حساب نعالج البريد الإلكتروني واسم المستخدم والدولة ورقم الهاتف ومعرّف الحساب وبيانات الملف التي تضيفها. تظهر الدولة وعلمها في الملف العام، ويبقى البريد ورقم الهاتف خاصين بالحساب. عند استخدام الحفظ والمخزون والتحضير والمجتمع نعالج الوصفات والتجارب والمفضلة والملفات التي تختار إضافتها.',
        ],
        [
          'سبب الاستخدام ومقدمو الخدمة',
          'نستخدم البيانات لتسجيل الدخول، مزامنة محتواك، عرض الميزات التي تطلبها وحماية الخدمة وتشخيص الأعطال. نعتمد على Supabase للمصادقة والبيانات والتخزين، وعلى خدمات توزيع التطبيق. إذا اخترت الدخول الاجتماعي تُطبق أيضًا سياسة مزود الدخول. قد تعالج الخدمة البيانات خارج بلد إقامتك.',
        ],
        [
          'المحتوى العام والخاص',
          'المحتوى الذي تنشره للعامة قد يظهر للآخرين مع معلومات ملفك العام. راجع خيار الرؤية قبل النشر، ولا تضع بيانات حساسة في منشور عام. لا ترفع ملفات لا تملك حق مشاركتها. الروابط المؤقتة للملفات قد تبقى صالحة حتى تنتهي مدتها.',
        ],
        [
          'التخزين على جهازك',
          'نحفظ اللغة ونسخًا من الكتالوج والمحتوى المحفوظ لتحسين الاستخدام. تُحفظ جلسة الدخول الأصلية في مخزن النظام المحمي. قد تبقى نسخة محلية من محتوى عام بعد حذفه من الخادم؛ يمكنك مسح بيانات التطبيق من إعدادات الجهاز.',
        ],
        [
          'الحذف والاحتفاظ',
          'من «حسابي» اختر «حذف الحساب والبيانات» ثم أكّد الحذف. تُزال بيانات الحساب النشطة والملفات التابعة له، وقد يستلزم انقطاع الشبكة إعادة المحاولة. الاحتفاظ في النسخ الاحتياطية لدى مقدم الخدمة يخضع لدورة النسخ الخاصة به. حذف التطبيق وحده لا يحذف حسابك.',
        ],
        [
          'اختياراتك',
          'يمكنك التصفح دون حساب، تسجيل الخروج، تعديل المحتوى أو حذفه، وإلغاء أذونات الجهاز من إعداداته. لا يتضمن الإصدار الحالي نظام إعلانات أو تتبعًا إعلانيًا. راجع معلومات دعم التطبيق في قناة التوزيع عند الحاجة إلى مساعدة.',
        ],
      ],
    },
    terms: {
      title: 'شروط الاستخدام',
      sections: [
        [
          'استخدام الخدمة',
          'BeanMora يساعدك على اكتشاف القهوة والوصفات والأدوات وتسجيل تجاربك. احمِ حسابك واستخدم الخدمة بصورة مشروعة، ولا تحاول الوصول إلى حسابات الآخرين أو تعطيلها.',
        ],
        [
          'المصادر والدقة',
          'قد تتغير مواصفات المنتجات والأسعار والوصفات لدى مصادرها. تصنيف «رسمي» يعني اعتماد المصدر داخل الخدمة، ولا يعني أن كل إعداد يناسب جهازك. اتبع تعليمات الشركة المصنّعة عند استخدام الماء الساخن والضغط والمعدات.',
        ],
        [
          'المحتوى الذي تضيفه',
          'أضف محتوى تملك حق مشاركته واحترم أصحاب الصور والوصفات. لا تنتحل صفة جهة رسمية أو تنشر بيانات شخصية للآخرين. قد يُخفى المحتوى المخالف أو يعود للمراجعة.',
        ],
        [
          'التوافر والحساب',
          'قد تنقطع الخدمة أو يتأخر تحديث البيانات. تستطيع حذف حسابك من صفحة الحساب. لا يشكل التطبيق ضمانًا لنتيجة تحضير أو توصية شراء ملزمة.',
        ],
      ],
    },
  },
  en: {
    privacy: {
      title: 'Privacy policy',
      sections: [
        [
          'Data we process',
          'You can browse the catalog without an account. When you register, we process your email, username, country, phone number, account identifier and profile details you provide. Your selected country and flag are public; email and phone stay private. Saved recipes, inventory, brew history, community content and uploads are processed when you choose those features.',
        ],
        [
          'Purposes and providers',
          'We use data to authenticate you, synchronize your content, deliver requested features, protect the service and diagnose failures. Supabase provides authentication, database and storage services. App distribution services and, if selected, social login providers also process data under their policies. Processing may take place outside your country.',
        ],
        [
          'Public and private content',
          'Content you publish publicly may be visible with your public profile. Check visibility before posting and avoid sensitive information in public content. Only upload files you have permission to share. Temporary media links may remain valid until their expiry.',
        ],
        [
          'On-device storage',
          'Language, catalog and saved-content caches improve usability. Native sign-in sessions are kept in protected system storage. A local copy of public content may remain after server deletion; device settings can clear app data.',
        ],
        [
          'Deletion and retention',
          'Choose Delete account and data in My account and confirm. Active account data and owned files are removed; network interruptions may require a retry. Provider backups follow their backup lifecycle. Uninstalling the app does not delete your account.',
        ],
        [
          'Your choices',
          'You can browse without an account, sign out, edit or delete content, and manage device permissions in system settings. This release has no advertising or advertising-tracking system. Use the app support information in your distribution channel if you need help.',
        ],
      ],
    },
    terms: {
      title: 'Terms of use',
      sections: [
        [
          'Using the service',
          'BeanMora helps you explore coffee, recipes and equipment and record your experience. Protect your account, use the service lawfully, and do not access or disrupt other accounts.',
        ],
        [
          'Sources and accuracy',
          'Specifications, prices and recipes can change at their sources. An official classification means the source was approved in the service, not that every setting fits your equipment. Follow manufacturer instructions for hot water, pressure and equipment.',
        ],
        [
          'Your contributions',
          'Share only content you have the right to share and respect authors and image owners. Do not impersonate an official source or publish other people’s personal information. Content may be hidden or returned for review.',
        ],
        [
          'Availability and accounts',
          'The service may be interrupted and updates may be delayed. You can delete your account from the account screen. The app does not guarantee brewing results or provide a binding purchase recommendation.',
        ],
      ],
    },
  },
} as const;
export const legalUpdated = '2026-10-09';
