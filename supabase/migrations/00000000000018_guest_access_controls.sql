-- BeanMora — 18: guest (anonymous) access controls.
--
-- Forward-only migration. Does not modify migrations 01-17 — Supabase
-- anonymous sign-ins (supabase.auth.signInAnonymously()) issue a session
-- under the same `authenticated` Postgres role as a permanent account, so
-- every existing permissive policy that says "to authenticated" already
-- matches guests too. This migration adds narrowly-scoped RESTRICTIVE
-- policies (ANDed against all permissive policies for the same command,
-- per Postgres RLS semantics) so a guest session can never publish public
-- content, no matter how a future permissive policy is written.
--
-- Guests keep everything not explicitly listed below: browsing public
-- roasters/products/recipes, the V60/espresso calculators, the guided brew
-- interface, and — deliberately — inserting/updating their OWN draft or
-- private recipes (never public/unlisted). That last one is intentional:
-- it is the "temporary session-owned preferences where safe" allowance
-- from the product spec, and is exactly why §6's "save your account
-- before losing guest data" banner exists — a guest's private drafts are
-- real rows tied to a real (if temporary) auth.uid(), not a UI-only stub.

-- ---------------------------------------------------------------------- --
-- 1. Guest-detection helper, mirroring the private.has_role() pattern from
--    migration 02. auth.jwt()->>'is_anonymous' is the JWT claim Supabase
--    sets on anonymous sessions; coalesce to false so a missing/malformed
--    claim (e.g. an old cached JWT from before this feature existed) is
--    never treated as "extra trusted", only ever as "not anonymous".
create or replace function private.is_guest()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false);
$$;

comment on function private.is_guest is
  'RLS helper: true if the current session is a Supabase anonymous (guest) user. Used only inside RESTRICTIVE policies to block guest writes to public-facing content — never to grant extra access.';

revoke all on function private.is_guest() from public;
grant execute on function private.is_guest() to anon, authenticated;

-- ---------------------------------------------------------------------- --
-- 2. handle_new_user() (migration 02) assumed every new auth.users row has
--    an email to derive a display name from. Anonymous sign-ins create an
--    auth.users row with email = null, which would make `name` resolve to
--    null and violate profiles.name's NOT NULL constraint — i.e. without
--    this fix, signInAnonymously() would fail at the database trigger
--    before the client ever got a session back. CREATE OR REPLACE keeps
--    the exact same behavior for every non-anonymous path; only the new
--    `case` branch is added.
--
--    The generated username ("guest_xxxxxxxx") is a database-constraint
--    detail only — profiles.username is NOT NULL + unique, so *some*
--    value must exist. The app must never render it as if the guest chose
--    it; every guest-facing surface displays the localized "Guest"/"ضيف"
--    label instead, keyed off auth.users.is_anonymous / the JWT claim, not
--    off this column. See src/lib/guest.ts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, username, language)
  values (
    new.id,
    case
      when coalesce(new.is_anonymous, false) then 'Guest'
      else coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
    end,
    case
      when coalesce(new.is_anonymous, false) then 'guest_' || substr(new.id::text, 1, 8)
      else coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8))
    end,
    coalesce(new.raw_user_meta_data ->> 'language', 'ar')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

-- ---------------------------------------------------------------------- --
-- 3. Recipes: guests may keep their own draft/private recipes (session-
--    owned scratch space) but may never publish one as public or unlisted.
--    Covers both direct INSERT and an UPDATE that flips visibility.
create policy "guests cannot publish public or unlisted recipes"
  on public.recipes as restrictive
  for insert
  with check (
    (select private.is_guest()) is false
    or visibility not in ('public', 'unlisted')
  );

create policy "guests cannot update recipes to public or unlisted"
  on public.recipes as restrictive
  for update
  using (
    (select private.is_guest()) is false
    or visibility not in ('public', 'unlisted')
  )
  with check (
    (select private.is_guest()) is false
    or visibility not in ('public', 'unlisted')
  );

-- ---------------------------------------------------------------------- --
-- 4. Community posts: always public by nature (no draft/private state
--    worth preserving for a session that may vanish), so guests are fully
--    blocked from creating them.
create policy "guests cannot create posts"
  on public.posts as restrictive
  for insert
  with check ((select private.is_guest()) is false);

-- ---------------------------------------------------------------------- --
-- 5. Comments: same reasoning as posts.
create policy "guests cannot comment"
  on public.comments as restrictive
  for insert
  with check ((select private.is_guest()) is false);

-- ---------------------------------------------------------------------- --
-- 6. Bean/recipe ratings and reviews: these are inherently public
--    (spec §9's Recipe Score and public bean ratings), so guests may read
--    them (browsing) but never write one.
create policy "guests cannot rate recipes"
  on public.recipe_ratings as restrictive
  for insert
  with check ((select private.is_guest()) is false);

create policy "guests cannot review recipes"
  on public.recipe_reviews as restrictive
  for insert
  with check ((select private.is_guest()) is false);

create policy "guests cannot review beans"
  on public.bean_reviews as restrictive
  for insert
  with check ((select private.is_guest()) is false);

-- ---------------------------------------------------------------------- --
-- 7. Follows: a guest session has no durable identity worth following/
--    being followed under.
create policy "guests cannot follow users"
  on public.follows as restrictive
  for insert
  with check ((select private.is_guest()) is false);

-- ---------------------------------------------------------------------- --
-- 8. Roaster claims: ownership-of-a-business assertion, never appropriate
--    for a temporary session.
create policy "guests cannot claim a roaster"
  on public.roaster_claims as restrictive
  for insert
  with check ((select private.is_guest()) is false);

-- ---------------------------------------------------------------------- --
-- Deliberately NOT touched here (reviewed, left as-is):
--
-- * data_import_jobs / data_import_rows / research_jobs / research_sources
--   / duplicate_candidates (migration 17) — already gated on
--   private.has_role('admin') for every command, including SELECT. A
--   guest session never holds a user_roles row, so these are already
--   unreachable; no restrictive policy is needed.
-- * /admin and /admin/* pages — server components that independently
--   query user_roles for 'admin'/'moderator' before rendering (see
--   src/app/[locale]/(app)/admin/**/page.tsx); a guest's `user` object
--   passes the middleware's coarse `!user` check (anonymous sessions are
--   still "a user"), but the page-level role query is the real gate and
--   already excludes guests.
-- * data_correction_requests (migration 17) — a lightweight, moderator-
--   reviewed "report incorrect info" submission, not a publish action and
--   not on the spec's guest "must not" list. Left open to guests: it adds
--   nothing to any public surface until an admin/moderator accepts it.
-- * recipe_attempts (migration 15), user_bean_inventory / brew_logs /
--   brew_log_adjustments / recipe_saves / recipe_collections / xbloom_*
--   (migrations 03/06/07/10/16) — private, owner-only tables already
--   scoped by auth.uid() = user_id with no public-visibility branch in
--   their SELECT policies, so there is nothing for a guest to leak into.
--   Guests using the guided brew interface or calculators may still write
--   to these, matching "maintain their own temporary session-owned
--   preferences where safe."
