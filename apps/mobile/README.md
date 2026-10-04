# BeanMora mobile

## تشغيل على الهاتف

هذه واجهة React Native فعلية وليست عرض موقع Next.js داخل WebView. هذه نسخة موبايل أولية، وليست نقل كل صفحات الويب.

تحتاج كمبيوتر عليه Node.js 22.16 أو أحدث، واتصال إنترنت، وExpo Go المطابق لـ SDK 57 على الهاتف.

```sh
git clone https://github.com/elqallaf09/BeanMora.git
cd BeanMora/apps/mobile
npm ci
npm run setup
npx expo login
npm start
```

`setup` ينسخ فقط إعدادات Supabase العامة من `.env.local` في مشروع الويب إن وجدت، أو يطلب Publishable key. يمكن بدلاً منه وضع ملف `.env.local` المجهز في هذا المجلد. لا تضف أي مفتاح service_role / sb_secret ولا ترفعه إلى GitHub.

اتصل من الهاتف والكمبيوتر بنفس Wi-Fi. افتح Expo Go على أندرويد وامسح QR الظاهر في Terminal. على آيفون امسحه بكاميرا الهاتف. سجّل الدخول إلى Expo Go بنفس حساب `npx expo login`؛ مطلوب حاليًا على أجهزة iOS الفعلية. اترك Terminal والكمبيوتر يعملان.

عند حظر الشبكة للاتصال المحلي: أوقف السيرفر ثم `npm run tunnel` وامسح الرمز الجديد. قد يطلب Expo تثبيت أداة النفق. لا يوجد QR دائم مخزّن في المستودع، ولم يُنشر مشروع إلى EAS من هذه المحادثة.

## Included

- Reference-matched home, coffee detail and full-photo login screens, with bundled imagery, Arabic fonts, line icons and five-item navigation.
- Responsive phone/tablet catalogs, a fully scrolling home page, coffee galleries and linked recipe quantities.
- Independent equipment and roastery directories, model guides, roaster coffees and linked recipes. Members can write, edit, delete and report real equipment opinions; guests can browse.
- A paginated recipe library and xBloom hub with search, official/community and Studio/Original filters, sharing links, source measurements and individual pours. Existing Origami and Kalita recipes are included.
- Reviewed AeroPress, Chemex, French press, Origami, Kalita Wave and size-specific moka recipes/guides, with 109 bilingual steps across 21 curated entries, dose/time ranges, grind, temperature and source links. Infusion-only times and unknown numerical quantities remain explicit.
- Six original generated brewing illustrations and six verified YouTube tutorials with publisher attribution. Method tutorials are labelled as general guidance; exact recipe videos are linked separately when published with that recipe.
- Equipment guides, measured brew stopwatch with pause/resume/reset, cumulative pour targets, smaller-batch Chemex calculation and sharing. Saving an outcome remains an explicit action; the timer carries measured time into the signed-in review form.
- Persisted Arabic/English language selection and short screen/press animations respecting reduced-motion preferences.
- Arabic/English UI and search across loaded coffee names, roasters, origins and flavors.
- Existing BeanMora email/password login, signup and password reset. Public browsing creates no anonymous account.
- Native session persistence through AsyncStorage, private favorites using the existing owner-restricted bean_saves table, and account notifications.
- Explainable recommendations from existing account preferences, equipment, inventory and latest own brew outcomes.
- Recording a real brew through the existing atomic `record_brew_outcome_v1` RPC, without positive defaults; private by default, optional explicit community consent.
- Loading/error/empty states, request cancellation guards, bounded queries and network timeouts.

Native sessions persist using the Supabase storage adapter; web previews use browser storage. Social sign-in first checks the project's enabled providers. Google uses PKCE and an authentication browser; Apple displays an explicit unavailable message when its provider is disabled. A standalone build must register the beanmora scheme and allow beanmora://auth in Supabase's redirect URL list. Provider configuration and device sign-in have to be verified separately from isolated browser tests. Background push, admin and direct device control are not included. The stopwatch catches up when the app resumes; it does not provide background alarms or control heat.

Version 0.2.1 / Android versionCode 6 adds manual brewing guides and timers. Updating source or exporting Metro bundles does not update a previously installed APK. Build a new preview APK using the existing EAS project and its configured production environment:

```sh
npx eas-cli build --platform android --profile preview
```

This command requires access to the existing Expo account. No EAS build or store publication is implied by a successful Metro export.

Approved product photography is read from bean_images / product_images and direct approved image_url fields. Attributed `source_linked` direct photos remain at the publisher. Missing or failed coffee images use bundled, explicitly labelled illustrative photos; equipment shows a model-photo-unavailable label. Product origins come from the linked coffee lot. Brew amounts, temperatures and times are shown only from a recipe linked to the selected coffee and method; no mock ratings or quantities are substituted. Source milliliters are displayed as milliliters and are not prefilled as measured grams in a brew result.

This preview reads the real BeanMora Supabase project only after local public configuration is supplied. Save is a real write initiated by the signed-in user. Browser tests use isolated synthetic fixtures and must never use production credentials. Missing stock/community evidence stays unknown. Mobile does not fetch public user-level community attempts in this release.

## Architecture and checks

`apps/mobile` has its own lockfile and React/Expo dependencies; the root web app is not converted into an npm workspace. Its TypeScript configuration excludes this directory. Core recommendation/outcome modules are exact snapshots of the web core. `npm test` checks for drift; run `npm run sync:core` after changing those modules. This release requires the equipment-review, source-media, reviewed-catalog and supported-brew-method migrations in `supabase/migrations`; these are already applied to BeanMora. Source snapshots and replay instructions are in `supabase/research/xbloom/README.md`.

```sh
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npm run export
```

Passing Metro iOS/Android exports verifies bundling, not physical-device operation. React Native Web regression tests exercise scrolling, card widths, detail-to-recipe navigation, auth and outcome retries at 320, 390, 768 and 1536 pixels. Those tests do not establish native iOS/Android behavior. See the pull request for checks actually completed.

Reference docs (checked 2026-09-22): https://docs.expo.dev/get-started/start-developing/ , https://expo.dev/go , https://docs.expo.dev/guides/authentication/ , https://docs.expo.dev/guides/using-supabase/ .
