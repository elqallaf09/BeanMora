-- Make the existing incorrect-info link usable for beans, while keeping
-- correction submissions private and every moderation decision server-gated.
set local lock_timeout = '3s';
set local statement_timeout = '30s';

alter table public.data_correction_requests
  drop constraint data_correction_requests_entity_type_check;
alter table public.data_correction_requests
  add constraint data_correction_requests_entity_type_check
  check (entity_type in ('roaster', 'coffee_lot', 'roasted_product', 'recipe', 'bean'));

alter table public.data_correction_requests
  add constraint bean_correction_text_limits check (
    entity_type <> 'bean' or (
      reason is not null and length(btrim(reason)) between 10 and 2000
      and (suggested_value is null or length(suggested_value) <= 1000)
    )
  );

drop policy "authenticated users file correction requests" on public.data_correction_requests;
create policy "authenticated users file correction requests"
  on public.data_correction_requests for insert to authenticated
  with check (
    (select auth.uid()) = reported_by
    and status = 'open' and reviewed_by is null and reviewed_at is null
    and (entity_type <> 'bean' or exists (
      select 1 from public.beans b where b.id = entity_id
    ))
  );
