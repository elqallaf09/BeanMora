-- Product catalog change events are derived from append-only price/availability evidence.
-- No user notification is sent by this migration; events first enter an admin-reviewable queue.
create table public.catalog_change_events (
  id uuid primary key default gen_random_uuid(),
  roasted_product_id uuid not null references public.roasted_products(id) on delete cascade,
  event_type text not null check (event_type in ('price_changed','price_dropped','price_increased','availability_changed','back_in_stock','sold_out')),
  previous_value jsonb,
  current_value jsonb not null,
  evidence_url text,
  detected_at timestamptz not null default now(),
  review_status text not null default 'pending' check (review_status in ('pending','confirmed','dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);
create index catalog_change_events_product_idx on public.catalog_change_events(roasted_product_id,detected_at desc);
create index catalog_change_events_pending_idx on public.catalog_change_events(review_status,detected_at desc);
alter table public.catalog_change_events enable row level security;
create policy "catalog changes are admin readable" on public.catalog_change_events for select using ((select private.has_role('admin')) or (select private.has_role('moderator')));
create policy "catalog changes are admin managed" on public.catalog_change_events for all using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));

create or replace function private.detect_product_price_change() returns trigger language plpgsql security definer set search_path='' as $$
declare prev public.product_prices%rowtype; kind text;
begin
 select * into prev from public.product_prices where roasted_product_id=new.roasted_product_id and id<>new.id and currency=new.currency order by recorded_at desc limit 1;
 if prev.id is null or prev.price=new.price then return new; end if;
 kind:=case when new.price<prev.price then 'price_dropped' when new.price>prev.price then 'price_increased' else 'price_changed' end;
 insert into public.catalog_change_events(roasted_product_id,event_type,previous_value,current_value,evidence_url)
 values(new.roasted_product_id,kind,jsonb_build_object('price',prev.price,'currency',prev.currency,'recorded_at',prev.recorded_at),jsonb_build_object('price',new.price,'currency',new.currency,'recorded_at',new.recorded_at),new.source_url);
 return new;
end $$;
revoke all on function private.detect_product_price_change() from public;

create or replace function private.detect_product_availability_change() returns trigger language plpgsql security definer set search_path='' as $$
declare prev public.product_availability%rowtype; kind text;
begin
 select * into prev from public.product_availability where roasted_product_id=new.roasted_product_id and id<>new.id order by recorded_at desc limit 1;
 if prev.id is null or prev.status=new.status then return new; end if;
 kind:=case when new.status='available' and prev.status in ('sold_out','low_stock') then 'back_in_stock' when new.status='sold_out' then 'sold_out' else 'availability_changed' end;
 insert into public.catalog_change_events(roasted_product_id,event_type,previous_value,current_value,evidence_url)
 values(new.roasted_product_id,kind,jsonb_build_object('status',prev.status,'recorded_at',prev.recorded_at),jsonb_build_object('status',new.status,'recorded_at',new.recorded_at),new.source_url);
 return new;
end $$;
revoke all on function private.detect_product_availability_change() from public;

create trigger product_price_change_event after insert on public.product_prices for each row execute function private.detect_product_price_change();
create trigger product_availability_change_event after insert on public.product_availability for each row execute function private.detect_product_availability_change();
