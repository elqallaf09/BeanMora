# BeanMora mobile

## تشغيل للتطوير باستخدام Expo Go

لتثبيت إصدار أندرويد المستقل، اتبع [خطوات APK اليدوية](#manual-android-apk-release) أدناه. هذا القسم لتشغيل خادم التطوير على الكمبيوتر.

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

عند حظر الشبكة للاتصال المحلي: أوقف السيرفر ثم `npm run tunnel` وامسح الرمز الجديد. قد يطلب Expo تثبيت أداة النفق. لا يوجد QR دائم مخزّن في المستودع.

## Included

- Reference-matched home, coffee detail and full-photo login screens, with bundled imagery, Arabic fonts, line icons and five-item navigation.
- Responsive phone/tablet catalogs, a fully scrolling home page, coffee galleries and linked recipe quantities.
- Cream, copper and teal branding, a shared native/app-icon master, a Quicksand wordmark, illustrated flavor notes and source-backed sensory scales. Missing sensory measurements stay unspecified.
- Independent equipment and roastery directories, model guides, roaster coffees and linked recipes. Members can write, edit, delete and report real equipment opinions; guests can browse.
- A paginated recipe library and xBloom hub with search, official/community and Studio/Original filters, sharing links, source measurements and individual pours. Existing Origami and Kalita recipes are included.
- Combined server-side discovery filters for flavor family/note, recipe creator, creator’s documented base country, recipe geography, title, hot/iced/cold serving, coffee type/name, roaster and coffee origin. Country fields have separate meanings; no creator nationality is inferred.
- A reviewed international roaster batch with exact coffee/source matching, bilingual procedures or explicitly labelled published specifications, product photography and replayable provenance. Shared recipes are stored once and remain discoverable by each documented applicable coffee name.
- Per-coffee recipe loading has its own pagination, request cancellation and retry state, so older linked recipes remain accessible beyond the home catalog’s initial page.
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

## Manual Android APK release

Version 0.3.0 / Android versionCode 8 includes the refreshed brand, sourced sensory cards, combined recipe search, roaster recipes and repaired coffee photography. Updating source or exporting Metro bundles does not update a previously installed APK.

After the release PR is merged, open the existing BeanMora Expo project's **Builds** page and choose **Build from GitHub**. Use:

| Setting | Value |
| --- | --- |
| Git ref | `main` after the release PR is merged, or its exact merged commit |
| Base directory | `apps/mobile` (plural `apps`) |
| Platform | Android |
| EAS build profile | `preview` |
| Environment from the build profile | `production` (the **Production** variables in Expo) |
| Submit to store after build | Off |

Start the build manually. When its status is **Finished**, check that the build details identify the intended release commit and version **0.3.0 (8)**, then download the **APK** from that build's artifact link. Open the APK on the Android phone to install it. The account and connection-setup screens should display **0.3.0** after installation; use the build details to verify versionCode **8**.

Both EAS profiles explicitly select `production` variables and the Android `latest` build image. Version numbers come from the checked-in app config (`cli.appVersionSource: local`). The `preview` profile produces an internally distributed APK; the `production` profile produces an app bundle for store distribution. The standalone preview APK runs without Expo Go or a development server.

Before EAS installs dependencies, `eas-build-pre-install` validates `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Missing configuration, isolated test fixtures, malformed values, privileged keys and known anon-key/project mismatches stop the build with variable names only. Set the public values in this Expo project's **Production** environment; use a publishable key or legacy anon key, never a secret/service-role key. The check does not contact Supabase or prove that an opaque publishable key belongs to the configured project.

Run `npm run check:build-config` from an environment where those two variables are already exported to check locally. This dependency-free command deliberately does not load `.env` files. Its isolated regression tests run as part of `npm test`; normal development and browser fixtures remain separate from EAS release checks.

Release references (checked 2026-10-04): [Expo GitHub builds](https://docs.expo.dev/build/building-from-github/), [APK installation](https://docs.expo.dev/build-reference/apk/#physical-device), [build lifecycle hooks](https://docs.expo.dev/build-reference/npm-hooks/), [EAS environments](https://docs.expo.dev/eas/environment-variables/usage/) and [local app version source](https://docs.expo.dev/build-reference/app-versions/#local-version-source).

## Catalog data and source handling

Reviewed product photography is read from bean_images / product_images and direct image_url fields with documented provenance. Attributed `source_linked` photos remain at the publisher; this status does not assert a redistribution licence. Images fit inside their containers without cropping the bag. Official product artwork and coffee-origin photos carry distinct captions. Missing or failed coffee images show a neutral bean symbol and an explicit unavailable label; equipment shows a model-photo-unavailable label. Product origins come from the linked coffee lot. Brew amounts, temperatures and times are shown only from a recipe linked to the selected coffee and method; no mock ratings or quantities are substituted. Espresso output is labelled separately from input water, published ranges remain ranges, and calculated yield is marked. Source milliliters are displayed as milliliters and are not prefilled as measured grams in a brew result.

This preview reads the real BeanMora Supabase project only after local public configuration is supplied. Save is a real write initiated by the signed-in user. Browser tests use isolated synthetic fixtures and must never use production credentials. Missing stock/community evidence stays unknown. Mobile does not fetch public user-level community attempts in this release.

## Architecture and checks

`apps/mobile` has its own lockfile and React/Expo dependencies; the root web app is not converted into an npm workspace. Its TypeScript configuration excludes this directory. Core recommendation/outcome modules are exact snapshots of the web core. `npm test` checks for drift; run `npm run sync:core` after changing those modules. This release requires the equipment-review, source-media, reviewed-catalog and supported-brew-method migrations in `supabase/migrations`; these are already applied to BeanMora. Source snapshots and replay instructions are in `supabase/research/xbloom/README.md`.

```sh
npm run typecheck
npm test
node scripts/check-tooling.cjs
npx expo install --check
npx expo-doctor@1.20.4
npm run export
```

Passing Metro iOS/Android exports verifies bundling, not physical-device operation. React Native Web regression tests exercise scrolling, card widths, detail-to-recipe navigation, auth and outcome retries at 320, 390, 768 and 1536 pixels. Those tests do not establish native iOS/Android behavior. See the pull request for checks actually completed.

Reference docs (checked 2026-09-22): https://docs.expo.dev/get-started/start-developing/ , https://expo.dev/go , https://docs.expo.dev/guides/authentication/ , https://docs.expo.dev/guides/using-supabase/ .
