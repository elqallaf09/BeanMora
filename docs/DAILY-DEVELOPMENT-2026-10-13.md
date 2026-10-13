# BeanMora maintenance — 2026-10-13

Target: BeanMora `ubvzdglrwkkuaigmkjap` and Expo `elqallaf09/beanmora-mobile`. Started from main `8bd5547befe5222e006ebc30684cd8275322602e`. No AGENTS.md, open issues or open PRs were present. Reviewed the intervening photo/hot-cold recommendation, PKCE/profile privacy/viewer insights, bilingual flavor recommendation and profile-section dedup changes (#62–#66). Both baseline main CI workflows succeeded. Push/admin permissions remain available, auto-merge remains false, main reports protected:false and rulesets are empty. Changes are isolated in `daily/2026-10-13-coffee-coaching`.

## Confirmed fixes and expanded local knowledge

Reproduced eight failing cases against the unchanged assistant: a colloquial espresso yield was lost, punctuation before quantities prevented parsing, fast and slow espresso returned identical general advice, explicit volume/pressure was treated as grams, and a new zero dose could reuse an old measurement. Added mass-unit-aware labels and colon/equal support, bounded Arabic verbs for gram-denominated yield, Arabic/Persian digits and decimal support, and explicit rejection of incompatible units/nonpositive or excessive quantities. Invalid supplied fields are cleared instead of restoring their old values. Espresso flow coaching now differentiates finer/coarser adjustments, keeps dose/yield/timing fixed, checks distribution and attributes the direction to Flair's original guide. No grinder dial number or universal shot-time target is invented.

Added one bilingual espresso dial-in lesson; the curriculum now has **50 topics including six basics**. This is curated knowledge and deterministic engine work, not model training or a paid AI integration. Root/mobile shared modules were synchronized. Tests cover Arabic colloquial and labeled English questions, definite Arabic labels, decimals, misleading mL/bar/kg/temperature/time units, invalid values, and both flow directions. Two browser regressions exercise the displayed answers and assert no provider/network search calls.

Primary knowledge source: https://flairespresso.com/blogs/news/dialing-in-flair-58-plus-manual-espresso-maker — reviewed 2026-10-13. Device-specific pressure/temperature targets are not applied to arbitrary machines.

## Actually committed catalog records

**1 new cold recipe, 2 new Gulf roasters, 4 bilingual steps, 1 water addition**. Totals: **3456 → 3457 recipes; 88 → 90 roasters**. Existing Blue Bottle identity reused; no beans, prices or third-party images added.

- Caffeine Lab, Saudi Arabia: https://caffeinelab.me/ar/pages/about-us
- Emirati Coffee, UAE/Dubai roastery: https://www.emiraticoffee.com/
- Blue Bottle / HARIO Cold Brew Bottle, **68 g coffee / 750 g water**: https://www.hario-usa.com/blogs/cold-brew-recipes-and-guides/blue-bottle-cold-brew-recipe

The publisher specifies coarse grind, room-temperature steeping **up to 18 hours**, then filter removal and sealed refrigerated storage. Numeric temperature and a fixed/minimum duration remain null; the documented upper bound is retained in metadata and bilingual time notes. Ratio 1:11.03 is arithmetic from quantities, not a source-stated recipe ratio. No coffee lot or shelf-life duration was invented. The existing Blue Bottle six-cup moka recipe was detected despite an alternate CDN source URL and excluded from import.

Used the current reviewed compiler/importer. Untouched recipes/roasters/beans/steps/pours/sources fingerprints passed in rollback preflight, committed import and rollback replay. Replay stayed **1/2/4/1**. Read-only anonymous-role assistant searches return the cold recipe and both new roasters with source links. Production **0.5.32 (38)** shows 3457 recipes, finds the recipe through Arabic search + cold filter, and displays all quantities, original-source button, missing numerical temperature and upper-bound time correctly. See [batch evidence](../supabase/research/daily-2026-10-13/README.md).

## Verification and coverage

Local root unit/recommendation/outcome checks passed before the final small label/unit additions; all affected assistant/curriculum tests passed again after them (95 tests). Root/mobile TypeScript and root lint passed. Three-platform Expo export and source-map tooling isolation passed: iOS 987, Android 984, web 660 runtime source entries; no braces/node-forge runtime module. Root audit reports zero findings. Mobile raw audit still reports 15 high upstream tooling-version findings; two installed security backports verify with zero exceptions. Do not call the raw mobile audit clean.

Local browser regressions could not launch because the locked Chromium executable is absent. This is a local testing-tool limit, not an application failure. The unchanged CI workflow uses its pinned Playwright browser image and must run all new and existing browser regressions before merge. Final feature/main CI, merge and release receipts are recorded in the PR.

Direct public coverage: home counts, settings/version, recipe Arabic search/serving filter/details/source metadata, new Gulf roaster directory search and read-only assistant retrieval. Existing isolated CI coverage continues for login/profile/viewer/privacy, CoffeeHO/media/messages, inventory, languages and navigation. No real-user record or account was modified for tests. Native device startup/navigation on iPhone/Android/Huawei, real dedicated-account sign-in/recovery, tester-group availability and media capture remain pending. The export lists a 2.1 MB filter-coffee illustration and a 2.3 MB web JS bundle; these are artifact sizes, not measured startup latency. Asset delivery/compression is a future measurement candidate.

## Fresh service state and release boundaries

Supabase security advisor no longer reports leaked-password protection disabled. The credential-free redirect probe passes both production web URL forms and native `beanmora://auth`. These successful fixes are not re-applied. RLS inventory is now **94/94 public tables**, reflecting the newly merged visitor/viewer tables. No ACL, RLS, credential, Auth or destructive migration change was needed today.

Supabase's original 2026-10-12 changelog announces removal of older CBC TLS 1.2 HTTP-API ciphers starting 2026-11-10 at the earliest. Current app HTTPS integration is unchanged; end-of-life client compatibility has not been tested on physical devices. This is logged for future coverage, not reported as a current BeanMora outage.

Prepared **0.5.33** with the existing exact-destination guarded EAS deploy/build/submit pattern. `release-0.5.33` starts at the baseline without this workflow. Only fast-forward after both exact merged-main checks pass; observe the new Expo event, public version, exact iOS build submission and Apple processing separately. Source/CI/merge do not establish publication. THE SFM and Vercel are not BeanMora destinations.
