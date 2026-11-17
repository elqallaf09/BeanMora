-- Service/admin-only operational report. No content or user identifiers.
-- A model call can have billed usage even if outcome != completed.
-- NULL usage and pending calls require reconciliation with OpenAI Usage/Costs;
-- do not replace them with zero or interpret these totals as credit balance.
select
  (created_at at time zone 'Asia/Kuwait')::date as kuwait_day,
  feature,
  operation,
  requested_model,
  model as returned_model,
  organization_id as configured_organization_id,
  project_id as configured_project_id,
  count(*) as model_calls,
  count(distinct request_id) as conversations,
  count(*) filter (where outcome = 'completed') as completed_calls,
  count(*) filter (where outcome = 'pending') as pending_calls,
  count(*) filter (where outcome not in ('completed', 'pending')) as failed_calls,
  count(*) filter (where total_tokens is null) as calls_with_unknown_total_tokens,
  sum(input_tokens) as known_input_tokens,
  sum(cached_input_tokens) as known_cached_input_tokens,
  sum(output_tokens) as known_output_tokens,
  sum(reasoning_tokens) as known_reasoning_tokens,
  sum(total_tokens) as known_total_tokens
from public.coffee_assistant_api_usage
where created_at >= now() - interval '7 days'
group by 1, 2, 3, 4, 5, 6, 7
order by 1 desc, 2, 3, 4;
