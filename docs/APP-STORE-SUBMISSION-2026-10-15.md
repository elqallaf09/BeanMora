# BeanMora — App Store submission preparation

Prepared: 15 October 2026. **DRAFT / NOT SUBMITTED.**

This document prepares a submission. It does not publish BeanMora, change App Store Connect, certify compliance, or prove native device testing. No Apple agreements, pricing, territories or privacy declarations were changed. Do not store review passwords or signing/API credentials in this repository. BeanMora remains separate from THE SFM.

## Verified repository configuration

| Item | Observed value |
| --- | --- |
| Mobile directory | `apps/mobile` |
| App name | BeanMora |
| Expo project | `@elqallaf09/beanmora-mobile` |
| EAS project ID | `a3785113-b993-49fa-9986-e3dc96d63115` |
| Bundle identifier | `com.beanmora.mobile` |
| App Store Connect app ID | `6819935215` |
| Source version | `0.5.35` |
| iPad support | Enabled |
| Production iOS build image setting | `latest` |
| Build numbering | Remote; auto-increment enabled |

Sources: `apps/mobile/app.json` and `apps/mobile/eas.json`. The local iOS buildNumber is not authoritative under remote versioning. A source version is NOT evidence that it has been built, uploaded, processed or approved. Confirm the exact EAS build ID, commit, version and Apple processing result. Do not create a duplicate Apple app record or change the bundle identifier.

Code inspection found account-deletion UI in `SettingsAccount.tsx`, privacy/terms dialogs in `LegalLinks.tsx`, and conditional Apple sign-in support in `AccountScreen.tsx`. These findings do not establish successful production/native operation. Apple sign-in visibility depends on provider availability.

## Arabic store copy — draft

Use only after testing the described functionality in the selected production candidate.

**Name:** BeanMora

**Subtitle:** وصفات القهوة والبن والمعدات

**Promotional text:**
اكتشف وصفات القهوة، تعرّف على البن والمحامص والمعدات، ونظّم قهوتك ووصفاتك المفضلة في مكان واحد.

**Keywords:**
قهوة,بن,وصفات,إسبريسو,تقطير,محامص,طاحونة,تحضير,بارستا

**Description:**
BeanMora يجمع اكتشاف القهوة وتحضيرها وتنظيم تجربتك في تطبيق واحد.

استكشف أنواع البن والمحامص ومعدات القهوة، وابحث عن الوصفات المناسبة لطريقة التحضير التي تستخدمها. راجع تفاصيل الوصفة وخطواتها، واحفظ ما تفضّله للرجوع إليه لاحقًا.

نظّم أكياس البن والمعدات الخاصة بك، وسجّل تجارب التحضير لتحتفظ بإعداداتك وملاحظاتك في مكان واحد.

يمكنك تصفح الكتالوج دون حساب. تحتاج إلى تسجيل الدخول لحفظ بياناتك الشخصية ومزامنتها واستخدام ميزات المشاركة.

النتائج تختلف بحسب البن والماء والمعدة والطحن. اتبع تعليمات الشركة المصنّعة عند استخدام معدات القهوة.

## English store copy — draft

**Name:** BeanMora

**Subtitle:** Coffee Recipes & Brew Journal

**Promotional text:**
Explore coffee recipes, beans, roasters and equipment. Keep your coffee collection, favourite recipes and brewing notes together.

**Keywords:**
espresso,beans,roasters,grinder,pourover,barista,brewing,recipes,coffee,journal

**Description:**
BeanMora brings coffee discovery, brewing and your personal coffee collection into one app.

Explore coffee beans, roasters and equipment. Find recipes for the brewing methods you use, review recipe details and preparation steps, and save your favourites for later.

Organise your coffee bags and equipment, and record brewing experiences so your settings and notes stay together.

Browse the catalog without an account. Sign in to save and synchronise personal content and use sharing features.

Brewing results vary with coffee, water, equipment and grind settings. Follow your equipment manufacturer's safety instructions.

Suggested category: Food & Drink; optional secondary category: Lifestyle. No category, price or country selection was applied. Preserve existing settings until verified; a preference against paid AI APIs does not establish the app's retail price. Do not advertise untested languages, invented catalog counts, guaranteed results or unaudited safety features.

## Required evidence before submission

Unchecked items represent missing verification, not automatically confirmed defects.

- [ ] Verify active Apple membership, current agreements, account notices and the required submission role.
- [ ] Select an exact processed production/store build, not an internal/Ad Hoc preview; match it to the App Store version record.
- [ ] Inspect actual Xcode/SDK versions and Apple's current accepted upload requirements. An EAS image setting of `latest` does not prove compliance.
- [ ] Install that candidate on iPhone and iPad. Test launch, navigation, rotation, images, supported languages and light/dark appearance.
- [ ] Test email, Google and Apple sign-in flows offered to users, cancellations, callbacks, recovery and session persistence. Confirm no localhost redirects.
- [ ] Test deletion with a disposable test account; verify backend data/storage/account cleanup and session removal, not just the presence of a button.
- [ ] Verify objectionable-content filtering, reporting, blocking, moderation handling and published reachable contact information for community features.
- [ ] Verify public HTTPS privacy and support URLs in a signed-out browser. An in-app policy dialog does not establish a public URL.
- [ ] Reconcile client/backend/SDK collection with the privacy policy and App Privacy declarations; obtain accurate owner approval.
- [ ] Provide a working dedicated review account when needed. Enter credentials only in App Store Connect, not here.
- [ ] Capture genuine native screenshots from the candidate; verify the icon and avoid real user data.
- [ ] Complete age-rating, content-rights, export-compliance and applicable territory/trader declarations accurately.

No authenticated App Store Connect/EAS session was available during this preparation. Apple support correspondence could not be checked because the connected Gmail service returned `mail_service_not_enabled`. No new build or submission was executed.

## Privacy worksheet — not final declarations

The current source policy describes account data and uploaded/personal content. Do not select “Data Not Collected” without a contrary, complete data-flow review.

Review email, phone and any supplied name; account identifiers; profile/recipe/comment/post content; photos, videos and voice messages; saved content and brewing/inventory entries; and manually selected country. Assess each category, purpose and account linkage against the actual implementation. Do not infer GPS collection from a country field. Diagnostics, analytics and third-party SDK behaviour remain unverified.

The policy states no advertising-tracking system, but that is not independent verification of the shipped app. Confirm actual retention, message/story expiry, backups and media cleanup before making promises.

The inspected policy points to My account for deletion, whereas the inspected UI exposes deletion through Settings. Reconcile published instructions with final navigation. The policy's support reference is general, not a concrete address; verify the real public support contact. This does not prove that a public support page is absent elsewhere.

## Screenshots

Capture the actual native build, not the web app or generated artwork. Suggested sequence: discovery, recipe detail, recipe search, equipment/beans, personal coffee collection. Include CoffeeHO only after functional and safety verification.

Apple's guide checked on 15 October 2026 lists an iPhone Dynamic Island medium-display screenshot requirement and an iPad 13-inch requirement when iPad is supported. Accepted portrait examples are 1179 × 2556 or 1206 × 2622 for that iPhone slot and 2064 × 2752 or 2048 × 2732 for iPad. Recheck the actual App Store Connect slots when uploading. Do not stretch a screenshot from another device to force the dimensions.

## Reviewer notes — verify before use

Draft:

> BeanMora is a coffee discovery and brewing app. The public catalog can be browsed without signing in. A signed-in account is used for personal saved content and community features. To access account deletion, open Settings and choose Delete account and data. The privacy policy and terms are accessible from Settings. Please use the dedicated review credentials supplied in App Review Information to inspect signed-in features.

Verify these paths in the submitted build. Add tested reporting/blocking directions, explain relevant permissions and provide a reachable review contact. Never submit placeholders or claim tests that were not run.

## Build and submit

An existing processed production build may be reused if it contains the intended release and passes the gates. A new build is not automatically required.

When a new build is necessary, the following interactive PowerShell commands are prepared from the repository root. They were NOT executed here and may consume EAS build quota:

```powershell
Set-Location .\apps\mobile
npm ci
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production
```

Select the exact tested build, not an unrelated latest build. Keep the existing app identity and remote numbering. A later decision to label the public release `1.0.0` requires a coordinated source/build/store change; this document does not change the version.

EAS Submit uploads the binary to App Store Connect; it does not itself publish the app publicly.

In App Store Connect:

1. Open existing BeanMora, app ID `6819935215`, and the App Store/Distribution version, not TestFlight groups.
2. Complete verified metadata, screenshots, policy/support links, privacy, rating, rights, export compliance, price and availability as applicable.
3. Select the matching processed production build; provide review contact and dedicated credentials where needed.
4. Choose the intended post-approval release option. Automatic release and manual release have different outcomes; no option was applied here.
5. Click **Add for Review**, inspect the submission, then **Submit for Review**. The first action alone does not submit it.
6. Record the real resulting status. Apple approval and public availability are separate facts; do not report either before evidence exists.

TestFlight invitations and App Store submission are separate workflows. An account/contract issue could affect both. This pack does not assert that the earlier TestFlight issue has been resolved.

## Sources and scope

Inspected: `apps/mobile/app.json`, `apps/mobile/eas.json`, navigation/import portions of `apps/mobile/App.tsx`, `SettingsScreen.tsx`, `SettingsAccount.tsx`, authentication portions of `AccountScreen.tsx`, `LegalLinks.tsx`, `core/legal-content.ts`, and account-management context in `AccountSecurity.tsx`.

This was not a full security, dependency, backend or native end-to-end audit. Text length checks passed for the drafted titles, subtitles, promotional text and keywords; those checks do not establish application readiness.

Official references checked on 15 October 2026:

- https://docs.expo.dev/submit/ios/
- https://docs.expo.dev/deploy/submit-to-app-stores/
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option
- https://developer.apple.com/app-store/submitting/
- https://developer.apple.com/news/upcoming-requirements/

The retrieved submitting and upcoming-requirements pages differ in their SDK/deployment-target minimums. Reconcile the current requirement and actual Apple validation with the candidate build log; this pack does not certify its toolchain.

## ملخص التنفيذ

تم فحص إعدادات الهوية والنشر وبعض مسارات الحساب، وإعداد نصوص عربية وإنجليزية وقائمة تحقق. لم تُرفع نسخة جديدة، ولم يُرسل طلب إلى App Review، ولم يتغير حساب أبل أو يُنشر التطبيق. يلزم التحقق من النسخة الفعلية واستكمال حقول المتجر والإقرارات ثم تنفيذ الإرسال من الحساب المخوّل. لا تشارك كلمة مرور Apple أو رمز التحقق أو مفاتيح التوقيع في المحادثة أو المستودع.
