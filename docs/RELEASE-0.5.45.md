# BeanMora 0.5.45 — Coffee Expert conversation context

## Report and cause

Native build 44 successfully reached OpenAI for the reported grind question. At the time of the screenshots, production recorded two successful conversation POSTs and three completed model operations: two plans and one grounded-answer operation. The follow-up received a generic help response after the first answer asked for the brewing method and grinder model. The exact planner intent is not logged, so the immediate clarification/unrelated return path is an inference from the response and operation counts.

The confirmed protocol gap was that only previous user questions and public result IDs were passed to the planner and answer generator. The assistant's own replies and follow-up questions were absent, including the wording the user wanted explained.

## Changes

The mobile client sends up to six recent exchanges, including bounded assistant replies and follow-up questions. The server accepts these optional fields while retaining compatibility with version 0.5.44's question-only history and API contract 2. Questions remain limited to 1,000 characters, previous replies to 2,000 and follow-ups to 220; the request body is capped at 128 KiB, including JSON escaping.

Prior assistant messages are labeled as untrusted conversation context. They help resolve what the user is asking about, but cannot authorize instructions, invent public catalog records or justify new numerical facts. Public catalog data and reviewed coffee guidance remain the evidence for generated answers.

Coffee-term clarification is handled as a continuation of the relevant coffee topic. The reported question should explain what a brewing method and grinder model mean in simple language, then ask only for information still missing. The shared immersion/percolation lesson now includes a plain brewing-method definition with V60, backed by HARIO's source, so a valid example is present in the actual reviewed evidence instead of failing the numeric guard. Legacy clients benefit from the server correction; version 0.5.45 adds the complete conversation context for subsequent turns. New subjects must not inherit stale coffee advice.

Settings and the privacy policy describe the conversation content sent for online answers. Existing opt-outs, account isolation, authentication, pilot eligibility, quotas and usage recording remain in force. No API key, model, billing setting or allowlist is changed.

## Validation and release

Local validation passed: the root Vitest suite, recommendation and brew-outcome checks, root TypeScript and lint, the full mobile script checks, mobile TypeScript and all 3,276 registered messages in six locale packs. The final focused checks passed 85 backend cases, 43 client transport/policy cases and eight browser scenarios. Coverage includes the reported two-turn conversation, legacy question-only requests, explanation follow-ups, topic switches, malformed/oversized context, worst-case serialized request size, conversation reset and separation of dialogue context from factual evidence. A sourced V60 explanation is accepted while an invented grinder setting remains rejected. Independent review caught and resolved overbroad clarification matching for unrelated subjects. The existing quality and mobile gates must pass on the final source before advancing release branches.

The dedicated iOS workflow builds version 0.5.45 for the existing BeanMora app and submits that exact build to App Store Connect. Web publication uses the existing production release branch. Upload receipts, backend readback and live-provider verification are recorded separately; successful upload does not establish Apple's later processing or TestFlight visibility.
