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
- Cream, copper and teal branding, a shared native/app-icon master, a Quicksand wordmark, illustrated flavor notes and source-backed sensory scales/descriptions. Unpublished metrics do not create empty bars or arbitrary ratings.
- Independent equipment and roastery directories, model guides, roaster coffees and linked recipes. Members can write, edit, delete and report real equipment opinions; guests can browse.
- A photo-led xBloom hub with 12 recipes per page, compact guide links, official/community and Studio/Original filters, sharing links, real source measurements and individual pours. Missing/broken xBloom covers use a bundled, labeled brewing illustration. Existing Origami and Kalita recipes are included.
- Coffee detail prioritizes available linked recipes, reads xBloom dose/grind/per-pour temperatures, and offers sourced general brewing guides as clearly labeled starting points. A coffee without an exact xBloom recipe can open the recipe library.
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

Native sessions persist using the Supabase storage adapter; web previews use browser storage. Social sign-in first checks the project's enabled providers. Google uses PKCE, account selection and an authentication browser; an unconfigured Apple provider is hidden. The exact beanmora://auth redirect is registered in Supabase. My account → Delete account and data removes the account, associated database rows, uploaded files, own local recipe shelf and roast draft after explicit confirmation. Device sign-in and deletion must be verified separately from isolated browser tests. Background push, admin and direct device control are not included. The stopwatch catches up when the app resumes; it does not provide background alarms or control heat.

## Manual Android APK release

Version 0.5.8 / Android versionCode 18 adds account/data deletion and completes Google’s native callback configuration. It includes the Model 01 language pill, early coffee previews and public request reuse for five minutes across language/account changes. Public and account data remain separate. Foreground return after five minutes refreshes the catalog automatically; quick returns reuse it. Press/screen/language animation respects Reduce Motion and uses the native driver on installed Android/iOS. See [account and auth release validation](../../docs/RELEASE-0.5.8.md).

Coffee → Explore xBloom now carries an exact coffee ID through filters and pagination. Cold and iced share one filter in the library and Brew My Coffee. The header Search and home Explore now search coffee notes, related roasters and the full recipe library together. Arabic/English retrieval aliases include strawberry / فراولة; every typed word remains an AND condition and punctuation stays literal.

The database changes are already applied: all 2,875 historical unknown public styles are classified (2,829 are explicitly labelled suggestions), with three added roasters and seven official cold guides. An automatically maintained public search index measured the same strawberry query at 42.516 ms instead of 2,299.254 ms; these are database execution measurements, not a physical-device startup benchmark. Source records are in ../../supabase/research/serving-completion-2026-10-06/ and ../../supabase/research/cold-expansion-2026-10-06/. See [release validation](../../docs/RELEASE-0.5.7.md).

Updating source or exporting Metro bundles does not update a previously installed APK.

After the release PR is merged, open the existing BeanMora Expo project's **Builds** page and choose **Build from GitHub**. Use:

| Setting | Value |
| --- | --- |
| Git ref | `main` after the release PR is merged, or its exact merged commit |
| Base directory | `apps/mobile` (plural `apps`) |
| Platform | Android |
| EAS build profile | `preview` |
| Environment from the build profile | `production` (the **Production** variables in Expo) |
| Submit to store after build | Off |

Start the build manually. When its status is **Finished**, check that the build details identify the intended release commit and version **0.5.22**, then download the **APK** from that build's artifact link. The Android build number must exceed the version already installed on the device. Settings and account screens show the actual installed native version/build number. Install the newly built APK to receive these changes.

Both EAS profiles explicitly select `production` variables and the Android `latest` build image. EAS now manages build numbers remotely with `autoIncrement: true` on both profiles; the user-facing version remains in app.json. On initial migration verify the remote counters exceed Android **25** and iOS **9**; an existing lower counter must be synchronized with `eas build:version:set` before delivery. The `preview` profile produces an internally distributed APK; the `production` profile produces an app bundle for Android or an App Store build for iOS. Build a new iOS archive before submitting it to TestFlight. Resubmitting an old archive keeps its duplicate build number. The standalone preview APK runs without Expo Go or a development server.

The Expo project's GitHub base directory must be `apps/mobile`. To upload a finished iOS production archive from the dashboard, run `.eas/workflows/submit-ios.yml` and supply that archive's exact EAS `build_id`. The workflow is manual-only, has no default archive, and uses the stored production submission configuration. It uploads to App Store Connect/TestFlight; it does not release the app publicly to the App Store.

## 0.5.16 mobile experience

Settings now contains saved Arabic/English and light/dark/device appearance choices without leaving the current detail. The community tab is coffeeHO. xBloom opens the shared recipe library with its method filter and 12-result pages. Equipment cards and details expose Add to my equipment directly.

Coffee assistant searches the existing public catalog by budget/currency, tasting notes, brewing method and roaster location. Prices require dated seller sources; conversion requires recent currency rates. Missing currency prompts a clarification. Results retain original-source links and can open equipment/recipe details. A conversation stays in memory only and clears when the account changes.

## 0.5.17 local coffee assistant

The app now runs a deterministic coffee expert system on-device (`src/lib/local-coffee-assistant.ts`, synced into mobile). It has no model SDK, provider request, API key, token quota or AI subscription. Guest users get the same assistant. The historical Edge Function implementation is no longer called by mobile and does not need activation.

Arabic/English intent rules resolve budget/currency follow-ups, method changes, ordinal result references, sourced comparisons, recipe steps and operation preferences. Price dates and FX freshness checks remain enforced; absent product facts stay unknown. Calculations require explicit dose/ratio or a selected recipe with numeric amounts. Espresso calculations label beverage yield; moka fill is not scaled, and the app's xBloom dose range is enforced. Brew troubleshooting is conditional, sourced guidance, not a diagnosis or invented grinder setting. Bundled guides and arithmetic work without the catalog/network. Live catalog and price searches use the existing public Supabase projection and need connectivity. Conversation data stays in account-scoped memory and clears on account change or New conversation.

This is a purpose-built rules/knowledge assistant, **not a trained general-purpose language model**. Coverage is limited to supported coffee intents and published catalog data. It adds no model inference bill; existing database/hosting and app distribution remain subject to their existing plans. No new infrastructure or paid service is provisioned.

Before EAS installs dependencies, `eas-build-pre-install` validates `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Missing configuration, isolated test fixtures, malformed values, privileged keys and known anon-key/project mismatches stop the build with variable names only. Set the public values in this Expo project's **Production** environment; use a publishable key or legacy anon key, never a secret/service-role key. The check does not contact Supabase or prove that an opaque publishable key belongs to the configured project.

Run `npm run check:build-config` from an environment where those two variables are already exported to check locally. This dependency-free command deliberately does not load `.env` files. Its isolated regression tests run as part of `npm test`; normal development and browser fixtures remain separate from EAS release checks.

Release references (checked 2026-10-04): [Expo GitHub builds](https://docs.expo.dev/build/building-from-github/), [APK installation](https://docs.expo.dev/build-reference/apk/#physical-device), [build lifecycle hooks](https://docs.expo.dev/build-reference/npm-hooks/), [EAS environments](https://docs.expo.dev/eas/environment-variables/usage/) and [local app version source](https://docs.expo.dev/build-reference/app-versions/#local-version-source).

## Catalog data and source handling

Version 0.5.21 adopts the selected underline menu mockup 7 in discovery and Settings, removes the redundant coffee-list buttons, and centers coffeeHO in the bottom navigation. Roast Lab adds an illustrated, sourced learning guide with a ten-page Arabic study. Equipment details expose reviewed multi-photo galleries for 109 models (383 photographs); the free local coffee expert adds a searchable library of 44 bilingual lessons and substantive follow-ups. See [release validation and limitations](../../docs/RELEASE-0.5.21.md).

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

Version 0.5.22 unifies account recipe saves with the saved shelf, retains recipe search/filter drafts across detail navigation, expands Arabic coffee/flavor retrieval, and displays catalog pictures in account collections. Equipment includes usage steps and verified manufacturer links; the capsule catalog lists 101 reviewed products in seven systems, including Zill. Brew results save grinder, brewer, roast and calibration in the same idempotent transaction. See [validation and build requirements](../../docs/RELEASE-0.5.22.md).
