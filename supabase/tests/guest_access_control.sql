-- BeanMora — verification queries for migration 18's guest (anonymous)
-- access controls.
--
-- Run against a real (or locally started) Supabase Postgres instance:
--   psql "$DATABASE_URL" -f supabase/tests/guest_access_control.sql
--
-- Everything below runs inside a transaction that ROLLBACKs at the end —
-- no fixture data is left behind. Requires a role that can insert into
-- auth.users and switch to the `authenticated` role (service_role / the
-- Postgres connection string from the dashboard) — the anon/authenticated
-- roles used by the app cannot run this script.
--
-- Technique: PostgREST evaluates every request as `SET LOCAL ROLE
-- authenticated; SET LOCAL request.jwt.claims = '<the request's JWT
-- claims>';` before running the query. This script does the same thing
-- directly in SQL to exercise the exact RLS policies a real anonymous
-- session would hit, without needing a running Next.js app or real JWTs.

begin;

do $$
declare
  v_permanent_user uuid := gen_random_uuid();
  v_guest_user uuid := gen_random_uuid();
  v_other_user uuid := gen_random_uuid();
  v_public_recipe_id uuid;
  v_private_recipe_id uuid;
  v_has_privileged_role boolean;
  v_error_caught boolean;
begin
  -- Reference data the recipes FK requires; harmless if already seeded.
  insert into public.brew_methods (code, name_ar, name_en)
  values ('v60', 'V60', 'V60')
  on conflict (code) do nothing;

  -- Fixture users. public.handle_new_user() fires on each insert and
  -- creates the matching public.profiles row automatically (migration 18
  -- patched it to handle the guest's null email) — do not also insert
  -- into profiles here.
  insert into auth.users (id, email) values
    (v_permanent_user, 'guest-rls-test-permanent@example.invalid');
  insert into auth.users (id, email) values
    (v_other_user, 'guest-rls-test-other@example.invalid');
  -- The guest fixture mirrors a real anonymous sign-in: no email,
  -- is_anonymous = true. This is what exercises handle_new_user()'s
  -- anonymous branch and is what auth.jwt()->>'is_anonymous' reflects
  -- once we switch role below.
  insert into auth.users (id, email, is_anonymous) values (v_guest_user, null, true);

  -- A public recipe (permanent user) and a private recipe (a different
  -- user) to exercise both "browse public content" and "cannot see
  -- another user's private records".
  insert into public.recipes (user_id, title, brew_method, recipe_type, visibility)
  values (v_permanent_user, 'Public V60 Recipe', 'v60', 'community', 'public')
  returning id into v_public_recipe_id;

  insert into public.recipes (user_id, title, brew_method, recipe_type, visibility)
  values (v_other_user, 'Other User Private Recipe', 'v60', 'personal', 'private')
  returning id into v_private_recipe_id;

  -- ====================================================================
  -- Switch to the `authenticated` role with a GUEST JWT (is_anonymous:
  -- true) — this is the exact context a real anonymous session runs
  -- under (migration 18's whole premise: anonymous sessions use the same
  -- `authenticated` role as everyone else).
  -- ====================================================================
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_guest_user, 'is_anonymous', true)::text,
    true
  );

  -- 1. Guest cannot publish a PUBLIC recipe.
  v_error_caught := false;
  begin
    insert into public.recipes (user_id, title, brew_method, recipe_type, visibility)
    values (v_guest_user, 'Guest Public Recipe', 'v60', 'personal', 'public');
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert v_error_caught, 'FAIL: guest was able to insert a PUBLIC recipe';

  -- 2. Guest CAN still create their own DRAFT recipe (session-owned
  -- scratch space — see migration 18's header comment).
  v_error_caught := false;
  begin
    insert into public.recipes (user_id, title, brew_method, recipe_type, visibility)
    values (v_guest_user, 'Guest Draft Recipe', 'v60', 'personal', 'draft');
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert not v_error_caught, 'FAIL: guest could not create their own DRAFT recipe (should be allowed)';

  -- 3. Guest cannot add a public recipe review.
  v_error_caught := false;
  begin
    insert into public.recipe_reviews (recipe_id, user_id, taste_quality, overall_rating)
    values (v_public_recipe_id, v_guest_user, 5, 5);
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert v_error_caught, 'FAIL: guest was able to insert a recipe_reviews row';

  -- 4. Guest cannot post to the community feed.
  v_error_caught := false;
  begin
    insert into public.posts (user_id, body) values (v_guest_user, 'hello from a guest');
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert v_error_caught, 'FAIL: guest was able to insert a post';

  -- 5. Guest cannot comment.
  v_error_caught := false;
  begin
    insert into public.comments (user_id, recipe_id, body)
    values (v_guest_user, v_public_recipe_id, 'nice recipe');
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert v_error_caught, 'FAIL: guest was able to insert a comment';

  -- 6. Guest can read the public recipe (browsing must always work).
  perform 1 from public.recipes where id = v_public_recipe_id;
  assert found, 'FAIL: guest could not read a PUBLIC recipe';

  -- 7. Guest cannot read another user's PRIVATE recipe.
  perform 1 from public.recipes where id = v_private_recipe_id;
  assert not found, 'FAIL: guest could read another users PRIVATE recipe';

  -- 8. Guest holds no admin/moderator role (checked defense-in-depth,
  -- matching src/app/[locale]/(app)/admin/**/page.tsx's own role query),
  -- and admin-only tables reject them at the RLS layer too.
  select exists (
    select 1 from public.user_roles
    where user_id = v_guest_user and role in ('admin', 'moderator')
  ) into v_has_privileged_role;
  assert not v_has_privileged_role, 'FAIL: guest unexpectedly holds an admin/moderator role';

  v_error_caught := false;
  begin
    insert into public.research_jobs (job_key, stage)
    values ('guest-should-fail', 'discover_roasters');
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert v_error_caught, 'FAIL: guest was able to insert a research_jobs row (admin-only)';

  -- ====================================================================
  -- Re-run the same "must succeed" cases as a PERMANENT user, to confirm
  -- migration 18 did not regress any existing behavior.
  -- ====================================================================
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_permanent_user, 'is_anonymous', false)::text,
    true
  );

  v_error_caught := false;
  begin
    insert into public.recipes (user_id, title, brew_method, recipe_type, visibility)
    values (v_permanent_user, 'Permanent User Public Recipe', 'v60', 'personal', 'public');
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert not v_error_caught, 'REGRESSION: a permanent user could not publish a public recipe';

  v_error_caught := false;
  begin
    insert into public.posts (user_id, body) values (v_permanent_user, 'hello from a real account');
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert not v_error_caught, 'REGRESSION: a permanent user could not create a post';

  v_error_caught := false;
  begin
    insert into public.recipe_reviews (recipe_id, user_id, taste_quality, overall_rating)
    values (v_public_recipe_id, v_permanent_user, 5, 5);
  exception when insufficient_privilege then
    v_error_caught := true;
  end;
  assert not v_error_caught, 'REGRESSION: a permanent user could not review a recipe';

  reset role;
  raise notice 'All guest access-control verification scenarios passed.';
end $$;

rollback;
