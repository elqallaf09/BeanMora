-- BeanMora — verification queries for public.recipe_score() (migration 15).
--
-- Written to confirm the fix for the "function round(double precision,
-- integer) does not exist" push failure: ln() on count(*) (bigint) was
-- resolving to double precision, and PostgreSQL only defines
-- round(numeric, integer), not round(double precision, integer). The fix
-- casts the ln() operands and the whole scoring expression to numeric
-- before the final round(..., 2).
--
-- Run against a real (or locally started) Supabase Postgres instance:
--   psql "$DATABASE_URL" -f supabase/tests/recipe_score.sql
--
-- Everything below runs inside a transaction that ROLLBACKs at the end —
-- no fixture data is left behind, and this is safe to run against a
-- linked project. Requires a role that can insert into auth.users
-- (service_role / the Postgres connection string from the dashboard) —
-- the anon/authenticated roles used by the app cannot run this script.

begin;

do $$
declare
  v_user1 uuid := gen_random_uuid();
  v_user2 uuid := gen_random_uuid();
  v_recipe_empty uuid;
  v_recipe_one_review uuid;
  v_recipe_many_attempts uuid;
  v_score numeric;
  i int;
begin
  -- Reference data the recipes FK requires; harmless if already seeded.
  insert into public.brew_methods (code, name_ar, name_en)
  values ('v60', 'V60', 'V60')
  on conflict (code) do nothing;

  -- Minimal fixture users.
  insert into auth.users (id, email) values
    (v_user1, 'recipe-score-test-1@example.invalid'),
    (v_user2, 'recipe-score-test-2@example.invalid');

  insert into public.profiles (id, name, username) values
    (v_user1, 'Recipe Score Test User 1', 'recipe_score_test_1'),
    (v_user2, 'Recipe Score Test User 2', 'recipe_score_test_2');

  -- --------------------------------------------------------------------
  -- Scenario 1: recipe with no attempts and no reviews at all. This is
  -- the all-coalesce-defaults path — every subquery in recipe_score()
  -- returns zero rows and must be handled by coalesce(), not error.
  -- --------------------------------------------------------------------
  insert into public.recipes (user_id, title, brew_method, recipe_type, visibility)
  values (v_user1, 'Empty Recipe', 'v60', 'personal', 'public')
  returning id into v_recipe_empty;

  v_score := public.recipe_score(v_recipe_empty);
  assert v_score is not null,
    'recipe_score() returned null for a recipe with no attempts/reviews';
  assert pg_typeof(v_score) = 'numeric'::regtype,
    format('recipe_score() did not return numeric, got %s', pg_typeof(v_score));
  assert v_score >= 0 and v_score <= 100,
    format('recipe_score() out of the intended 0-100 range: %s', v_score);
  assert scale(v_score) = 2,
    format('recipe_score() not rounded to exactly 2 decimal places: %s', v_score);
  raise notice 'Scenario 1 (no attempts, no reviews): score = %', v_score;

  -- --------------------------------------------------------------------
  -- Scenario 2: recipe with exactly one review and no attempts.
  -- --------------------------------------------------------------------
  insert into public.recipes (user_id, title, brew_method, recipe_type, visibility)
  values (v_user1, 'One Review Recipe', 'v60', 'community', 'public')
  returning id into v_recipe_one_review;

  insert into public.recipe_reviews (recipe_id, user_id, taste_quality, overall_rating)
  values (v_recipe_one_review, v_user2, 5, 5);

  v_score := public.recipe_score(v_recipe_one_review);
  assert v_score is not null,
    'recipe_score() returned null for a recipe with one review';
  assert v_score >= 0 and v_score <= 100,
    format('recipe_score() out of the intended 0-100 range: %s', v_score);
  assert scale(v_score) = 2,
    format('recipe_score() not rounded to exactly 2 decimal places: %s', v_score);
  raise notice 'Scenario 2 (one review, no attempts): score = %', v_score;

  -- --------------------------------------------------------------------
  -- Scenario 3: recipe with many (150) attempts. This is the scenario
  -- that actually broke the push — ln(1 + attempt_count) with a large
  -- bigint attempt_count is exactly what surfaced the double-precision
  -- round() error. Also exercises the log-scale cap (should not exceed
  -- the 30-point volume ceiling) and the success-rate branch.
  -- --------------------------------------------------------------------
  insert into public.recipes (user_id, title, brew_method, recipe_type, visibility)
  values (v_user1, 'Popular Recipe', 'v60', 'official_roaster', 'public')
  returning id into v_recipe_many_attempts;

  for i in 1..150 loop
    insert into public.recipe_attempts (recipe_id, user_id, status, outcome)
    values (
      v_recipe_many_attempts,
      v_user1,
      'brewed_as_written',
      case when i % 5 = 0 then 'needs_adjustment' else 'good' end
    );
  end loop;

  v_score := public.recipe_score(v_recipe_many_attempts);
  assert v_score is not null,
    'recipe_score() returned null for a recipe with 150 attempts';
  assert pg_typeof(v_score) = 'numeric'::regtype,
    format('recipe_score() did not return numeric for 150 attempts, got %s', pg_typeof(v_score));
  assert v_score >= 0 and v_score <= 100,
    format('recipe_score() out of the intended 0-100 range for 150 attempts: %s', v_score);
  assert scale(v_score) = 2,
    format('recipe_score() not rounded to exactly 2 decimal places for 150 attempts: %s', v_score);
  -- Explicit non-finite check. PostgreSQL's `numeric` type has no
  -- Infinity representation at all (only `double precision` does), and
  -- 'NaN'::numeric sorts *above* every finite value, so the <= 100 check
  -- above already rules both out structurally — this assertion is kept
  -- as a second, explicit signal for anyone reading the test output.
  assert v_score::text !~* 'nan|infinity',
    format('recipe_score() returned a non-finite value: %s', v_score);
  raise notice 'Scenario 3 (150 attempts, log-scaled volume): score = %', v_score;

  raise notice 'All public.recipe_score() verification scenarios passed.';
end $$;

rollback;
