-- BeanMora — 20: post_saves
--
-- Forward-only migration (does not modify migrations 01-19). The community
-- feed rebuild needs a "save" action on posts (bookmark a brew-result /
-- bean-review / recipe post for later), mirroring the bean_saves /
-- roaster_saves pattern added in migration 19 and the pre-existing
-- recipe_saves from migration 06. Same reasoning as migration 19 applies
-- to guests: this is a private, owner-only bookmark table with no public-
-- visibility branch in its SELECT policy, so no guest-specific restrictive
-- policy is needed (see migration 18's own review notes for recipe_saves).

create table public.post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index post_saves_user_id_idx on public.post_saves (user_id);
create index post_saves_post_id_idx on public.post_saves (post_id);

alter table public.post_saves enable row level security;

create policy "users see their own post saves"
  on public.post_saves for select
  using ((select auth.uid()) = user_id);

create policy "users create their own post saves"
  on public.post_saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users delete their own post saves"
  on public.post_saves for delete
  using ((select auth.uid()) = user_id);
