# Security and release hardening — 2026-09-21

## Database rollout (applied and tested)

Migration `20260921205114_restrict_ingestion_and_internal_rpc_access` was applied to the BeanMora project. Its filename matches the connected database migration history. This is a forward-only migration; no prior migration/history or production content was rewritten.

- `ingestion_review_queue` now uses `security_invoker=true`. Anonymous access is revoked, while authenticated users must satisfy the underlying admin-only RLS policies.
- `handle_new_user()` remains the signup trigger implementation, but is not directly executable by public/anon/authenticated API callers.
- `delete_own_account()` remains the existing authenticated `auth.uid()`-scoped action. Anonymous execution was revoked; no account-deletion operation was performed.
- `purge_reviewed_excerpts()` now uses SECURITY INVOKER. Authenticated admins operate through existing ingestion-table RLS; ordinary users cannot purge other users' review evidence. Service-role maintenance access is preserved without introducing that key into application code.

The transactional test in `supabase/tests/access_hardening.sql` passed with actual anon/authenticated database roles: signup trigger behavior, member queue isolation, denied anonymous calls, admin queue visibility and non-elevated maintenance. All fixtures rolled back. Subsequent checks found zero retained test accounts/sources and zero anon-executable SECURITY DEFINER functions in public.

Post-change security advisors no longer reported the definer-view error or public-executable definer-function warnings. This is a targeted hardening result, not proof that every policy in the platform is correct.

## Dependencies and browser headers

Next and eslint-config-next moved to 15.5.25, React/React DOM to 19.1.5, Vitest/UI to 4.1.11, Playwright to 1.55.1, Supabase SSR to 0.6.1 and supabase-js to 2.57.4. Other packages were re-resolved inside their previously declared ranges. Every direct dependency is now exact-pinned with a committed lockfile. npm 11.19.1 is pinned because npm 10 crashed during optional-peer graph resolution; neither force nor legacy-peer-deps was used.

Next's PostCSS dependency is narrowly overridden to 8.5.23 (same major) for the source-map disclosure fixes. Reassess/remove this override when upgrading Next to a version carrying an equivalent or newer fix. Do not run a blind major `npm audit fix --force`.

The initial dependency audit reported 16 findings including 3 critical. PR #17's first quality run verified zero known dependency vulnerabilities after the updates. The final quality gate runs `npm audit --audit-level=low` again, including development dependencies. A zero npm report is not a full code or infrastructure security audit.

Baseline headers: no X-Powered-By, nosniff, deny framing, strict-origin referrer policy and CSP base-uri/object-src/frame-ancestors. This deliberately does not pretend to be a complete nonce-based script CSP, and does not break device/camera or OAuth flows by adding untested blanket permissions restrictions.

## Release checks

`.github/workflows/quality.yml` has read-only repository permissions and no production credentials. It runs pinned npm installation, full dependency audit, dependency/PostCSS source-map regression tests, all existing unit/recommendation/outcome tests, full application typecheck and Next.js production build before browser tests.

Vitest uses an ESM config and an explicit Oxc automatic JSX transform for Vite 8. The application's JSX-preserve setting remains unchanged for Next's compiler. No test or lint rule was disabled for the upgrade.

`playwright.smoke.config.ts` targets desktop Chromium, narrow 320px mobile Chromium and mobile WebKit, with Arabic and English test cases for password controls, admin denial, recommendation filters, viewport overflow and guest restrictions after V60 brewing.

The smoke suite intentionally uses `e2e/fixtures/supabase-smoke.mjs`, a loopback-only guest-auth/empty-catalog test stub. It never creates live accounts, real recipes, stock, prices, attempts or ratings. Production application source has no smoke authentication bypass. The build's public Supabase URL and browser endpoint must both be `http://127.0.0.1:54329`. Never deploy this CI build to production.

These browser tests verify rendered application behavior and error states against controlled responses, not live Supabase email/OAuth delivery, a signed-in permanent user's complete workflow, or deployment availability. Actual RLS is verified separately by the transactional database tests. Read PR #17 and its latest completed Quality checks run for final pass/fail results; do not infer success from mergeability.

## Remaining release work

- Locate/verify the real BeanMora deployment and environment. The connected Vercel team previously listed only thesfm; no unrelated project was modified. No production deployment has been validated by these smoke tests.
- Enable leaked-password protection after checking the project's supported Auth configuration/plan; it remains disabled in the latest advisor snapshot. No paid plan changes were made.
- Plan a compatibility-tested relocation of pg_trgm/unaccent from public rather than breaking existing indexes, operators or unqualified function references.
- `integration_connections` intentionally remains closed by RLS with no public policies until its supported integration workflow exists.
- Review the remaining guest-access advisor notices individually: public catalogs and ownership-scoped guest scratch data are intentional, blanket public/guest access removal is not a fix.
- Account deletion still needs a dedicated session-revocation/re-authentication review. Preserving its existing intended authenticated permission is not a claim that all account lifecycle hardening is complete.

References: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view ; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection ; https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp ; https://vite.dev/config/shared-options#oxc .
