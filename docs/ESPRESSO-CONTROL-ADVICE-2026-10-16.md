# Espresso control requests

The reported question, `ابي مكينة اسبريسو اقدر اتحكم بالحرارة والضغط`, was treated as a catalog name search. Its feature words yielded no record, so the expert stopped at an empty-result message.

The local expert now recognizes generic espresso-machine requests combining adjustable temperature with pressure or flow control. It explains the distinction between a temperature setting, pump pressure, pressure profiling, a gauge, and manual flow control. It gives two manufacturer-documented specification examples and asks for a budget. Short budget/currency and explanation follow-ups keep the feature context; named models, negations, recipes and other topics remain on their own paths.

Examples are explicitly not verified offers, local stock, or confirmed budget matches. They are not catalog result cards, and no prices are invented. This is reviewed deterministic guidance, not a newly trained or paid generative model.

## Primary sources checked 2026-10-16

- https://www.profitec-espresso.com/en/products/drive — independent PID temperature settings and built-in manual flow control during brewing.
- https://en.decentespresso.com/profiling — pressure/flow stages and target temperature through the app.

## Validation

- 243 focused unit cases across assistant routing, quantities, knowledge and curriculum passed, including 23 new cases for the exact wording, Arabic/English variants, six additional input/output languages, budget/currency follow-ups, unknown models and topic changes.
- Root TypeScript and lint passed; mobile TypeScript, shared-core synchronization and all 3,152 registered message checks passed.
- Fresh Expo web/iOS/Android export succeeded with isolated test configuration.
- Both browser scenarios at 390 and 1280 px passed with catalog requests unavailable; the answer, source-backed examples, budget follow-up, absence of fabricated result cards, zero provider calls and no horizontal overflow were checked. The 390 px rendering was visually reviewed.
- No dependency, database, authentication, production-data, paid-provider, native-binary or physical-device change.

## Integration with PR #91

Merged main `6239f27928ac5e54311e1e3dd337ec73267de585` into this change, preserving the new knowledge, budget-range and published-recipe behavior. Resolved only the shared import and message-inventory overlaps. The integrated source passed all 1,393 Vitest cases, 31 recommendation cases, 37 brew-outcome cases, root lint/typecheck, mobile typecheck/core synchronization, all 3,184 registered message checks, and a fresh web export. All 52 assistant browser scenarios passed, including the two new control-request scenarios and the existing budget and recipe conversations.

The test export is local-only and must not be deployed. This change is prepared for review; production publication is not part of this receipt.
