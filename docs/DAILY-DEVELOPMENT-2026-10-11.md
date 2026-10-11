# BeanMora maintenance — 2026-10-11

Review recorded at 03:22 Asia/Kuwait. First daily review: preceding 24 hours and existing issues.

## Baseline and scope

Started from main `07a3fe1be0e90bde45d281fc4100e96a1339b144`. No AGENTS.md or open PR was present. PRs #50, #54 and #55 were already merged; their UI/security work was retained. Both main workflows were green at the exact starting SHA ([web](https://github.com/elqallaf09/BeanMora/actions/runs/38085652582), [mobile](https://github.com/elqallaf09/BeanMora/actions/runs/38085652577)). Rechecked main while working: unchanged. Repository push/admin access available; auto-merge remains disabled and protection settings were not changed.

Work branch: `daily/2026-10-11-coffee-expert`, [PR #56](https://github.com/elqallaf09/BeanMora/pull/56). Code merge is gated on both PR workflows. PR/merge state is discoverable from that PR and the repository Actions; this document does not equate a source merge with a release.

## Implemented

- Local expert coaching now wins over broad water/grind lesson keywords when there is a brewing symptom or labeled measurement follow-up. Six previously failing Arabic/English cases now pass.
- A new educational topic can exit the prior coaching context: a question about cold brew no longer inherits the preceding V60 diagnosis. Two language regressions and actual React Native Web interactions verify it.
- Kuwait and other Gulf country names expand to their ISO catalog codes for retrieval and local ranking. A KW-coded roaster was previously missed by “محامص بالكويت”; the failing test was reproduced, fixed and checked against anonymous live RPC retrieval and the mobile UI.
- ARK, the published spaced A R K name and its Arabic catalog label resolve to one explicit named search. Three failing brand tests were reproduced and fixed, including rejection of unrelated “Market”/“dark” substring matches. Live RPC retrieval with the expanded published-name terms returns the new roaster.
- Added four bilingual, sourced lessons: flash brew/water/ice, cold extraction, bypass dilution and scaling filter recipes for two cups. The curriculum now has 48 topics including the six basic topics. These are reviewed knowledge and rule-based routing improvements; no model was trained, provider API enabled or subscription purchased.
- The existing reviewed importer accepts separately dated batches and manufacturer guides without inventing a roastery or coffee lot. The historical 2026-10-04 release remains date-locked. Ownership, method, visibility and source guards remain intact. Added a CI gate for the new batch.

Shared mobile code was regenerated from the web core. The Edge parser source was kept in sync; no Edge deployment is claimed.

## Actual catalog changes

Live BeanMora import: **3 recipes, 2 Kuwaiti roasters**, with **18 bilingual steps and 12 incremental pours**. Total database: 3454 recipes / 84 roasters; 77 roasters currently meet the public review gate. Existing catalog content outside the batch was fingerprinted before/after the live transaction and remained unchanged. Replay was tested with ROLLBACK; counts remained 3/2/18/12.

| Added record | Original source |
| --- | --- |
| A R K Roasters | https://www.ark.com.kw/pages/about |
| Altitude Roasters | https://altituderoasters.co/en/ |
| OREA V4 EASY FOR TWO | https://www.orea.uk/guides-v4 |
| OREA V4 DARA FOR TWO | https://www.orea.uk/guides-v4 |
| OREA V3 THE WIDE | https://www.orea.uk/guides-v3 |

All pages were opened on 2026-10-11. Ranges, ml headings, explicitly weighed g pours, hardware/filter context and C40-specific clicks are preserved. No midpoint brew time, fictional flavor, coffee lot, source-stated ratio, image rights or business ownership is asserted. Near-duplicate V3 THE ICE was excluded. See [batch evidence and replay](../supabase/research/daily-2026-10-11/README.md).

Anonymous-role verification: all three recipes are returned by OREA/hot/official filters; Arabic recipe-name search works; actual assistant facts include quantities, bilingual steps, source metadata and finish windows; the two new roasters are returned by country-code-expanded search. Roaster source/country read filters were also checked. Existing database search indexes populated automatically; no schema migration or manual reindex was needed.

Knowledge references also include [HARIO Mizudashi](https://www.hario-usa.com/products/mizudashi-cold-brew-coffee-pot) and [SCAA By-Pass Best Practices, revised 2016](https://scagermany.coffee/wp-content/uploads/2021/02/best-practices-bypass-brewing.pdf).

## Fresh validation and coverage

- Web: 281 Vitest tests, 31 recommendation tests, 37 brew-outcome tests; typecheck, lint, production Next build and 9 security regressions passed.
- Importer: 2 daily provenance/date/association tests; 5 existing importer tests, including generated SQL replay/ownership-conflict rollback in isolated PGlite, passed. Live PostgreSQL 17 rollback/import checks were separate.
- Web browser: 58 scenarios passed in Desktop Chromium and 320 px mobile Chromium, using isolated fixtures. Fresh inventory is 53 page templates; both languages and both projects were traversed (212 route visits). Boundaries, auth redirects, admin denial, legal/404 recovery, discovery filters, onboarding, comments/likes/reports failure+retry and locale-preserving detail links were covered. This is route/scenario coverage, not proof that every possible user state/button is tested.
- Mobile: core sync, typecheck, mobile test suite, 36 tooling exploit/integrity/audit-policy regressions and security audit policy passed. iOS, Android and web exports with source maps passed; affected build tools were absent from all three runtime bundles.
- React Native Web: 12 expert/compact-page scenarios passed at widths 320, 390, 800 and 1280, including new offline Arabic/English lessons, coaching, context switching, KW search and published spaced-brand search. Provider-request assertions were zero.
- Dependency state: root audit has zero findings. Mobile raw audit still reports 15 high findings; the existing installed security backports are verified, with zero risk exceptions. It must not be described as a clean raw audit.
- Database: 92/92 public tables have RLS; six views have security_invoker=true. Security/performance advisors were reread; guest/role warnings need policy context, not blanket guest removal. No RLS/Storage permissions were changed. Current performance advisor groups: 8 auth initplan, 83 unused-index, 168 multiple-policy and 1 connection-allocation finding. These are investigation candidates, not measured bottlenecks.

## Performance evidence and limits

The existing 1000-record React Native Web benchmark at 4x CPU measured account navigation **1116, 204, 402 ms** in the combined local suite, missing its unchanged <1000 ms threshold once. An isolated rerun measured **969, 212, 202 ms** and passed. This is a local browser benchmark with fixtures, not an iPhone, Android or Huawei measurement. The first navigation has limited headroom; no performance improvement is claimed and the threshold was not weakened.

Exported runtime sizes are approximately web 2.2 MB / iOS 2.9 MB / Android 3.0 MB, excluding source maps. A 2.1 MB filter-coffee PNG is a candidate for a later visual-quality-checked asset optimization. Export/compile duration is not app startup latency.

Local WebKit could be downloaded but system libraries were unavailable; full WebKit coverage is delegated to the unchanged CI browser container. Its CI result must be checked before merge.

## Deployment and next review

The currently connected Vercel team again listed only thesfm. No documented BeanMora public deployment URL was found in the repository or that account; the web copy was tested locally. No unrelated project was used. Supabase catalog changes are live, but code changes need the normal client release. No signed APK, installed-device update, TestFlight build or public-web deployment was produced.

Prioritize next:

1. Confirm PR checks/merge and any subsequent main changes before touching this batch; do not reimport as new records.
2. Native cold startup/navigation and real login/session/media/voice/direct-message/Storage tests on dedicated iPhone, Android/Huawei test devices/accounts. None were available in this run; never use real user data to manufacture coverage.
3. Investigate first-navigation headroom and image payload with a stable baseline; retain the existing performance threshold.
4. The reread advisor still reports disabled leaked-password protection. [Current Supabase documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) requires project Auth settings. No Auth-config management operation is exposed by the current connector; do not simulate it with SQL or change billing. Recheck supported configuration access on the next run.
5. Review mixed country-name/code labels in general catalog filters; assistant retrieval/ranking is fixed without rewriting existing roaster records.
6. Continue source coverage beyond OREA and Kuwait, and audit remaining authenticated state combinations. Historical audit observations in AUDIT-2026-10-09.md require fresh confirmation.
