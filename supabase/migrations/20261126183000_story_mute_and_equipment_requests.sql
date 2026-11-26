-- A member can publish a video story without sound. The flag only tells
-- clients to keep the player muted; the audio track stays in the file.
alter table public.coffee_stories
  add column if not exists muted boolean not null default false;

-- Members ask for an equipment model the directory lacks. A request never
-- becomes a catalog row by itself: a model is added only after its
-- manufacturer source has been checked.
create table if not exists public.equipment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  category text not null default 'other' check (char_length(category) between 1 and 40),
  reference_url text check (reference_url is null or (char_length(reference_url) <= 500 and reference_url ~* '^https://[^[:space:]]+$')),
  status text not null default 'open' check (status in ('open', 'added', 'declined')),
  created_at timestamptz not null default now()
);
create unique index if not exists equipment_requests_member_name
  on public.equipment_requests (user_id, lower(btrim(name)));
create index if not exists equipment_requests_open
  on public.equipment_requests (created_at) where status = 'open';

alter table public.equipment_requests enable row level security;
revoke all on public.equipment_requests from anon, authenticated;
grant select on public.equipment_requests to authenticated;
grant insert (name, category, reference_url) on public.equipment_requests to authenticated;

create policy "members read their own equipment requests"
  on public.equipment_requests for select to authenticated
  using (user_id = (select auth.uid())
    or (select private.has_role('admin'::text))
    or (select private.has_role('moderator'::text)));
create policy "members request equipment for themselves"
  on public.equipment_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open');

-- Keeps one account from filling the review queue.
create or replace function private.limit_equipment_requests()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.equipment_requests r
      where r.user_id = new.user_id and r.created_at > now() - interval '1 day') >= 10 then
    raise exception 'EQUIPMENT_REQUEST_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.limit_equipment_requests() from public, anon, authenticated;
drop trigger if exists equipment_requests_limit on public.equipment_requests;
create trigger equipment_requests_limit before insert on public.equipment_requests
  for each row execute function private.limit_equipment_requests();
