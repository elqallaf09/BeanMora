# BeanMora 0.5.14 — audit remediation

Date: 2026-10-07. Android versionCode 24; iOS buildNumber 7.

## Security and account behavior

- Login, signup confirmation and OAuth callbacks share a strict internal-path validator. Executable schemes, protocol-relative URLs, backslashes, controls and encoded redirect tricks are rejected.
- Native sessions move from AsyncStorage into chunked iOS Keychain / Android Keystore-backed Expo SecureStore. Migration commits protected storage before deleting the plaintext session. Refresh/logout are serialized; incomplete protected data fails closed. Web sessions continue to use the browser SDK storage.
- Password reset now sends the correct application callback and opens a bilingual new-password form. Explicit PKCE handling preserves the SDK's verified `PASSWORD_RECOVERY` marker on both native and web-preview callbacks. It does not trust a URL-supplied recovery flag. Failed updates remain retryable; success is shown only after confirmation.
- Privacy and terms are readable in the mobile account screen and at `/ar/privacy`, `/en/privacy`, `/ar/terms`, `/en/terms` on the website.
- Profiles cannot self-verify. Members cannot create or edit official recipes, replace their trusted child records, forge source verification, or undo moderation. Normal personal/community recipes remain editable. Bean submissions re-enter review.
- Post media, recipe images and recipe videos are private buckets. Reads require ownership, administration or an exact link from an eligible visible parent. Clients sign authorized media for 60 seconds and refresh images; signed URLs are never persisted as canonical references. Previously issued signed links can remain usable until expiry.

## Production database migrations

Applied and verified on project `ubvzdglrwkkuaigmkjap`:

1. `20261007115900_audit_trust_and_private_media.sql`
2. `20261007120952_audit_policy_performance.sql`
3. `20261007121431_audit_catalog_completeness.sql`

Rollback-only authorization tests passed after application: `access_hardening.sql`, `audit-trust-and-media.sql`, `account-deletion.sql`. They verify regular ownership, administrative access, forbidden trust escalation, private/hidden/public media and deletion isolation. No real account was deleted.

Performance Advisor: unindexed foreign keys **53 → 0**, repeated per-row auth evaluation **70 → 0**. Identity expressions retain their policy roles, boolean logic and restrictive/permissive behavior. No latency improvement percentage is claimed without a production benchmark. Multiple permissive-policy notices remain a query-optimization review, not proof that authorization failed. Existing indexes were retained rather than deleted based on short-lived usage counters.

Catalog: recipes without steps **4 → 0**; recipes without source associations **2 → 0**. Added concise bilingual, source-checked steps for Crema espresso, Proud Mary V60, Flair 58 and Equator espresso. Restored Market Lane AeroPress and Coffee Collective Kalita source associations. Corrected the 16 g Kalita variant to a 30 g bloom, separating it from the 32 g / 60 g variant.

Primary sources checked 2026-10-07:

- https://crema-coffee.com/pages/espresso-brewing-guide
- https://proudmarycoffee.com/blogs/coffee-talk/the-best-v60-brew-method
- https://flairespresso.com/blogs/news/dialing-in-flair-58-plus-manual-espresso-maker
- https://www.equatorcoffees.com/blogs/guides/espresso
- https://marketlane.com.au/pages/how-to-make-coffee-with-an-aeropress
- https://coffeecollective.dk/pages/brew-guide/kalita-wave

## Dependencies and release checks

Expo is pinned to 57.0.26 with an explicit SecureStore native plugin. Patched `shell-quote` removes the critical audit finding. CI no longer ignores dependency-audit failures or Expo compatibility drift. The audit fails on new moderate/high/critical advisories, unavailable audit data and expired exceptions.

Two upstream tooling advisories still lack a published fixed version at the review date: `braces` GHSA-vfj7-8cjw-p6xm and `node-forge` GHSA-86w9-cpqp-85rv. Their dependency chains account for 16 high-severity affected-package entries. They are **mitigated, not fixed**. Exact exceptions expire on 2026-10-21; never extend them automatically. Keep build inputs trusted and development servers private, and install vendor fixes when available.

The Linux release checks cover TypeScript, lint, unit/behavior suites, Next production build, iOS/Android/web JavaScript exports and isolated browser user journeys. Browser preview is not a signed-device test. Release status must be checked against the final GitHub Actions run and EAS artifact commit.

## Remaining operational requirements

- Enable Supabase leaked-password protection in Auth settings if the project's plan supports it. Verify actual settings, redirect allowlists, SMTP delivery and rate limits through the owner dashboard; do not claim this was enabled by a SQL migration.
- Apple sign-in remains disabled at the provider. Provision its Apple identifiers/key and enable the Supabase provider before claiming native Apple login or App Store acceptance. Never place Apple private keys or service-role keys in application code.
- Validate the signed iOS artifact in TestFlight and the signed Android artifact on devices: clean install, upgrade from the previous plaintext-session release, locked-device recovery, Google/Apple redirects, real reset email and deletion of a disposable test account.
- Android cloud builds depend on the account's remaining EAS quota. No subscription or billing upgrade is part of this release.
- Background ingestion is still not scheduled/deployed. Its existing ingestion-only function requires a trusted scheduler configuration and source-provider credentials where applicable; publication remains a human review decision. Foreground catalog refresh is not a server scheduler.
- Configure an agreed crash/alert destination and restoration drill; local error recovery alone is not remote monitoring or verified disaster recovery.
- Complete source-reviewed Arabic names and missing licensed product images. Numeric titles and proper names must not be replaced with invented translations or fabricated images just to clear a completeness counter.
- The existing public-schema extensions and intentional definer RPC advisories require compatibility/authorization review, not a blind rename or blanket EXECUTE revocation.

## Rollback and compatibility

Keep security database migrations in place while rolling back presentation code. Do not reopen private buckets as an emergency image fix. Old installations may need an upgrade to render uploaded private media; the audited buckets had zero objects before this change. For new account failures, diagnose sign-in/callback settings and sanitized errors without logging tokens or passwords. Do not revert to plaintext native session storage.
