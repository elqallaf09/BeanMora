create table public.product_watches (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 roasted_product_id uuid not null references public.roasted_products(id) on delete cascade,
 alert_price_drop boolean not null default true,
 alert_back_in_stock boolean not null default true,
 alert_sold_out boolean not null default false,
 created_at timestamptz not null default now(),
 unique(user_id,roasted_product_id)
);
create index product_watches_user_idx on public.product_watches(user_id,created_at desc);
alter table public.product_watches enable row level security;
create policy "users read own product watches" on public.product_watches for select using (user_id=(select auth.uid()));
create policy "users create own product watches" on public.product_watches for insert with check (user_id=(select auth.uid()) and not (select private.is_guest()));
create policy "users update own product watches" on public.product_watches for update using (user_id=(select auth.uid()) and not (select private.is_guest())) with check (user_id=(select auth.uid()) and not (select private.is_guest()));
create policy "users delete own product watches" on public.product_watches for delete using (user_id=(select auth.uid()));

-- Confirmed catalog events can be expanded into user-facing notification rows by a trusted server/admin process.
-- Keep this view read-only and RLS-aware; it exposes only the current user's matching watches.
create or replace view public.my_product_alert_candidates with (security_invoker=true) as
select w.user_id,w.roasted_product_id,e.id as event_id,e.event_type,e.current_value,e.detected_at
from public.product_watches w join public.catalog_change_events e on e.roasted_product_id=w.roasted_product_id
where e.review_status='confirmed' and (
 (e.event_type='price_dropped' and w.alert_price_drop) or
 (e.event_type='back_in_stock' and w.alert_back_in_stock) or
 (e.event_type='sold_out' and w.alert_sold_out)
);
