# BeanMora 0.5.44 — automatic Coffee Expert

## Problem and changes

The installed Coffee Expert displayed a manual AI activation button and a connection-error notice while the production service was disabled. The server returned HTTP 200 with `conversation_enabled: false`; logs at the reported time contained availability GETs and no conversation POST. This was not evidence of exhausted OpenAI credit.

This release removes the activation control. Signed-in members automatically check AI availability when submitting a suitable question. Existing privacy opt-outs remain available under Settings → Coffee expert → Online answers. Failed availability and credit checks recover after bounded cooldowns on a later submitted question. No background paid retries are introduced, and account changes, cancellation and privacy changes during readiness prevent a subsequent question POST.

The reported Arabic strawberry-bean question now searches for coffee with the strawberry note. Flavor phrasing is excluded from search terms; explicit notes remain binding across planning and require published facts for a full match. Ordinary flavor and equipment-budget questions reach AI. Exact calculations, measured brew coaching and advanced recipe filters preserve their deterministic paths.

Successful catalog-only results no longer produce a false connection-error notice. Local answers retain their local provenance. The current cloud integration is OpenAI; the fallback is BeanMora's local coffee guide, not a second cloud vendor.

## Validation

- Root suite: 1,545 Vitest cases, 31 recommendation checks and 37 brew-outcome checks passed.
- Root TypeScript, ESLint and whitespace checks passed.
- Mobile TypeScript, shared-core synchronization and all 3,276 registered locale entries passed.
- Six focused browser cases passed, covering automatic answers, the reported Arabic question, disabled-service recovery, credit cooldown and reload, catalog fallback, privacy Settings and opt-out while readiness is pending.
- Required GitHub quality and mobile workflows must pass on the final source before advancing release branches.

Browser fixtures do not establish live OpenAI access or physical-device behavior. Record backend deployment, real authenticated conversation verification and actual build/upload receipts separately.

## Delivery

The iOS workflow `.eas/workflows/ios-0.5.44.yml` builds the existing BeanMora app and uploads that exact build to App Store Connect using existing credentials. It enforces the BeanMora project identity, public configuration, security checks and version 0.5.44, with remote build-number incrementing. Trigger its dedicated release branch only after final source checks pass.

The web workflow remains the existing dedicated production release path. A web publication does not change an installed TestFlight app. Backend activation and OpenAI billing/credit verification are operationally separate from the source release; this change does not modify credentials or billing.
