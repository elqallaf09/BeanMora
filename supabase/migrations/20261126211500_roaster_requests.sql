-- A roastery owner, or any member, asks for a roastery to be listed. A request
-- never becomes a public roaster row by itself: it is checked against the
-- roastery's own website before anything is published.
create table if not exists public.roaster_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  city text check (city is null or char_length(city) <= 80),
  website_url text check (website_url is null or (char_length(website_url) <= 500 and website_url ~* '^https://[^[:space:]]+$')),
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  is_owner boolean not null default false,
  status text not null default 'open' check (status in ('open', 'added', 'declined')),
  created_at timestamptz not null default now()
);
create unique index if not exists roaster_requests_member_name
  on public.roaster_requests (user_id, lower(btrim(name)));
create index if not exists roaster_requests_open
  on public.roaster_requests (created_at) where status = 'open';

alter table public.roaster_requests enable row level security;
revoke all on public.roaster_requests from anon, authenticated;
grant select on public.roaster_requests to authenticated;
grant insert (name, country, city, website_url, instagram, is_owner) on public.roaster_requests to authenticated;

create policy "members read their own roaster requests"
  on public.roaster_requests for select to authenticated
  using (user_id = (select auth.uid())
    or (select private.has_role('admin'::text))
    or (select private.has_role('moderator'::text)));
create policy "members request a roaster for themselves"
  on public.roaster_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open');

create or replace function private.limit_roaster_requests()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.roaster_requests r
      where r.user_id = new.user_id and r.created_at > now() - interval '1 day') >= 5 then
    raise exception 'ROASTER_REQUEST_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.limit_roaster_requests() from public, anon, authenticated;
drop trigger if exists roaster_requests_limit on public.roaster_requests;
create trigger roaster_requests_limit before insert on public.roaster_requests
  for each row execute function private.limit_roaster_requests();
