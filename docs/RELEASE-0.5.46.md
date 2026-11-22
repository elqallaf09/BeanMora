# BeanMora 0.5.46 — permission before online Coffee Expert answers

## Source and behavior

This candidate builds on the consent change in PR #124. The coffee guide answers
the first question. A separate disclosure names OpenAI, explains which subsequent
messages are shared and offers an explicit allow or guide-only choice. Existing
preferences do not manufacture permission. Account-scoped server receipts and
generations reject missing, withdrawn, cross-account and stale permission.

The Node test suite imports the actual Edge Function handler. Its pinned Deno
Supabase type import is bridged to the same locked npm version so the full root
type check can verify the handler instead of excluding the integration test.

Version 0.5.46 changes the marketing version only. EAS remains responsible for
remote iOS build numbers and Android version codes. Existing project identifiers,
signing credentials and store application records are retained.

## Compatibility and deployment sequence

| Client | Backend | Expected result |
| --- | --- | --- |
| Existing API 2 client | New API 3 backend | Coffee guide; no conversation POST |
| New API 3 client | Existing API 2 backend | Coffee guide; online permission unavailable |
| New API 3 client | New API 3, no choice | Coffee guide and disclosure |
| New API 3 client | New API 3, permission granted | Subsequent questions may use OpenAI |
| New API 3 client | New API 3, permission withdrawn | Coffee guide; stale requests rejected |

The registry migration is additive and starts empty. Apply it before the new
handler, verify RLS and the service-only grants, and verify the actual deployed
handler before releasing clients. Existing builds deliberately remain usable
through the guide after the backend change. Updating or rolling back an app must
not remove the server consent requirement or reinterpret an old preference as
permission. No provider key, billing setting, model or pilot eligibility changes
are part of this release.

`supabase/tests/coffee_assistant_consent.sql` exercises the migrated table with
transaction-only identities. It checks client denial, the required service
grants, duplicate and stale decisions, account separation, and deletion cascade;
every fixture is rolled back. Handler and client tests cover the protocol and
the boundary before an external model request.

## Build and distribution

1. Require successful Quality checks and Expo mobile checks on the final source.
2. Complete database/handler verification and review the compatibility matrix.
3. Run `native-0.5.46.yml` from that exact source, manually or by advancing the
   dedicated `release/beanmora-native-0.5.46` branch once after verification.
   Before either trigger, check Expo for an existing or pending matching build.
   The workflow builds a signed production
   iOS candidate and Android AAB with app identity, dependency, type and script
   checks. It does not choose a public store release or upload by itself.
4. Use the existing `native-navigation.yml` workflow for source-matched native
   navigation checks. The workflow covers guest navigation; it is not evidence
   that signed-in consent was tested on a physical device.
5. Upload the verified iOS build ID with `submit-ios.yml`, then confirm Apple
   processing and TestFlight availability. Check the exact candidate's consent
   flow, account switching and withdrawal on iPhone/iPad before public review.
6. Upload the matching Android AAB to the existing Play application and current
   testing track. Record the real store receipt and version code. App Store
   review and Google production eligibility remain separate store operations.

## App Review login notes

The observed Apple rejection under guideline 4.8 referred to the earlier build
39, tested on an iPad Air 11-inch (M3). The selected candidate includes the
already-merged iOS provider fix from PR #122 and its Node test-runner correction
from PR #123. iOS offers first-party email sign-in and guest browsing; it does
not offer Google while an equivalent enabled sign-in provider is unavailable.
The provider state is checked again before starting OAuth. Android and web keep
their independently configured sign-in providers.

Suggested review explanation, to use only with this matching candidate:

> The iOS login flow has been revised. Users can browse the public coffee catalog
> as a guest or sign in directly with email. Google sign-in is not offered on iOS
> unless an equivalent enabled provider is available. Account creation, password
> recovery and account deletion remain accessible. Coffee Expert first uses the
> coffee guide and asks for permission, naming OpenAI and describing the data
> shared, before online answers. Permission can be withdrawn in Settings.

## Verified release preparation (22 November 2026)

Both required GitHub workflows passed on candidate `6290977f6985c760fc884a230f53d1cab805d231`,
tree `71c957d3139a5fb0edf0afb73c331024a6f8a53a`. PR #125 merged into PR #124 as
`d718a41221f0c22dba83cc2a12bc81625714b91f` with the identical tree. Local checks
passed 1,633 root Vitest tests, recommendation/outcome scripts, mobile type/script
and locale checks, ten consent UI browser checks, and the transaction-only SQL
test on PostgreSQL WASM.

The additive registry migration was applied as `20261122133130`; its repository
filename matches that recorded version. Live readback confirmed RLS, no anon or
authenticated role access, only SELECT/INSERT/UPDATE for the service role, and
zero consent rows or residual test identities. The attempted live transaction
test was interrupted without a result and is not reported as passed. The live
handler remains API 2 pending coordinated native-candidate delivery.

Prepared artifacts and local validation do not establish that a native build,
backend rollout, store upload or public submission has occurred. Record those
outcomes from actual deployment and store receipts.
