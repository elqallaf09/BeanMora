# Coffee assistant service

This directory preserves the existing BeanMora deployed function (version 2), retrieved while connecting the mobile UI. This mobile release does not redeploy it or change production catalog data. The matching parser/ranker lives in `src/lib/coffee-assistant.ts` and the mobile snapshot; keep shared copies aligned when changing retrieval rules.

Existing deployment dependencies in project `ubvzdglrwkkuaigmkjap`:

- Public-only `assistant_public_documents` projection and `search_coffee_assistant` RPC.
- `catalog_currency_rates` containing dated, sourced currency rates.
- Service-only `consume_coffee_assistant_quota` RPC.
- Supabase URL/anon/service-role environment bindings supplied to Edge Functions.

The public catalog and quota schemas predate this checkout and are not recreated by these source files. Do not treat them as a standalone database installation.

`GET /functions/v1/coffee-assistant` reports availability without user content. The existing gateway configuration is `verify_jwt=false` to support its public GET; POST independently verifies the bearer token with Supabase Auth, rejects anonymous users, and checks the quota before invoking a model. Retain that server-side check on every deployment.

At release verification the status was `conversation_enabled:false`. Secure server configuration requires `OPENAI_API_KEY` and `COFFEE_ASSISTANT_ENABLED=true`; `COFFEE_ASSISTANT_MODEL` is optional. No client or Expo-public variable may contain a provider key. The mobile interface explicitly labels catalog mode until the service reports availability.

Before enabling conversation, verify signed-out/anonymous POST rejection, authenticated quota enforcement, multi-turn references, published-only retrieval, currency clarification and source-grounded responses. Catalog browser tests do not prove a live model conversation. Never log bearer tokens, prompts or provider responses.
