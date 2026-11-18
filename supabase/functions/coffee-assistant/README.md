# Metered coffee assistant with local fallback

The signed-in coffee expert checks `api_contract: 2` and `conversation_enabled: true` before using AI. The server continues to enforce its pilot allowlist. An eligible account uses AI first unless the member has chosen the local guide or a previous credit/usage-limit failure has paused it. Preferences are isolated by project and account and survive reopening the app. Older endpoints cannot enable this path. Availability checks never invoke OpenAI.

The conversational path covers coffee knowledge, brewing technique, general taste troubleshooting and catalog comparisons in all eight app languages. A planner chooses public catalog references or reviewed lesson IDs; one further metered call writes a contextual answer using that evidence. Guidance uses the same reviewed curriculum and basics as the local guide. Run `node scripts/sync-coffee-guidance.mjs` after editing those sources; the root test gate checks that server copies match. The UI shows the answer mode and only the server-selected citations for generated prose. Source and number checks reject unsupported IDs, links and figures, but do not constitute complete semantic verification of generated prose.

Exact quantities and coaching with measured dose/yield/time remain deterministic. Advanced catalog filters (iced/hot, lower budget, seller, tasting-note and alternative recipes) retain the richer local path. The offline draft classifies the question before any catalog download; it is not sent as model evidence. Remote requests contain only the original question, requested language and recent user questions/public UUID references, never prior generated answers or client facts.

`credit_balance_exhausted` pauses AI and returns the local guide until the member explicitly enables it again. `insufficient_quota` and explicit organization/project caps use the separate server code `USAGE_LIMIT_REACHED`, with an honest balance-or-allowance notice. A generic HTTP 429 uses a temporary cooldown; network/service failures use a short cooldown. There are no automatic paid retries. Switching accounts or cancelling a question prevents an old response from entering the current conversation. The local guide remains available while AI is paused.

A source commit does not activate the service or the subscription credit benefit. The existing additive usage migration must be present before this function is deployed. Configure server secrets and verify an authenticated pilot separately. Mobile/web clients need the version-2 client bundle; a web release does not update an installed native iPhone app.

Verification on 2026-11-17: migration `20261117153909` was applied to `ubvzdglrwkkuaigmkjap`; RLS and service-only SELECT/INSERT/UPDATE were checked, with client reads/writes and service deletion denied. The new provider/config/transport tests and existing assistant regression tests passed (262 tests total), as did web/mobile type checking. These checks made no live OpenAI request and do not confirm API credit activation.

Existing deployment dependencies in project `ubvzdglrwkkuaigmkjap`:

- Public-only `assistant_public_documents` projection and `search_coffee_assistant` RPC.
- `catalog_currency_rates` containing dated, sourced currency rates.
- Service-only `consume_coffee_assistant_quota` RPC (retained unchanged).
- Service-only `coffee_assistant_api_usage` ledger from `20261117153909_coffee_assistant_api_usage.sql`.
- Supabase URL/anon/service-role environment bindings supplied to Edge Functions.

The public catalog and quota schemas predate this checkout and are not recreated by these source files. Do not treat them as a standalone database installation.

`GET /functions/v1/coffee-assistant` reports availability without user content. The existing gateway configuration is `verify_jwt=false` to support its public GET; POST independently verifies the bearer token with Supabase Auth, rejects anonymous users, and checks the quota before invoking a model. Retain that server-side check on every deployment.

## Server configuration

| Variable | Purpose |
| --- | --- |
| `COFFEE_ASSISTANT_ENABLED` | Set `true` only after the ledger and API organization are verified. Other values leave the service disabled. |
| `COFFEE_ASSISTANT_OPENAI_API_KEY` | Dedicated BeanMora project key. Falls back to `OPENAI_API_KEY` only when the dedicated variable is absent. |
| `COFFEE_ASSISTANT_OPENAI_ORGANIZATION_ID` | Optional organization header; absent falls back to `OPENAI_ORGANIZATION_ID`. |
| `COFFEE_ASSISTANT_OPENAI_PROJECT_ID` | Optional project header; absent falls back to `OPENAI_PROJECT_ID`. Use the BeanMora project within the credited organization. |
| `COFFEE_ASSISTANT_MODEL` | Required supported Responses model with structured output support. No retired default is selected automatically. |
| `COFFEE_ASSISTANT_REASONING_EFFORT` | Optional `none`, `low`, or `medium`, only for a model supporting this parameter. |
| `COFFEE_ASSISTANT_PILOT_USER_IDS` | Optional comma-separated Supabase Auth user UUIDs. When present, GET and POST enforce membership server-side. Invalid lists disable the service. |

An explicitly empty or invalid dedicated credential/project disables readiness instead of silently falling back to a different account. No provider key belongs in an Expo-public environment variable, client bundle, Git commit or response. The public key and the signed-in member's token authenticate only to Supabase. OpenAI keys remain in Edge Function secrets.

As a candidate for the bounded pilot, [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) supports Responses, structured outputs and `reasoning.effort: none` according to the documentation reviewed on 2026-11-17. Verify availability in the selected API project and a grounded conversation before setting these values. The code does not change live model settings.

The [ChatGPT API credit benefit](https://developers.openai.com/api/docs/guides/chatgpt-api-credits) must be activated for the organization receiving these API requests. A configured key or successful request does **not** prove that the promotional credit balance was charged. Check the organization billing/credit grant separately. This integration never enables paid Auto Recharge.

OpenAI consumes included credits before purchased credits. Exhaustion of the included grant alone does not produce an error while purchased balance remains. The fallback therefore reacts to provider balance/usage-limit failures, not to an independently measured remaining $100 grant. For an included-credit-only pilot, verify the organization balances and enforced spending limits before activation. Do not promise that an HTTP-error fallback enforces a promotional-dollar cap.

## Usage measurement

Every model invocation reserves a `pending` ledger row **before** sending a paid request. Reservation failure prevents the call. The final provider outcome, HTTP status, requested/returned model, request ID and provider-reported input/cached/output/reasoning/total token counts are then persisted and awaited. Incomplete, refused and invalid outputs are recorded too, since they may consume tokens. Missing counts stay `NULL`, not zero. A process terminated before settlement leaves an observable pending row. The two possible operations remain `coffee_plan` and `coffee_evidence`; the second may contain grounded catalog prose or brewing guidance. No new migration or third paid call is introduced.

The ledger has RLS enabled, no client grants and no client policies. Only `service_role` receives SELECT/INSERT/UPDATE. It contains no prompt, answer, photo, user ID, email, token or secret. If settlement fails, the request fails and logs only the non-content usage metadata for reconciliation; it does not continue silently to another model call.

Use `supabase/reports/coffee_assistant_api_usage.sql` from an authorized server/admin SQL session to compare model calls, conversations, known tokens and pending/unknown events by Kuwait day, operation and configured project. `coffee_expert` is recorded separately from scanning (which this change does not route through OpenAI). Token totals are not dollar charges, a hard dollar cap or the remaining subscription credit balance. Reconcile spend in OpenAI's project Usage/Costs reports before widening the pilot. The existing per-user quota remains a request limit, not a dollar budget.

Before enabling conversation, verify signed-out/anonymous POST rejection, pilot authorization, authenticated quota enforcement, metering reservation/settlement, multi-turn references, published-only retrieval, currency clarification and source-grounded responses. Unit tests use mocked providers and do not prove live API access or grant activation. Never log bearer tokens, prompts or provider response text.
