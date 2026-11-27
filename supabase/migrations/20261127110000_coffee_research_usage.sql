-- Meter the coffee expert's web-research step in the existing provider ledger.
-- Only widens one CHECK constraint; no rows, policies or grants change.
alter table public.coffee_assistant_api_usage
  drop constraint coffee_assistant_api_usage_operation_check,
  add constraint coffee_assistant_api_usage_operation_check
    check (operation in ('coffee_plan', 'coffee_evidence', 'coffee_label_read', 'coffee_research'));
