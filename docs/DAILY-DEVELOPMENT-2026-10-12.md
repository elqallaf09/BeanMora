# BeanMora maintenance — 2026-10-12

Review started at 03:00 Asia/Kuwait; evidence through 03:25. Target: BeanMora `ubvzdglrwkkuaigmkjap` and Expo `elqallaf09/beanmora-mobile`. No unrelated project, deployment provider or secrets were changed.

## Current work reviewed

Started from main `d59e00cbaeb9ae538eea23f991f6e1ea9d790d32`. No AGENTS.md, open issues or open PRs were present. Reviewed the intervening merged PRs #57–#60, daily/release records and Auth configuration instructions. Preserved their xBloom matching, bilingual search, photo/OCR, compact navigation, catalog caching and PKCE work. Both main workflows were successful at that exact SHA: [web](https://github.com/elqallaf09/BeanMora/actions/runs/38177635352), [mobile](https://github.com/elqallaf09/BeanMora/actions/runs/38177635353). Push/admin access remained available, auto-merge disabled. The main branch endpoint reports `protected: false`; rulesets were empty. The dedicated protection endpoint returned integration 403; no protection was changed.

Work is isolated in `daily/2026-10-12-coffee-context`. Final review, CI, merge and publishing receipts belong to its PR; prepared workflow files are not deployment receipts.

## Confirmed fixes and knowledge

- Reproduced two failed Arabic/English tests: after an espresso cup with dose 18 g, yield 36 g and time 30 s, switching coaching to V60 incorrectly retained all three measurements and showed 1:2. The engine now retains measurements only within the same brewer, or while answering an initially unknown method. A new brewer needs new measurements. Switching by method alone also clears the old symptom and asks about the new cup.
- Reproduced a separate failure: “اشرح الماء” after equipment results entered old-result explanation rather than the requested water lesson. A specific new lesson now wins over implicit old references. Explicit numbered result references and comparisons remain supported.
- Added one bilingual lesson on immersion, percolation and French press, with original NCA/HARIO references. The lesson explains Switch valve stages and why espresso yield is not steeping water. Supporting source links are retained in local answers. The curriculum now has 49 topics including six basics. This expands reviewed knowledge and deterministic dialogue routing; no model training, paid AI call or subscription occurred.
- Production inspection showed Blue Bottle's author translated literally as “أزرق بوتتلي قهوة”. Added consistent Arabic display names for Blue Bottle, Partners, Cary Wong and Limu. Stored source names and IDs remain intact.
- Regenerated the shared mobile core. Added browser regressions in both languages for the method change and both immersion sources, plus the lesson-after-shopping regression.

## Actual catalog import

Added **2 recipes, 2 roasters, 9 bilingual steps and 4 incremental pours** through the existing reviewed compiler/importer. Blue Bottle's existing roaster identity was reused. Database totals changed from **3454 recipes / 86 roasters** to **3456 / 88**, with 81 roasters passing the public review gate. The two roasters added by other conversations since yesterday are not counted as this batch.

- Limu Roastery, Kuwait: https://limukw.com/ — the original page explicitly identifies the Kuwaiti specialty roastery.
- Partners Coffee, US: https://www.partnerscoffee.com/pages/our-story — original story and home page identify its Brooklyn roastery.
- Blue Bottle French press, 30 g / 350 g: https://bluebottlecoffee.com/us/eng/brew-guides/french-press
- Cary Wong / Partners HARIO Switch, 15 g / 240 g: https://www.hario-usa.com/blogs/recipes-and-more-from-friends/v60-switch-recipe-with-partners-coffee

All pages were opened on 2026-10-12. Both recipes are hot. Switch's numerical water temperature is absent and remains null; the record is marked incomplete. Blue Bottle's published 205–210°F is retained, with explicitly calculated Celsius endpoints rounded to 0.1°C. Its four-minute steep and subsequent approximately twenty-second plunge stay separate. No named coffee lot, flavor, price, photo rights, unreported capacity or source-stated ratio was invented. Roaster ownership verification is not asserted. Roastery Studio's unreadable original page and an inaccessible HARIO PDF were excluded.

The generated transaction fingerprints all existing recipes, beans, roasters (including reused Blue Bottle), steps, pours and source rows outside the new records. The guard passed before the import with ROLLBACK, in the committed import, and in the post-import replay with ROLLBACK. Replay counts stayed 2/2/9/4. Anonymous live reads verified both recipes' hot/method visibility, Arabic titles, quantities, missing temperature and dated original sources. Actual anonymous assistant retrieval returns the two recipes and roasters. [Reproducible batch and evidence](../supabase/research/daily-2026-10-12/README.md).

## Verification and security

Local checks: 301 root unit tests, 31 recommendation tests and 37 brew-outcome tests; all passed. Root/mobile TypeScript passed after fixing the supporting-source type. Root lint, production Next.js build, nine security regressions and clean dependency audit passed. Mobile unit/data/brewing/search/context checks passed; three-platform Expo export and runtime source-map inspection passed. Eleven assistant browser tests passed, including the three new regressions. CI additionally runs the full root/mobile browser suites before merge.

Mobile raw npm audit still reports 15 high findings under upstream tooling version numbers. The existing gate verifies two installed security backports and passes with zero risk exceptions; mapped iOS/Android/web runtime bundles contain neither affected tooling module. This is not a clean raw mobile audit. Online Expo compatibility validation encountered an HTTP proxy timeout locally; offline bundled-package comparison passed with its reliability warning. CI's unchanged online compatibility and Expo Doctor checks remain mandatory before merge.

Live RLS inventory: 92/92 public tables have RLS enabled. Storage inspection confirmed private post/story/message/gallery/recipe media buckets and existing MIME/size limits; public catalog/avatar/logo buckets were not changed. No authenticated user/media mutation was performed. Security and performance advisors were read again. Existing no-policy service tables, public extensions, security-definer entry points and permissive-policy/index suggestions need contextual review, not indiscriminate policy deletion. No new database permission or migration was introduced.

## Publishing and service blockers

The real web host is https://beanmora-mobile.expo.app, observed live with **0.5.30 (37)**. Production alias points to deployment `2x6tg6bynl`. Expo confirms the existing 0.5.30 iOS build `972edeff-b924-43eb-96a4-d0d3f03003b6`, **0.5.30 (19)**, was uploaded by submission `84048417-3306-419e-b2d0-ba244e80e6dc` and Apple processing is VALID / Ready for TestFlight. App Store Connect currently requires sign-in, so current testing-group access was not independently verified. These releases preceded this batch.

Prepared 0.5.31 with the same proven, isolated release workflow pattern, exact BeanMora destination guards and build-ID-dependent iOS submission. `release-0.5.31` was created at the old checked main without the new workflow. Only fast-forward it after both exact merged-main quality runs succeed. Observe the EAS event, web behavior, Apple processing and groups separately; a ref update alone is not publishing evidence.

Supabase leaked-password protection is still disabled in the fresh security advisor. The available connector cannot change Auth settings, and the dashboard shows a sign-in wall. The actual plan is not visible; official current guidance makes the built-in feature Pro+. No upgrade was purchased and no user password was changed. The requested setting remains unresolved.

The credential-free redirect probe again returned HTTP 303 to `http://localhost:3000/` for both production web URL forms; `beanmora://auth` passed. These are confirmed Supabase Site URL/allow-list settings, not an Expo-hosting error. [Exact required entries](AUTH-REDIRECT-CONFIGURATION.md). Auth dashboard access is also required for this correction. Google branding cannot be verified or changed without the owning BeanMora Google project.

## Coverage to continue

This review directly covered production home/navigation/settings/version, recipe search/filter/details/source quantities and the public assistant/catalog paths, plus local bilingual assistant browser flows. CI expands coverage using dedicated fixtures. Carry forward yesterday's complete route inventory without recounting it as this run's manual coverage.

Next priorities: authenticated BeanMora Auth configuration, real sign-in/recovery on the published origin, TestFlight group availability, dedicated-test-account CoffeeHO/message/gallery/audio/video/Storage flows and native iPhone/Android/Huawei start/navigation measurements. No new native-device performance number is reported. Browser export/build duration is not startup latency. Remaining asset-size and first-navigation headroom investigations remain unmeasured improvement candidates.
