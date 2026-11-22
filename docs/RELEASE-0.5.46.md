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
3. Run `native-0.5.46.yml` from that exact source. It builds a signed production
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

Prepared artifacts and local validation do not establish that a native build,
backend rollout, store upload or public submission has occurred. Record those
outcomes from actual deployment and store receipts.
