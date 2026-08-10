-- BeanMora — 21: user_bean_inventory archive support
--
-- Forward-only migration (does not modify migrations 01-20). The My Beans
-- rebuild needs a real "archive this bag" action distinct from permanently
-- deleting the row (so brew history tied to it via brew_logs.bean_id stays
-- intact) — user_bean_inventory (migration 16) had no such flag. Additive
-- only: existing rows all get archived_at = null (still active), and no
-- existing column, constraint, or policy is touched.

alter table public.user_bean_inventory
  add column archived_at timestamptz;

create index user_bean_inventory_archived_at_idx on public.user_bean_inventory (archived_at);
