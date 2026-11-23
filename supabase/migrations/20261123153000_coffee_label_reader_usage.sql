-- Meter AI coffee-label reading in the existing provider ledger.
-- Only widens two CHECK constraints; no rows, policies or grants change.
alter table public.coffee_assistant_api_usage
  drop constraint coffee_assistant_api_usage_feature_check,
  add constraint coffee_assistant_api_usage_feature_check
    check (feature in ('coffee_expert', 'coffee_label'));
alter table public.coffee_assistant_api_usage
  drop constraint coffee_assistant_api_usage_operation_check,
  add constraint coffee_assistant_api_usage_operation_check
    check (operation in ('coffee_plan', 'coffee_evidence', 'coffee_label_read'));
