# BeanMora 0.5.6 / Android 16 — validation

## Reported problem and resulting behavior

Hot, Iced and Cold sometimes appeared empty because explicit source titles had
not been classified, and Brew My Coffee filtered a bounded local batch. The
public discovery RPC also performed rich text/metadata joins during plain
browsing. This release corrects reviewed source classifications, adds immediate
serving controls, and filters the coffee-scoped RPC before server pagination.
Text search and optional criteria continue to combine with AND semantics;
unknown styles stay in All. Hot brewing water does not establish serving style.

Catalog public/account reads now start in parallel, recommendation ranking is
memoized, and a last-good public snapshot opens while a refresh is pending.
Failed sections retain previous public data; successful empty reads replace it.
Snapshots are scoped to the backend and language, expire after seven days,
and contain no account profile, saved coffee IDs or session. A guest and each
account have separate local shelves for up to 50 public recipe snapshots.
Saved amounts and steps open offline; remote photos and links still need a
connection. Each serialized snapshot value is limited to 1.5 MB in UTF-8
bytes, including Arabic and emoji. Storage errors are visible and do not report a successful save.

Login returns to the chosen recipe and optional brew review, including measured
timer seconds. Cancel returns to the recipe. No brew is written automatically.
Archived bags are excluded; Arabic decimal bag weights remain decimals and
remaining weight cannot exceed the original. A page error has retry/home
recovery. Android configuration disables backup and blocks unused external
storage/overlay permissions.

## Attached APK inspected

| Property | Observed |
| --- | --- |
| Package | `com.beanmora.mobile` |
| Version / versionCode | `0.5.5` / `15` |
| SHA-256 | `1f1737e05d738814cb5d3bacb5a297ae0730aee50e07f576115cf396f10b81d9` |
| Minimum / target Android SDK | 24 / 36 |
| Debuggable / signature | false / APK v2 signed |
| JavaScript | Hermes bytecode v98 |
| Updates | Expo updates disabled; a new native APK is required |

The APK manifest, bundled configuration and JavaScript strings were inspected
and matched the repository's 0.5.5 app configuration. Native execution and a
signed 0.5.6 APK build were not performed: this workspace has no Android
emulator/device or Android SDK build environment; EAS signing was not used.

## Database correction and checks

`20261006095000_serving_filter_search_speed.sql` was tested transactionally,
then applied to the linked BeanMora project. It preserves the existing RPC
signature, caller RLS, grants and rich-search conditions. Only the 156 reviewed
public unknown rows are eligible, matching their existing IDs and exact titles.
Evidence is in `supabase/research/serving-2026-10-06/reviewed-corrections.json`.
Existing classified rows and unspecified source recipes are not reclassified.

| Public serving style | Before | After |
| --- | ---: | ---: |
| Hot | 140 | 188 |
| Iced | 3 | 109 |
| Cold | 1 | 3 |
| Unknown | 3031 | 2875 |
| Total | 3175 | 3175 |

The same iced RPC SQL query with ordering and a 12-row limit measured
**308.769 ms before** and **9.146 ms after** under EXPLAIN ANALYZE. These are
single database execution measurements, not end-to-end latency or a physical
Android performance guarantee. Live public REST checks returned the exact
188/109/3 counts and correct styles; a coffee-scoped method/serving request
also returned successfully. Network timings varied separately.

`supabase/tests/serving_search.sql` passes as anon: exact style counts,
Arabic diacritics with style, combined method/source filters, the corrected iced
BOMBE recipe, literal punctuation, all-word matching, and no private results.
Security advisors were reviewed; no new search/RLS finding was introduced.

## Release checks

- Mobile typecheck and the complete mobile test script pass, including cache
  scope/expiry/corruption, successful empty replacement, and scoped preferred
  recipe/method/serving request contracts.
- Android, iOS and web Metro exports pass using isolated test configuration.
- Expo Doctor passes 21/21 checks; patched Xcode tooling compatibility passes.
- Online Expo dependency checking hit a proxy timeout. Its offline check
  reports dependencies up to date, with Expo excluded by the existing project
  configuration; this does not assert online dependency freshness.
- Isolated Android prebuild passes: version 0.5.6 (16), allowBackup=false,
  and all three permission-removal directives are present. Final merged APK
  permissions still require checking the signed native artifact.
- Root application typecheck, lint and tests pass.
- Both lockfiles use the compatible source-map-js 1.2.2 security patch; the
  huge indexed-map offset regression finishes in a bounded child process.
  The root npm audit passes. Expo/Metro still pull braces 3.0.3 and
  node-forge 1.4.0 tooling advisories with no upstream patched release:
  [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and
  [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
  No forced Expo/React Native downgrade was applied. The audit findings remain
  visible in the existing mobile CI report.

All 57 React Native Web browser tests pass and cover both languages and phone/tablet widths,
serving/text combinations and page reset, stale-response guards, offline catalog
recovery, local recipe save/remove, storage failure, login return, late-page
bag recipes and exact Arabic decimal weights.
Browser/Metro/prebuild checks do not establish physical Android or iOS behavior.

## Follow-up: text search with serving filters

The 6 October follow-up moves the rich-search serving predicate onto the base
recipe rows, before the metadata/source/coffee joins. It keeps the same RPC
signature, RLS and literal all-word matching, and does not reclassify recipes.
The Supabase-generated migration version is `20261006115727`.

The same anon query for `BOMBE` plus `iced`, ordered by updated time and ID,
returned the same one recipe: database execution measured 358.640 ms before,
54.142 ms in the rolled-back candidate, and 74.614 ms after application.
These are individual database measurements, not a device startup benchmark.
`supabase/tests/serving_search.sql` passed after application, covering exact
Hot/Iced/Cold counts, Arabic text, combined criteria, literal input and caller RLS.
Live REST checks before this follow-up also returned only the selected style
(188 Hot, 109 Iced, 3 Cold), including Arabic terms. Unclassified recipes remain
available under All; missing serving data is not guessed from water temperature.

The APK uploaded in this session is 0.5.5 (15). The server search improvement is immediate,
but the 0.5.6 (16) cache, quick serving chips and language-picker changes require
a new APK because the inspected artifact has Expo updates disabled. Installed
device performance has not been verified in this environment.

## Build the updated APK

After this release reaches main, use the existing BeanMora Expo project:
Build from GitHub → main → base directory apps/mobile → Android → preview
profile → Production environment. Confirm version **0.5.6 (16)** and the
release commit in the finished build before downloading/installing its APK.
The detailed settings and environment checks are in `apps/mobile/README.md`.
