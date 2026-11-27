-- Saved Coffee Expert conversations, private to the member who wrote them.
-- A member can read, change and delete only their own rows; nobody else can.
create table public.coffee_expert_conversations (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  -- The same turns the app shows: question, answer, sources and result cards.
  turns jsonb not null check (jsonb_typeof(turns) = 'array' and jsonb_array_length(turns) between 1 and 6
    and octet_length(turns::text) <= 400000),
  -- The consent receipt the answers were produced under, when online.
  consent_generation uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coffee_expert_conversations_owner_idx on public.coffee_expert_conversations (owner_id, updated_at desc);
alter table public.coffee_expert_conversations enable row level security;
revoke all on public.coffee_expert_conversations from public, anon, authenticated;
grant select, insert, update, delete on public.coffee_expert_conversations to authenticated;
create policy coffee_expert_conversations_select on public.coffee_expert_conversations
  for select to authenticated using (owner_id = (select auth.uid()));
create policy coffee_expert_conversations_insert on public.coffee_expert_conversations
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy coffee_expert_conversations_update on public.coffee_expert_conversations
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy coffee_expert_conversations_delete on public.coffee_expert_conversations
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Keep the newest 50 conversations per member and stamp every change.
create function public.coffee_expert_conversations_keep_recent() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.coffee_expert_conversations
  where owner_id = new.owner_id and id in (
    select id from public.coffee_expert_conversations
    where owner_id = new.owner_id order by updated_at desc, id offset 50);
  return null;
end $$;
create function public.coffee_expert_conversations_touch() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  return new;
end $$;
revoke all on function public.coffee_expert_conversations_keep_recent() from public, anon, authenticated;
revoke all on function public.coffee_expert_conversations_touch() from public, anon, authenticated;
create trigger coffee_expert_conversations_keep_recent after insert on public.coffee_expert_conversations
  for each row execute function public.coffee_expert_conversations_keep_recent();
create trigger coffee_expert_conversations_touch before update on public.coffee_expert_conversations
  for each row execute function public.coffee_expert_conversations_touch();
