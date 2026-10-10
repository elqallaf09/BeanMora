-- Extend the existing notification model for confirmed product-watch events.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
 ('like','comment','follow','recipe_save','reply','new_recipe_from_followed','verification_approved','xbloom_sync_status','saved_recipe_updated',
  'product_price_drop','product_back_in_stock','product_sold_out'));
alter table public.notifications drop constraint if exists notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check check (entity_type in ('recipe','post','comment','profile','xbloom_sync_job','roasted_product'));

create table public.product_alert_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_id uuid not null references public.catalog_change_events(id) on delete cascade,
 notification_id uuid references public.notifications(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(user_id,event_id)
);
alter table public.product_alert_deliveries enable row level security;
create policy "users read own alert deliveries" on public.product_alert_deliveries for select using (user_id=(select auth.uid()));

create or replace function private.deliver_confirmed_product_alerts() returns trigger language plpgsql security definer set search_path='' as $$
declare w record; nid uuid; ntype text;
begin
 if new.review_status<>'confirmed' or old.review_status='confirmed' then return new; end if;
 ntype:=case new.event_type when 'price_dropped' then 'product_price_drop' when 'back_in_stock' then 'product_back_in_stock' when 'sold_out' then 'product_sold_out' else null end;
 if ntype is null then return new; end if;
 for w in select * from public.product_watches where roasted_product_id=new.roasted_product_id and
   ((new.event_type='price_dropped' and alert_price_drop) or (new.event_type='back_in_stock' and alert_back_in_stock) or (new.event_type='sold_out' and alert_sold_out))
 loop
   if not exists(select 1 from public.product_alert_deliveries d where d.user_id=w.user_id and d.event_id=new.id) then
     insert into public.notifications(user_id,type,entity_type,entity_id) values(w.user_id,ntype,'roasted_product',new.roasted_product_id) returning id into nid;
     insert into public.product_alert_deliveries(user_id,event_id,notification_id) values(w.user_id,new.id,nid);
   end if;
 end loop;
 return new;
end $$;
revoke all on function private.deliver_confirmed_product_alerts() from public;
create trigger deliver_product_alerts_after_confirmation after update of review_status on public.catalog_change_events for each row execute function private.deliver_confirmed_product_alerts();
