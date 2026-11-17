-- Meter the optional coffee expert separately from the existing per-user quota.
-- No prompt, answer, image, email, user ID, bearer token or API key is retained.
create table public.coffee_assistant_api_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null,
  feature text not null check (feature = 'coffee_expert'),
  operation text not null check (operation in ('coffee_plan', 'coffee_evidence')),
  requested_model text not null,
  model text,
  provider_request_id text,
  organization_id text,
  project_id text,
  input_tokens bigint check (input_tokens >= 0),
  cached_input_tokens bigint check (cached_input_tokens >= 0),
  output_tokens bigint check (output_tokens >= 0),
  reasoning_tokens bigint check (reasoning_tokens >= 0),
  total_tokens bigint check (total_tokens >= 0),
  outcome text not null check (outcome in ('pending', 'completed', 'http_error', 'network_error', 'incomplete', 'refused', 'invalid')),
  http_status integer check (http_status between 100 and 599),
  duration_ms integer not null check (duration_ms >= 0),
  unique (request_id, operation)
);

create index coffee_assistant_api_usage_created_at_idx on public.coffee_assistant_api_usage (created_at desc);
alter table public.coffee_assistant_api_usage enable row level security;
revoke all on public.coffee_assistant_api_usage from public, anon, authenticated, service_role;
grant select, insert, update on public.coffee_assistant_api_usage to service_role;
comment on table public.coffee_assistant_api_usage is 'Service-only OpenAI request usage. Token fields are provider-reported; NULL means unreported, not free. No credit-balance or cash-charge inference.';
