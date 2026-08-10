-- BeanMora — verification queries for the Espresso Dial-In "Previous
-- Attempts" edit/delete feature (migration 31's tasting_note column, plus
-- the pre-existing brew_logs RLS from migration 07).
--
-- Run against a real (or locally started) Supabase Postgres instance:
--   psql "$DATABASE_URL" -f supabase/tests/espresso_attempt_ownership.sql
--
-- Everything below runs inside a transaction that ROLLBACKs at the end —
-- no fixture data is left behind. Requires a role that can insert into
-- auth.users and switch to the `authenticated` role (service_role / the
-- Postgres connection string from the dashboard) — the anon/authenticated
-- roles used by the app cannot run this script.
--
-- Technique: same as supabase/tests/guest_access_control.sql — `SET LOCAL
-- ROLE authenticated; SET LOCAL request.jwt.claims = '<claims>';` exercises
-- the exact RLS policies PostgREST evaluates for a real request, without a
-- running Next.js app or real JWTs.
--
-- IMPORTANT distinction from guest_access_control.sql's assertions: an
-- UPDATE/DELETE blocked by a `using (auth.uid() = user_id)` RLS policy does
-- NOT raise insufficient_privilege — the policy simply filters the target
-- row out before the statement runs, so the statement "succeeds" against
-- zero rows. The correct check is GET DIAGNOSTICS ... = ROW_COUNT and/or a
-- privileged re-select proving the row is unchanged, not an exception
-- handler. (INSERT's `with check` variant does still raise
-- insufficient_privilege, and is tested that way below for the tasting_note
-- CHECK constraint.)

begin;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_other_user uuid := gen_random_uuid();
  v_attempt_id uuid;
  v_row_count int;
  v_dose numeric;
  v_tasting_note text;
  v_error_caught boolean;
begin
  -- Reference data the brew_logs FK requires; harmless if already seeded
  -- (mirrors guest_access_control.sql's defensive brew_methods insert, and
  -- migration 29's own defensive fold-in of the same seed).
  insert into public.brew_methods (code, name_ar, name_en)
  values ('espresso', 'إسبريسو', 'Espresso')
  on conflict (code) do nothing;

  -- Fixture users. public.handle_new_user() fires on each insert and
  -- creates the matching public.profiles row automatically — do not also
  -- insert into profiles here.
  insert into auth.users (id, email) values
    (v_owner, 'espresso-rls-test-owner@example.invalid');
  insert into auth.users (id, email) values
    (v_other_user, 'espresso-rls-test-other@example.invalid');

  -- ====================================================================
  -- 1. Owner creates their own espresso attempt.
  -- ====================================================================
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'is_anonymous', false)::text, true);

  insert into public.brew_logs (user_id, brew_method, dose_grams, water_grams, actual_time_seconds, tasting_note)
  values (v_owner, 'espresso', 18, 36, 28, 'too_sour')
  returning id into v_attempt_id;

  -- ====================================================================
  -- 2. A DIFFERENT authenticated user must not be able to edit or delete
  --    the owner's attempt. RLS filters the row out of the UPDATE/DELETE's
  --    target set entirely — the statement "succeeds" but affects 0 rows.
  -- ====================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_other_user, 'is_anonymous', false)::text, true);

  update public.brew_logs
  set dose_grams = 99, tasting_note = 'balanced'
  where id = v_attempt_id and user_id = v_other_user;
  get diagnostics v_row_count = row_count;
  assert v_row_count = 0, 'FAIL: another user was able to UPDATE rows via a spoofed user_id match';

  -- Same attempt, but the app-level code always scopes by the real
  -- attempt id AND the caller's own auth.uid() (see
  -- src/app/[locale]/(app)/espresso/attempts-timeline.tsx) — prove RLS
  -- still blocks it even if that client-side scoping were ever removed by
  -- mistake, by targeting just the id with the other user's session.
  update public.brew_logs
  set dose_grams = 99
  where id = v_attempt_id;
  get diagnostics v_row_count = row_count;
  assert v_row_count = 0, 'FAIL: another user was able to UPDATE the owner''s attempt by id alone';

  delete from public.brew_logs where id = v_attempt_id;
  get diagnostics v_row_count = row_count;
  assert v_row_count = 0, 'FAIL: another user was able to DELETE the owner''s attempt';

  -- Confirm, back as a privileged context, that the row is completely
  -- untouched by the other user's attempts above.
  reset role;
  select dose_grams into v_dose from public.brew_logs where id = v_attempt_id;
  assert v_dose = 18, 'FAIL: the owner''s attempt was mutated by another user''s blocked UPDATE';

  -- ====================================================================
  -- 3. The OWNER can edit their own attempt (dose/yield/time/grind/notes/
  --    tasting_note all update together, same row — no duplicate created).
  -- ====================================================================
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'is_anonymous', false)::text, true);

  update public.brew_logs
  set dose_grams = 18.5, water_grams = 37, actual_time_seconds = 27,
      grind_setting = '14 EK', notes = 'Noticeably sweeter this time.', tasting_note = 'balanced'
  where id = v_attempt_id and user_id = v_owner;
  get diagnostics v_row_count = row_count;
  assert v_row_count = 1, 'FAIL: the owner could not UPDATE their own attempt';

  select count(*) into v_row_count from public.brew_logs where user_id = v_owner and brew_method = 'espresso';
  assert v_row_count = 1, 'FAIL: editing created a duplicate row instead of updating the existing one';

  select tasting_note into v_tasting_note from public.brew_logs where id = v_attempt_id;
  assert v_tasting_note = 'balanced', 'FAIL: tasting_note did not persist the owner''s update';

  -- ====================================================================
  -- 4. The tasting_note CHECK constraint rejects anything outside the six
  --    presets — this is enforced at the database layer regardless of
  --    what the UI sends.
  -- ====================================================================
  v_error_caught := false;
  begin
    insert into public.brew_logs (user_id, brew_method, dose_grams, water_grams, actual_time_seconds, tasting_note)
    values (v_owner, 'espresso', 18, 36, 28, 'delicious i guess');
  exception when check_violation then
    v_error_caught := true;
  end;
  assert v_error_caught, 'FAIL: an invalid tasting_note value was accepted';

  -- null tasting_note (no tag picked) must still be allowed — it's optional.
  v_error_caught := false;
  begin
    insert into public.brew_logs (user_id, brew_method, dose_grams, water_grams, actual_time_seconds, tasting_note)
    values (v_owner, 'espresso', 17, 34, 29, null);
  exception when check_violation then
    v_error_caught := true;
  end;
  assert not v_error_caught, 'FAIL: a null tasting_note (optional field) was rejected';

  -- ====================================================================
  -- 5. The OWNER can delete their own attempt.
  -- ====================================================================
  delete from public.brew_logs where id = v_attempt_id and user_id = v_owner;
  get diagnostics v_row_count = row_count;
  assert v_row_count = 1, 'FAIL: the owner could not DELETE their own attempt';

  reset role;
  perform 1 from public.brew_logs where id = v_attempt_id;
  assert not found, 'FAIL: the attempt still exists after the owner deleted it';

  raise notice 'All espresso attempt ownership/edit/delete verification scenarios passed.';
end $$;

rollback;
