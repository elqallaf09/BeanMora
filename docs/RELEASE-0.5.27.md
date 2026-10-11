# BeanMora 0.5.27 — closest xBloom recipe for a coffee

Opening a coffee with no xBloom recipe now selects up to three similar public
profiles from the complete library. Verified coffee associations take priority,
including recipes outside the initial catalog page. Studio and Original can be
selected separately. A borrowed recipe retains its original title, coffee,
publisher links and measured settings. The notice explains shared tasting notes,
flavor families, origin, processing and roast only where those facts are present.
Ranking weights are not confidence percentages. Without comparable published
facts, the screen shows an explicit empty state with a library link.

Publisher notes written as `Tasting notes (per Roaster): …` or
`الإيحاءات بحسب المحمصة: …` are retained even when the coffee lacks a complete
sensory personality. Notes do not supply acidity/body/intensity scores.

Only matched IDs and their compatible profiles are fetched after ranking; the
device does not download the full xBloom library. Requests are cancellable and
errors retain a retry action. Comparison uses the canonical bean/product ID and
invoker RLS. Private recipes and unpublished/unreviewed target beans are excluded.
Source water in milliliters remains milliliters, including source-only imports.

Borrowed brews save against the selected coffee as standalone modified brews.
They do not contribute an attempt for the source recipe's original coffee.
The selected product context must agree with that product's real legacy bean;
existing authentication, RLS and idempotency checks remain enforced. Automatic
source-recipe community sharing is unavailable for these standalone brews.

## Validation

- Mobile TypeScript, shared-core parity and mobile behavioral checks pass.
- Seven new behavioral tests cover source-note parsing, bound RPC parameters,
  provenance, selected-coffee logging, source units and explicit lookup failures.
- Five browser scenarios cover a 320 px layout, device selection, exact recipes,
  missing evidence, retry and language changes inside recipe detail.
- Transactional database fixtures exercise anon access, exact-first selection,
  origin/process/roast facts, model isolation and private/unpublished exclusions.
  Authenticated fixtures verify standalone product logging, canonical bean
  validation, repeated-request idempotency and absence of source-recipe evidence.
- The real Kurasu Frinsa coffee selects Sindoro for Studio, based on shared tea,
  fruity family and Indonesian origin. Candidate process/roast are absent and
  are not reported as matches. Anonymous database comparison measured 1.20 s
  over 3,312 public xBloom recipes; this excludes network/detail-download time.

Expo exports validate bundling, and browser scenarios validate React Native Web.
Installed APK/TestFlight copies need a new signed build; these checks do not
constitute a physical-device test. EAS retains remote build counters.
