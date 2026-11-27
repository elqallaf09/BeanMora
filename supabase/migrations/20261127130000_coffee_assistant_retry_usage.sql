-- Meter a second attempt at a coffee expert step under its own operation name.
-- Only widens one CHECK constraint; no rows, policies or grants change.
alter table public.coffee_assistant_api_usage
  drop constraint coffee_assistant_api_usage_operation_check,
  add constraint coffee_assistant_api_usage_operation_check
    check (operation in ('coffee_plan', 'coffee_plan_retry', 'coffee_evidence', 'coffee_evidence_retry', 'coffee_label_read', 'coffee_research'));
