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
- Arabic/English UI and search across loaded coffee names, roasters, origins and flavors.
- Existing BeanMora email/password login, signup and password reset. Public browsing creates no anonymous account.
- Native session persistence through AsyncStorage, private favorites using the existing owner-restricted bean_saves table, and account notifications.
- Explainable recommendations from existing account preferences, equipment, inventory and latest own brew outcomes.
- Recording a real brew through the existing atomic `record_brew_outcome_v1` RPC, without positive defaults; private by default, optional explicit community consent.
- Loading/error/empty states, request cancellation guards, bounded queries and network timeouts.

Native sessions persist using the Supabase storage adapter; web previews use browser storage. Social sign-in first checks the project's enabled providers. Google uses PKCE and an authentication browser; Apple displays an explicit unavailable message when its provider is disabled. A standalone build must register the beanmora scheme and allow beanmora://auth in Supabase's redirect URL list. Provider configuration and device sign-in have to be verified separately from isolated browser tests. Background push, admin, guided timers and direct device control are not included.

Version 0.1.3 / Android versionCode 4 contains new native dependencies. Updating source or exporting Metro bundles does not update a previously installed APK. Build a new preview APK using the existing EAS project and its configured production environment:

```sh
npx eas-cli build --platform android --profile preview
```

This command requires access to the existing Expo account. No EAS build or store publication is implied by a successful Metro export.

Approved product photography is read from bean_images / product_images and direct approved image_url fields. Missing or failed product images use bundled, explicitly labelled illustrative photos. Product origins come from the linked coffee lot. Brew amounts, temperatures and times are shown only from a recipe linked to the selected coffee and method; no mock ratings or quantities are substituted.

This preview reads the real BeanMora Supabase project only after local public configuration is supplied. Save is a real write initiated by the signed-in user. Browser tests use isolated synthetic fixtures and must never use production credentials. Missing stock/community evidence stays unknown. Mobile does not fetch public user-level community attempts in this release.

## Architecture and checks

`apps/mobile` has its own lockfile and React/Expo dependencies; the root web app is not converted into an npm workspace. Its TypeScript configuration excludes this directory. Core recommendation/outcome modules are exact snapshots of the web core. `npm test` checks for drift; run `npm run sync:core` after changing those modules. No database migration is needed.

```sh
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npm run export
```

Passing Metro iOS/Android exports verifies bundling, not physical-device operation. React Native Web regression tests exercise scrolling, card widths, detail-to-recipe navigation, auth and outcome retries at 320, 390, 768 and 1536 pixels. Those tests do not establish native iOS/Android behavior. See the pull request for checks actually completed.

Reference docs (checked 2026-09-22): https://docs.expo.dev/get-started/start-developing/ , https://expo.dev/go , https://docs.expo.dev/guides/authentication/ , https://docs.expo.dev/guides/using-supabase/ .
