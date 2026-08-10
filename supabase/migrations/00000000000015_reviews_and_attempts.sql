-- BeanMora — 15 (Phase 2): bean_reviews, recipe_attempts, recipe_reviews,
--               and the Recipe Score function.
--
-- Phase 1's `recipe_ratings` (migration 06) is a quick 1-5 + taste-profile
-- rating and is kept as-is for the lightweight "rate what I tasted" flow.
-- The tables below are the richer Phase 2 layer: bean_reviews rates the
-- COFFEE independent of any one recipe, and recipe_reviews rates the
-- RECIPE's instructions (accuracy, reproducibility, equipment fit) —
-- distinct questions that both feed into ranking (Recipe Score below).

create table public.bean_reviews (
  id uuid primary key default gen_random_uuid(),
  roasted_product_id uuid not null references public.roasted_products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  overall_rating int not null check (overall_rating between 1 and 5),
  aroma int check (aroma between 1 and 5),
  sweetness int check (sweetness between 1 and 5),
  acidity int check (acidity between 1 and 5),
  body int check (body between 1 and 5),
  clarity int check (clarity between 1 and 5),
  balance int check (balance between 1 and 5),
  aftertaste int check (aftertaste between 1 and 5),
  value_for_money int check (value_for_money between 1 and 5),
  would_buy_again boolean,
  flavors_perceived text[] not null default '{}',
  brew_method_used text references public.brew_methods(code),
  roast_date date,
  review_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (roasted_product_id, user_id)
);

create index bean_reviews_product_id_idx on public.bean_reviews (roasted_product_id);

create trigger bean_reviews_set_updated_at
  before update on public.bean_reviews
  for each row execute function public.set_updated_at();

alter table public.bean_reviews enable row level security;

create policy "bean reviews are publicly readable"
  on public.bean_reviews for select
  using (true);

create policy "authenticated users review beans"
  on public.bean_reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users edit their own bean review"
  on public.bean_reviews for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users delete their own bean review"
  on public.bean_reviews for delete
  using ((select auth.uid()) = user_id or (select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

-- Confirms whether a user actually brewed a recipe before letting them
-- review it (spec §11). A review may optionally reference the attempt
-- that justified it.
create table public.recipe_attempts (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  brew_log_id uuid references public.brew_logs(id) on delete set null,
  status text not null check (status in
    ('tried', 'brewed_as_written', 'brewed_with_modifications', 'saved_only')),
  equipment_used text,
  settings_changed boolean not null default false,
  actual_time_seconds int check (actual_time_seconds is null or actual_time_seconds > 0),
  outcome text check (outcome in ('excellent', 'good', 'needs_adjustment', 'poor')),
  created_at timestamptz not null default now()
);

create index recipe_attempts_recipe_id_idx on public.recipe_attempts (recipe_id);
create index recipe_attempts_user_id_idx on public.recipe_attempts (user_id);

alter table public.recipe_attempts enable row level security;

create policy "attempts follow parent recipe visibility, own attempts always visible"
  on public.recipe_attempts for select
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.visibility in ('public', 'unlisted') or r.user_id = (select auth.uid()))
    )
  );

create policy "authenticated users log their own attempts"
  on public.recipe_attempts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users edit their own attempts"
  on public.recipe_attempts for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users delete their own attempts"
  on public.recipe_attempts for delete
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------- --

create table public.recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid references public.recipe_attempts(id) on delete set null,
  taste_quality int not null check (taste_quality between 1 and 5),
  step_accuracy int check (step_accuracy between 1 and 5),
  ease_of_execution int check (ease_of_execution between 1 and 5),
  bean_compatibility int check (bean_compatibility between 1 and 5),
  equipment_compatibility int check (equipment_compatibility between 1 and 5),
  reproducibility int check (reproducibility between 1 and 5),
  time_required_minutes int check (time_required_minutes is null or time_required_minutes > 0),
  overall_rating int not null check (overall_rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create index recipe_reviews_recipe_id_idx on public.recipe_reviews (recipe_id);

create trigger recipe_reviews_set_updated_at
  before update on public.recipe_reviews
  for each row execute function public.set_updated_at();

alter table public.recipe_reviews enable row level security;

create policy "recipe reviews follow parent recipe visibility"
  on public.recipe_reviews for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility in ('public', 'unlisted') or r.user_id = (select auth.uid()) or (select private.has_role('admin')))
  ));

create policy "authenticated users review recipes"
  on public.recipe_reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users edit their own recipe review"
  on public.recipe_reviews for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users delete their own recipe review"
  on public.recipe_reviews for delete
  using ((select auth.uid()) = user_id or (select private.has_role('admin')));

-- ---------------------------------------------------------------------- --
-- Recipe Score: a single ranking number so a recipe with one 5-star rating
-- can't outrank one with hundreds of successful attempts (spec §10).
--
-- Deliberately NOT a stored/materialized column — it would go stale the
-- moment a new review or attempt lands, and keeping it fresh needs a
-- trigger on three different tables. A STABLE function computed at query
-- time (and cacheable per-statement the same way private.has_role is) is
-- simpler to keep correct. Equipment-match is intentionally excluded here:
-- that's a per-viewer personalization signal applied in the app layer at
-- query time, not a global score.
create or replace function public.recipe_score(p_recipe_id uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  with attempts as (
    select
      count(*) as attempt_count,
      count(*) filter (where outcome in ('excellent', 'good')) as good_outcomes,
      count(*) filter (where outcome is not null) as rated_outcomes
    from public.recipe_attempts
    where recipe_id = p_recipe_id
  ),
  reviews as (
    select
      count(*) as review_count,
      avg(overall_rating)::numeric as avg_rating,
      max(created_at) as last_review_at
    from public.recipe_reviews
    where recipe_id = p_recipe_id
  ),
  recipe as (
    select
      recipe_type,
      (case when title is not null then 1 else 0 end
        + case when array_length(flavor_notes, 1) > 0 then 1 else 0 end
        + case when total_time_seconds is not null then 1 else 0 end
        + case when dose_grams is not null and water_grams is not null then 1 else 0 end
        + case when not is_incomplete_source then 1 else 0 end
      )::numeric / 5 as completeness
    from public.recipes
    where id = p_recipe_id
  )
  select round((
    -- Volume: attempts matter, but with diminishing returns (log scale).
    -- ln() must be called on numeric here, not double precision: count(*)
    -- is bigint, and PostgreSQL only defines round(numeric, integer) — not
    -- round(double precision, integer). Casting the ln() operands to
    -- numeric keeps the whole expression in the numeric type family so the
    -- final round(..., 2) below resolves to the two-argument numeric form.
    (least(
      ln((1 + coalesce(a.attempt_count, 0))::numeric)
        / ln(101::numeric),
      1::numeric
    ) * 30)
    -- Quality: average review rating, 0-5 -> 0-30.
    + (coalesce(r.avg_rating, 0) / 5 * 30)
    -- Success rate among attempts that recorded an outcome.
    + (case when a.rated_outcomes > 0 then a.good_outcomes::numeric / a.rated_outcomes else 0.5 end * 15)
    -- Data completeness.
    + (coalesce(rc.completeness, 0) * 10)
    -- Official/verified recipes get a trust bump over unverified personal ones.
    + (case rc.recipe_type
         when 'official_roaster' then 10
         when 'verified_barista' then 8
         when 'community' then 5
         when 'personal' then 3
         else 2
       end)
    -- Recency: reviewed in the last 180 days keeps full credit, decays after.
    + (case
         when r.last_review_at is null then 0
         when r.last_review_at > now() - interval '180 days' then 5
         else 3
       end)
  )::numeric, 2)
  from attempts a, reviews r, recipe rc;
$$;

comment on function public.recipe_score is
  'Ranking score (0-100) combining attempt volume, review quality, success rate, data completeness, and recipe_type trust. Not personalized to viewer equipment — apply that as a separate boost in the app query layer.';

revoke all on function public.recipe_score(uuid) from public;
grant execute on function public.recipe_score(uuid) to anon, authenticated;
