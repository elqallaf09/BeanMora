# BeanMora 0.5.17 — local coffee assistant

The coffee assistant no longer waits for or calls a hosted language-model service. A small, dependency-free TypeScript expert system runs inside the app. It handles supported Arabic/Kuwaiti and English questions through explicit intent rules, conversation state, typed catalog facts and arithmetic. It is not a trained general-purpose LLM and does not self-train from conversations.

## Behavior

- Guests and members can ask follow-up questions, clarify currency, change budgets, compare result numbers, and ask for a published recipe's steps.
- Equipment recommendations require catalog evidence. Missing facts remain unknown. Prices expire after 14 days and FX observations after 7 days; unsupported currencies trigger clarification.
- Arithmetic, guidance and bundled brewer guides run without an inference service or network. Explicit dose and ratio are required unless a selected recipe supplies numeric amounts. Espresso output is beverage yield; moka pot filling is not scaled by ratio.
- Troubleshooting is conditional guidance using the Barista Hustle Coffee/ Espresso Compass. It does not diagnose faults or invent grinder settings. See https://www.baristahustle.com/coffee-compass/ and https://www.baristahustle.com/the-espresso-compass/ (reviewed 2026-10-08).
- Catalog retrieval still uses the existing published-only Supabase RPC. Conversation state remains in account-scoped memory. Raw questions are not sent to a model provider; only structured catalog search parameters leave the device.
- No provider key, model SDK, paid inference, extra infrastructure or paid subscription was added. Existing hosting/data/distribution plans are unchanged. The historical optional Edge Function remains unused by this mobile release.

## Validation

- 23 assistant unit scenarios cover budgets, currency clarification, stale prices, tasting notes, topic changes, references, incomplete evidence, Arabic numerals, calculations and offline guidance.
- Mobile TypeScript and mobile unit checks pass.
- 8 targeted browser scenarios pass at phone/tablet widths, including provider-request assertions and unavailable-catalog recovery.
- iOS, Android and web Metro bundle export succeeds. This verifies compilation, not physical-device operation.

Version 0.5.17 requires a new installed native build. The earlier 0.5.16 IPA/APK does not contain this assistant. EAS remote auto-increment stays enabled for the next build.
