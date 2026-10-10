-- Forward repair for catalog migrations whose historical versions were reused.
-- No backfill, media deletion or user message is performed by this migration.
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
create index product_watches_owner_created_idx on public.product_watches(user_id,created_at desc);
create index product_watches_product_idx on public.product_watches(roasted_product_id);
alter table public.product_watches enable row level security;
revoke all on public.product_watches from anon,authenticated;
grant select,insert,update,delete on public.product_watches to authenticated;
create policy "members read own product watches" on public.product_watches for select to authenticated
  using(user_id=(select auth.uid()));
create policy "members create own product watches" on public.product_watches for insert to authenticated
  with check(user_id=(select auth.uid()) and not (select private.is_guest())
    and exists(select 1 from public.roasted_products p where p.id=roasted_product_id and not p.requires_review));
create policy "members update own product watches" on public.product_watches for update to authenticated
  using(user_id=(select auth.uid()) and not (select private.is_guest()))
  with check(user_id=(select auth.uid()) and not (select private.is_guest())
    and exists(select 1 from public.roasted_products p where p.id=roasted_product_id and not p.requires_review));
create policy "members delete own product watches" on public.product_watches for delete to authenticated
  using(user_id=(select auth.uid()));

create table public.catalog_change_events (
  id uuid primary key default gen_random_uuid(),
  roasted_product_id uuid not null references public.roasted_products(id) on delete cascade,
  event_type text not null check(event_type in ('price_changed','price_dropped','price_increased','availability_changed','back_in_stock','sold_out')),
  previous_value jsonb,
  current_value jsonb not null,
  evidence_url text,
  detected_at timestamptz not null default now(),
  review_status text not null default 'pending' check(review_status in ('pending','confirmed','dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);
create index catalog_change_events_product_idx on public.catalog_change_events(roasted_product_id,detected_at desc);
create index catalog_change_events_pending_idx on public.catalog_change_events(review_status,detected_at desc);
create index catalog_change_events_reviewer_idx on public.catalog_change_events(reviewed_by) where reviewed_by is not null;
alter table public.catalog_change_events enable row level security;
revoke all on public.catalog_change_events from anon,authenticated;
grant select,insert,update,delete on public.catalog_change_events to authenticated;
create policy "reviewers and relevant members read catalog events" on public.catalog_change_events for select to authenticated using(
  (select private.has_role('admin')) or (select private.has_role('moderator'))
  or (review_status='confirmed' and exists(select 1 from public.product_watches w
    where w.roasted_product_id=catalog_change_events.roasted_product_id and w.user_id=(select auth.uid())))
);
create policy "admins insert catalog events" on public.catalog_change_events for insert to authenticated
  with check((select private.has_role('admin')));
create policy "admins update catalog events" on public.catalog_change_events for update to authenticated
  using((select private.has_role('admin'))) with check((select private.has_role('admin')));
create policy "admins delete catalog events" on public.catalog_change_events for delete to authenticated
  using((select private.has_role('admin')));

create function private.detect_product_price_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare prev public.product_prices%rowtype; kind text;
begin
  perform 1 from public.roasted_products where id=new.roasted_product_id for update;
  select * into prev from public.product_prices where roasted_product_id=new.roasted_product_id
    and id<>new.id and currency=new.currency and recorded_at<=new.recorded_at order by recorded_at desc,id desc limit 1;
  if prev.id is null or prev.price=new.price then return new; end if;
  kind:=case when new.price<prev.price then 'price_dropped' else 'price_increased' end;
  insert into public.catalog_change_events(roasted_product_id,event_type,previous_value,current_value,evidence_url)
  values(new.roasted_product_id,kind,jsonb_build_object('price',prev.price,'currency',prev.currency,'recorded_at',prev.recorded_at),
    jsonb_build_object('price',new.price,'currency',new.currency,'recorded_at',new.recorded_at),new.source_url);
  return new;
end $$;
revoke all on function private.detect_product_price_change() from public,anon,authenticated;
create trigger product_price_change_event after insert on public.product_prices for each row execute function private.detect_product_price_change();

create function private.detect_product_availability_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare prev public.product_availability%rowtype; kind text;
begin
  perform 1 from public.roasted_products where id=new.roasted_product_id for update;
  select * into prev from public.product_availability where roasted_product_id=new.roasted_product_id
    and id<>new.id and recorded_at<=new.recorded_at order by recorded_at desc,id desc limit 1;
  if prev.id is null or prev.status=new.status then return new; end if;
  kind:=case when new.status='available' and prev.status in ('sold_out','low_stock') then 'back_in_stock'
    when new.status='sold_out' then 'sold_out' else 'availability_changed' end;
  insert into public.catalog_change_events(roasted_product_id,event_type,previous_value,current_value,evidence_url)
  values(new.roasted_product_id,kind,jsonb_build_object('status',prev.status,'recorded_at',prev.recorded_at),
    jsonb_build_object('status',new.status,'recorded_at',new.recorded_at),new.source_url);
  return new;
end $$;
revoke all on function private.detect_product_availability_change() from public,anon,authenticated;
create trigger product_availability_change_event after insert on public.product_availability for each row execute function private.detect_product_availability_change();

create view public.roasted_product_freshness with(security_invoker=true) as
select p.id as roasted_product_id,p.last_verified_at,
  case when p.last_verified_at is null then 'unverified'
    when p.last_verified_at>=now()-interval '30 days' then 'fresh'
    when p.last_verified_at>=now()-interval '90 days' then 'aging' else 'stale' end as freshness_status,
  case when p.last_verified_at is null then null else floor(extract(epoch from(now()-p.last_verified_at))/86400)::int end as days_since_verification,
  (p.last_verified_at is null or p.last_verified_at<now()-interval '90 days') as needs_reverification
from public.roasted_products p where not p.requires_review;
grant select on public.roasted_product_freshness to anon,authenticated;

-- Preserve every currently supported notification type, including story moderation.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check(type in(
  'like','comment','follow','recipe_save','reply','new_recipe_from_followed','verification_approved',
  'xbloom_sync_status','saved_recipe_updated','story_warning','community_suspended',
  'product_price_drop','product_back_in_stock','product_sold_out'));
alter table public.notifications drop constraint notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check check(entity_type in(
  'recipe','post','comment','profile','xbloom_sync_job','story','roasted_product'));

create table public.product_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.catalog_change_events(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id,event_id)
);
create index product_alert_deliveries_event_idx on public.product_alert_deliveries(event_id);
create index product_alert_deliveries_notification_idx on public.product_alert_deliveries(notification_id) where notification_id is not null;
alter table public.product_alert_deliveries enable row level security;
revoke all on public.product_alert_deliveries from anon,authenticated;
grant select on public.product_alert_deliveries to authenticated;
create policy "members read own alert deliveries" on public.product_alert_deliveries for select to authenticated
  using(user_id=(select auth.uid()));

create function private.deliver_confirmed_product_alerts() returns trigger
language plpgsql security definer set search_path='' as $$
declare w record; delivery uuid; notification uuid; kind text;
begin
  if new.review_status<>'confirmed' or old.review_status='confirmed' then return new; end if;
  kind:=case new.event_type when 'price_dropped' then 'product_price_drop'
    when 'back_in_stock' then 'product_back_in_stock' when 'sold_out' then 'product_sold_out' end;
  if kind is null then return new; end if;
  for w in select * from public.product_watches where roasted_product_id=new.roasted_product_id and
    ((new.event_type='price_dropped' and alert_price_drop) or (new.event_type='back_in_stock' and alert_back_in_stock)
      or (new.event_type='sold_out' and alert_sold_out))
  loop
    delivery:=null;
    insert into public.product_alert_deliveries(user_id,event_id) values(w.user_id,new.id)
      on conflict(user_id,event_id) do nothing returning id into delivery;
    if delivery is null then continue; end if;
    insert into public.notifications(user_id,type,entity_type,entity_id)
      values(w.user_id,kind,'roasted_product',new.roasted_product_id) returning id into notification;
    update public.product_alert_deliveries set notification_id=notification where id=delivery;
  end loop;
  return new;
end $$;
revoke all on function private.deliver_confirmed_product_alerts() from public,anon,authenticated;
create trigger deliver_product_alerts_after_confirmation after update of review_status on public.catalog_change_events
  for each row execute function private.deliver_confirmed_product_alerts();

create view public.my_product_alert_candidates with(security_invoker=true) as
select w.user_id,w.roasted_product_id,e.id as event_id,e.event_type,e.current_value,e.detected_at
from public.product_watches w join public.catalog_change_events e on e.roasted_product_id=w.roasted_product_id
where e.review_status='confirmed' and(
  (e.event_type='price_dropped' and w.alert_price_drop) or (e.event_type='back_in_stock' and w.alert_back_in_stock)
  or (e.event_type='sold_out' and w.alert_sold_out));
revoke all on public.my_product_alert_candidates from anon,authenticated;
grant select on public.my_product_alert_candidates to authenticated;

-- An INSERT is a new complaint, never a forged moderation decision.
create policy "new reports are owned open and unreviewed" on public.reports as restrictive for insert to authenticated
with check(reporter_id=(select auth.uid()) and status='open' and reviewed_by is null and reviewed_at is null
  and not (select private.is_guest()));
notify pgrst,'reload schema';
