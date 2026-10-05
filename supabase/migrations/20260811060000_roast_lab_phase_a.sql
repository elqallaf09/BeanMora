-- BeanMora — Roast Lab, Phase A: schema, RLS, calculations, green coffee.
--
-- Forward-only. Touches no applied migration and no existing row.
--
-- ARCHITECTURE (approved before implementation)
-- BeanMora already has three coffee tables with different meanings:
--   coffee_lots      the agricultural lot — origin/farm/producer/varietal/
--                    process/altitude. No roaster, no roast level. This is
--                    the pre-roast concept, and it is a shared catalog
--                    (public read, admin write).
--   roasted_products a roaster's commercial SKU — roaster_id NOT NULL plus
--                    roast_level/roast_date. Structurally cannot represent
--                    green coffee.
--   beans            the legacy denormalized table that conflates both, and
--                    still holds the entire live catalog (23 rows).
--
-- Roast Lab therefore hangs green coffee off coffee_lots, never off beans
-- and never off roasted_products. But coffee_lots is a shared catalog with
-- no owner column, so it cannot hold a user's private green coffee or the
-- measurements they took of it. Hence `green_coffees`: user-owned, with a
-- NULLABLE coffee_lot_id so a user who picks an existing catalog lot reuses
-- it instead of duplicating the entity, and their own measured properties
-- (moisture, density, water activity, screen size) live on their row.
--
-- BACKWARD COMPATIBILITY
-- Nothing here alters beans, coffee_lots or roasted_products beyond adding
-- one nullable FK column to brew_logs. The 23 legacy beans rows are not
-- migrated, rewritten or deleted. Roast Lab works while the old catalog
-- stays exactly where it is.
--
-- CALCULATIONS
-- Weight loss is a STORED GENERATED column: it is arithmetic over two
-- columns of the same row, so the database computes it and it is NULL —
-- never 0 — whenever an input is missing. Time-based metrics (DTR, phase
-- durations) depend on roast_events rows, which a generated column cannot
-- reach, so they are exposed through the roast_profile_metrics view below.
-- Both approaches share the same rule: a metric whose inputs are absent
-- resolves to NULL, and the UI renders an em dash rather than inventing a
-- zero.

/* ==================================================================== *
 * 1. Green coffee — user-owned, optionally linked to the shared catalog *
 * ==================================================================== */

create table if not exists public.green_coffees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Nullable on purpose: reuse a catalog lot when one fits, otherwise the
  -- user is describing green coffee the catalog has never seen.
  coffee_lot_id uuid references public.coffee_lots(id) on delete set null,

  name text not null,
  -- Descriptive fields. Every one is nullable because a home roaster buying
  -- an unlabelled 1kg bag genuinely does not know most of them, and an
  -- unknown value must stay unknown rather than be defaulted.
  origin_country text,
  origin_region text,
  producer text,
  farm text,
  washing_station text,
  lot_number text,
  harvest_year integer,
  species text,
  varietal text,
  process text,
  altitude_meters integer,

  -- Measured green properties. Only meaningful if the user actually measured
  -- them; nothing is inferred from origin or process.
  moisture_pct numeric,
  density_g_l numeric,
  water_activity numeric,
  screen_size text,

  supplier text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint green_coffees_harvest_year_check
    check (harvest_year is null or (harvest_year between 1900 and 2200)),
  constraint green_coffees_species_check
    check (species is null or species = any (array['arabica','robusta','liberica','excelsa','blend','other'])),
  -- Mirrors beans.process so the two vocabularies stay comparable.
  constraint green_coffees_process_check
    check (process is null or process = any (array['washed','natural','honey','anaerobic','wet_hulled','other'])),
  constraint green_coffees_altitude_check
    check (altitude_meters is null or (altitude_meters between 0 and 3000)),
  -- Storage bounds only. Deliberately wide: a narrow "professional" range
  -- would reject legitimate outliers, and this is a sanity guard against
  -- typos, not a quality judgement.
  constraint green_coffees_moisture_check
    check (moisture_pct is null or (moisture_pct >= 0 and moisture_pct <= 100)),
  constraint green_coffees_density_check
    check (density_g_l is null or (density_g_l > 0 and density_g_l <= 1000)),
  constraint green_coffees_water_activity_check
    check (water_activity is null or (water_activity >= 0 and water_activity <= 1))
);
create index if not exists green_coffees_user_idx on public.green_coffees (user_id, created_at desc);
create index if not exists green_coffees_lot_idx on public.green_coffees (coffee_lot_id) where coffee_lot_id is not null;
/* ==================================================================== *
 * 2. Roast profiles — the roast session itself                          *
 * ==================================================================== */

create table if not exists public.roast_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  green_coffee_id uuid not null references public.green_coffees(id) on delete restrict,
  -- The machine, drawn from the user's own gear rather than the catalog, so
  -- a custom/unlisted roaster works. Nullable: manual roasting is valid.
  roaster_equipment_id uuid references public.user_equipment(id) on delete set null,
  -- Fork lineage. Never overwrites the original.
  parent_roast_id uuid references public.roast_profiles(id) on delete set null,

  title text,
  batch_number integer,
  roast_date date not null default current_date,
  notes text,

  -- Lifecycle. `cancelled` exists so an abandoned session is distinguishable
  -- from a completed one — inventory must not be consumed by a roast the
  -- user walked away from.
  status text not null default 'planned',
  visibility text not null default 'private',
  published_at timestamptz,

  -- Pre-roast
  green_weight_g numeric,
  charge_temp_c numeric,
  ambient_temp_c numeric,
  green_temp_c numeric,

  -- Post-roast
  roasted_weight_g numeric,
  drop_temp_c numeric,
  total_time_seconds integer,
  roast_level text,
  -- Agtron is a calibrated instrument reading. It is stored only when the
  -- user has an instrument and types a number; it is never derived from a
  -- roast_level label or from a photograph.
  agtron_whole integer,
  agtron_ground integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint roast_profiles_status_check
    check (status = any (array['planned','in_progress','completed','cancelled'])),
  -- Same vocabulary as recipes.visibility so the community surface can reuse
  -- the existing publish patterns.
  constraint roast_profiles_visibility_check
    check (visibility = any (array['private','public','unlisted'])),
  constraint roast_profiles_roast_level_check
    check (roast_level is null or roast_level = any (array['light','medium_light','medium','medium_dark','dark'])),
  constraint roast_profiles_green_weight_check
    check (green_weight_g is null or green_weight_g > 0),
  constraint roast_profiles_roasted_weight_check
    check (roasted_weight_g is null or roasted_weight_g > 0),
  -- Roasting removes water; the roasted batch cannot outweigh the green one.
  -- Enforced only when both are present so a part-filled roast is still
  -- editable.
  constraint roast_profiles_weight_order_check
    check (green_weight_g is null or roasted_weight_g is null or roasted_weight_g <= green_weight_g),
  constraint roast_profiles_total_time_check
    check (total_time_seconds is null or total_time_seconds > 0),
  constraint roast_profiles_agtron_whole_check
    check (agtron_whole is null or (agtron_whole between 0 and 150)),
  constraint roast_profiles_agtron_ground_check
    check (agtron_ground is null or (agtron_ground between 0 and 150)),
  -- Wide storage bounds; drum roasters, fluid beds and sample roasters all
  -- differ, so this only catches nonsense.
  constraint roast_profiles_charge_temp_check
    check (charge_temp_c is null or (charge_temp_c between -50 and 400)),
  constraint roast_profiles_drop_temp_check
    check (drop_temp_c is null or (drop_temp_c between -50 and 400)),
  constraint roast_profiles_ambient_temp_check
    check (ambient_temp_c is null or (ambient_temp_c between -50 and 100)),
  constraint roast_profiles_green_temp_check
    check (green_temp_c is null or (green_temp_c between -50 and 100)),
  -- A roast cannot be its own parent.
  constraint roast_profiles_parent_not_self_check
    check (parent_roast_id is null or parent_roast_id <> id),
  -- Published state and timestamp move together.
  constraint roast_profiles_published_check
    check ((visibility = 'private' and published_at is null) or visibility <> 'private')
);
-- Weight loss, computed by the database. NULL whenever an input is missing —
-- this is precisely why it is a generated column rather than something the
-- application fills in: there is no code path that can write a fabricated 0.
alter table public.roast_profiles
  add column if not exists weight_loss_g numeric
    generated always as (green_weight_g - roasted_weight_g) stored;
alter table public.roast_profiles
  add column if not exists weight_loss_percent numeric
    generated always as (
      case
        when green_weight_g is not null and green_weight_g > 0 and roasted_weight_g is not null
          then round(((green_weight_g - roasted_weight_g) / green_weight_g) * 100, 2)
      end
    ) stored;
create index if not exists roast_profiles_user_date_idx on public.roast_profiles (user_id, roast_date desc);
create index if not exists roast_profiles_green_coffee_idx on public.roast_profiles (green_coffee_id);
create index if not exists roast_profiles_visibility_idx on public.roast_profiles (visibility, published_at desc)
  where visibility <> 'private';
create index if not exists roast_profiles_parent_idx on public.roast_profiles (parent_roast_id)
  where parent_roast_id is not null;
/* ==================================================================== *
 * 3. Roast milestones                                                   *
 * ==================================================================== */

create table if not exists public.roast_events (
  id uuid primary key default gen_random_uuid(),
  roast_id uuid not null references public.roast_profiles(id) on delete cascade,
  event_type text not null,
  elapsed_seconds integer not null,
  -- Optional: time-only roasting must work for users with no probe.
  bean_temp_c numeric,
  environment_temp_c numeric,
  notes text,
  created_at timestamptz not null default now(),

  constraint roast_events_type_check
    check (event_type = any (array[
      'charge','turning_point','dry_end','first_crack_start','first_crack_end',
      'second_crack_start','second_crack_end','drop','custom'
    ])),
  constraint roast_events_elapsed_check check (elapsed_seconds >= 0),
  constraint roast_events_bean_temp_check
    check (bean_temp_c is null or (bean_temp_c between -50 and 400)),
  constraint roast_events_env_temp_check
    check (environment_temp_c is null or (environment_temp_c between -50 and 600))
);
-- Each milestone happens once per roast. 'custom' is exempt because a user
-- may want several free-form marks.
create unique index if not exists roast_events_unique_milestone_idx
  on public.roast_events (roast_id, event_type)
  where event_type <> 'custom';
create index if not exists roast_events_roast_time_idx on public.roast_events (roast_id, elapsed_seconds);
/* ==================================================================== *
 * 4. Machine control changes — time series, not fixed columns           *
 * ==================================================================== */

create table if not exists public.roast_control_events (
  id uuid primary key default gen_random_uuid(),
  roast_id uuid not null references public.roast_profiles(id) on delete cascade,
  elapsed_seconds integer not null,
  control_type text not null,
  value numeric,
  unit text,
  notes text,
  created_at timestamptz not null default now(),

  constraint roast_control_events_type_check
    check (control_type = any (array['power','gas','airflow','fan','drum_speed','custom'])),
  constraint roast_control_events_elapsed_check check (elapsed_seconds >= 0)
);
create index if not exists roast_control_events_roast_time_idx
  on public.roast_control_events (roast_id, elapsed_seconds);
/* ==================================================================== *
 * 5. Curve telemetry                                                    *
 * ==================================================================== */
-- Normalized rather than a JSON blob on roast_profiles: a 12-minute roast
-- logged at 1 Hz is ~720 rows, and the landing page must be able to read
-- roast summaries without dragging telemetry along. Curve points are only
-- ever fetched on the detail page.

create table if not exists public.roast_curve_points (
  id uuid primary key default gen_random_uuid(),
  roast_id uuid not null references public.roast_profiles(id) on delete cascade,
  elapsed_seconds integer not null,
  bean_temp_c numeric,
  environment_temp_c numeric,
  -- Rate of rise, as reported by the source that produced the sample. Stored
  -- rather than derived so an imported machine log keeps the machine's own
  -- figure; BeanMora never back-fills it.
  ror numeric,

  constraint roast_curve_points_elapsed_check check (elapsed_seconds >= 0),
  constraint roast_curve_points_bean_temp_check
    check (bean_temp_c is null or (bean_temp_c between -50 and 400)),
  constraint roast_curve_points_env_temp_check
    check (environment_temp_c is null or (environment_temp_c between -50 and 600))
);
create unique index if not exists roast_curve_points_unique_idx
  on public.roast_curve_points (roast_id, elapsed_seconds);
/* ==================================================================== *
 * 6. Tasting after rest                                                 *
 * ==================================================================== */

create table if not exists public.roast_tastings (
  id uuid primary key default gen_random_uuid(),
  roast_id uuid not null references public.roast_profiles(id) on delete cascade,
  rest_days integer,
  tasted_on date,
  -- 1-10 scales, matching how the rest of the app scores sensory attributes.
  aroma smallint,
  acidity smallint,
  sweetness smallint,
  body smallint,
  bitterness smallint,
  clarity smallint,
  aftertaste smallint,
  overall_score numeric,
  -- User observations, explicitly not defect classifications.
  observations text[] not null default '{}',
  flavor_notes text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint roast_tastings_rest_days_check check (rest_days is null or rest_days >= 0),
  constraint roast_tastings_aroma_check check (aroma is null or (aroma between 1 and 10)),
  constraint roast_tastings_acidity_check check (acidity is null or (acidity between 1 and 10)),
  constraint roast_tastings_sweetness_check check (sweetness is null or (sweetness between 1 and 10)),
  constraint roast_tastings_body_check check (body is null or (body between 1 and 10)),
  constraint roast_tastings_bitterness_check check (bitterness is null or (bitterness between 1 and 10)),
  constraint roast_tastings_clarity_check check (clarity is null or (clarity between 1 and 10)),
  constraint roast_tastings_aftertaste_check check (aftertaste is null or (aftertaste between 1 and 10)),
  constraint roast_tastings_overall_check check (overall_score is null or (overall_score >= 0 and overall_score <= 100))
);
create index if not exists roast_tastings_roast_idx on public.roast_tastings (roast_id);
/* ==================================================================== *
 * 7. Green inventory — a ledger, not a mutable number                   *
 * ==================================================================== */
-- Transactions rather than a single remaining_grams column, so the balance
-- is always explainable and an abandoned roast can be reversed by adding a
-- compensating row instead of silently rewriting a total.

create table if not exists public.green_inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  green_coffee_id uuid not null references public.green_coffees(id) on delete cascade,
  -- Set when the movement is a roast consuming green coffee, so the ledger
  -- explains itself and a cancelled roast's line can be found and reversed.
  roast_id uuid references public.roast_profiles(id) on delete set null,

  transaction_type text not null,
  -- Signed: positive adds stock, negative removes it. A single signed column
  -- means the balance is a plain sum with no direction lookup.
  quantity_grams numeric not null,
  unit_price numeric,
  currency text,
  supplier text,
  occurred_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),

  constraint green_inventory_type_check
    check (transaction_type = any (array['purchase','roast_consumption','adjustment','loss','reversal'])),
  constraint green_inventory_quantity_check check (quantity_grams <> 0),
  -- Direction must agree with the movement's meaning.
  constraint green_inventory_sign_check check (
    (transaction_type = 'purchase' and quantity_grams > 0)
    or (transaction_type in ('roast_consumption','loss') and quantity_grams < 0)
    or (transaction_type in ('adjustment','reversal'))
  ),
  constraint green_inventory_price_check check (unit_price is null or unit_price >= 0)
);
create index if not exists green_inventory_user_idx on public.green_inventory_transactions (user_id, occurred_on desc);
create index if not exists green_inventory_coffee_idx on public.green_inventory_transactions (green_coffee_id);
create index if not exists green_inventory_roast_idx on public.green_inventory_transactions (roast_id)
  where roast_id is not null;
/* ==================================================================== *
 * 8. Brew linkage                                                       *
 * ==================================================================== */
-- Closes the chain green -> roast -> rest -> recipe -> brew -> taste.
-- Nullable with no default, so every existing brew_logs row stays valid.

alter table public.brew_logs
  add column if not exists roast_profile_id uuid references public.roast_profiles(id) on delete set null;
create index if not exists brew_logs_roast_profile_idx on public.brew_logs (roast_profile_id)
  where roast_profile_id is not null;
/* ==================================================================== *
 * 9. Roasting machines are not brewing gear                             *
 * ==================================================================== */

alter table public.equipment_models drop constraint if exists equipment_models_category_check;
alter table public.equipment_models add constraint equipment_models_category_check check (
  category = any (array[
    'grinder','espresso_machine','xbloom','v60_dripper','kalita_dripper','origami_dripper',
    'aeropress','chemex','scale','kettle','filter','portafilter_basket','distribution_tool',
    'roaster','other'
  ])
);
alter table public.user_equipment drop constraint if exists user_equipment_category_check;
alter table public.user_equipment add constraint user_equipment_category_check check (
  category = any (array[
    'grinder','espresso_machine','xbloom','v60_dripper','kalita_dripper','origami_dripper',
    'aeropress','chemex','scale','kettle','filter','portafilter_basket','distribution_tool',
    'roaster','other'
  ])
);
/* ==================================================================== *
 * 10. updated_at triggers, matching the existing convention             *
 * ==================================================================== */

drop trigger if exists green_coffees_set_updated_at on public.green_coffees;
create trigger green_coffees_set_updated_at before update on public.green_coffees
  for each row execute function public.set_updated_at();
drop trigger if exists roast_profiles_set_updated_at on public.roast_profiles;
create trigger roast_profiles_set_updated_at before update on public.roast_profiles
  for each row execute function public.set_updated_at();
drop trigger if exists roast_tastings_set_updated_at on public.roast_tastings;
create trigger roast_tastings_set_updated_at before update on public.roast_tastings
  for each row execute function public.set_updated_at();
/* ==================================================================== *
 * 11. Derived roast metrics                                             *
 * ==================================================================== */
-- Time metrics need roast_events, which a generated column cannot reach, so
-- they live in a view. Every expression is NULL-propagating: a roast with no
-- recorded first crack yields NULL development time and NULL DTR, never 0
-- and never a guess. security_invoker makes the view obey the caller's RLS
-- rather than the view owner's.

create or replace view public.roast_profile_metrics
with (security_invoker = true) as
with ev as (
  select
    roast_id,
    max(elapsed_seconds) filter (where event_type = 'charge')            as charge_s,
    max(elapsed_seconds) filter (where event_type = 'turning_point')     as turning_point_s,
    max(elapsed_seconds) filter (where event_type = 'dry_end')           as dry_end_s,
    max(elapsed_seconds) filter (where event_type = 'first_crack_start') as first_crack_s,
    max(elapsed_seconds) filter (where event_type = 'drop')              as drop_s
  from public.roast_events
  group by roast_id
)
select
  r.id as roast_id,
  r.user_id,
  -- Prefer the recorded drop event; fall back to the stored total only when
  -- no drop was marked.
  coalesce(ev.drop_s, r.total_time_seconds)            as total_time_seconds,
  ev.charge_s,
  ev.turning_point_s,
  ev.dry_end_s,
  ev.first_crack_s,
  ev.drop_s,
  -- Drying: charge -> dry end.
  case when ev.dry_end_s is not null
       then ev.dry_end_s - coalesce(ev.charge_s, 0) end               as drying_seconds,
  -- Maillard: dry end -> first crack.
  case when ev.dry_end_s is not null and ev.first_crack_s is not null
       then ev.first_crack_s - ev.dry_end_s end                       as maillard_seconds,
  -- Development: first crack -> drop. Null unless BOTH exist.
  case when ev.first_crack_s is not null and ev.drop_s is not null
       then ev.drop_s - ev.first_crack_s end                          as development_seconds,
  -- DTR. Requires a first crack, a drop, and a non-zero total.
  case when ev.first_crack_s is not null and ev.drop_s is not null
            and coalesce(ev.drop_s, r.total_time_seconds) > 0
       then round(
              ((ev.drop_s - ev.first_crack_s)::numeric
               / coalesce(ev.drop_s, r.total_time_seconds)::numeric) * 100, 1)
       end                                                            as development_ratio_percent,
  r.weight_loss_g,
  r.weight_loss_percent
from public.roast_profiles r
left join ev on ev.roast_id = r.id;
-- Current green stock per coffee, as a plain sum of the ledger.
create or replace view public.green_coffee_balances
with (security_invoker = true) as
select
  g.id as green_coffee_id,
  g.user_id,
  coalesce(sum(t.quantity_grams), 0) as remaining_grams
from public.green_coffees g
left join public.green_inventory_transactions t on t.green_coffee_id = g.id
group by g.id, g.user_id;
/* ==================================================================== *
 * 12. RLS                                                               *
 * ==================================================================== */

alter table public.green_coffees                enable row level security;
alter table public.roast_profiles               enable row level security;
alter table public.roast_events                 enable row level security;
alter table public.roast_control_events         enable row level security;
alter table public.roast_curve_points           enable row level security;
alter table public.roast_tastings               enable row level security;
alter table public.green_inventory_transactions enable row level security;
-- Green coffee is private to its owner. It is not part of the community
-- surface, so there is no public-read path at all.
drop policy if exists "users manage their own green coffee" on public.green_coffees;
create policy "users manage their own green coffee" on public.green_coffees
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- Roast profiles follow the recipes visibility pattern.
drop policy if exists "roasts are readable when public or owned" on public.roast_profiles;
create policy "roasts are readable when public or owned" on public.roast_profiles
  for select
  using (
    visibility = any (array['public','unlisted'])
    or (select auth.uid()) = user_id
    or (select private.has_role('admin'))
  );
drop policy if exists "users create their own roasts" on public.roast_profiles;
create policy "users create their own roasts" on public.roast_profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "owners update their own roasts" on public.roast_profiles;
create policy "owners update their own roasts" on public.roast_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "owners delete their own roasts" on public.roast_profiles;
create policy "owners delete their own roasts" on public.roast_profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id or (select private.has_role('admin')));
-- Guests may not publish. This MUST be RESTRICTIVE, matching the equivalent
-- rule on `recipes`. Permissive policies for the same command are OR'd, so a
-- second permissive INSERT policy would not add a guest restriction — it
-- would create a bypass: anything satisfying the guest clause would be
-- allowed even if it failed the ownership check, letting a user insert a
-- roast owned by somebody else. Restrictive policies AND with the permissive
-- set, which is the intended "additionally, you must also satisfy this".
drop policy if exists "guests cannot publish roasts" on public.roast_profiles;
create policy "guests cannot publish roasts" on public.roast_profiles
  as restrictive
  for insert to authenticated
  with check ((select private.is_guest()) is false or visibility = 'private');
/* ---- Child tables inherit ownership THROUGH the parent roast ---- *
 * None of these carry their own user_id. Authorship is whatever the parent
 * roast says it is, which makes it impossible for a child row to disagree
 * with its parent about who owns it.                                       */

do $$
declare
  child text;
begin
  foreach child in array array['roast_events','roast_control_events','roast_curve_points','roast_tastings']
  loop
    execute format($f$
      drop policy if exists "read %1$s of readable roasts" on public.%1$I;
      create policy "read %1$s of readable roasts" on public.%1$I
        for select using (
          exists (
            select 1 from public.roast_profiles r
            where r.id = %1$I.roast_id
              and (r.visibility = any (array['public','unlisted'])
                   or r.user_id = (select auth.uid())
                   or (select private.has_role('admin')))
          )
        );

      drop policy if exists "write %1$s of own roasts" on public.%1$I;
      create policy "write %1$s of own roasts" on public.%1$I
        for all to authenticated
        using (
          exists (select 1 from public.roast_profiles r
                  where r.id = %1$I.roast_id and r.user_id = (select auth.uid()))
        )
        with check (
          exists (select 1 from public.roast_profiles r
                  where r.id = %1$I.roast_id and r.user_id = (select auth.uid()))
        );
    $f$, child);
  end loop;
end $$;
-- Inventory is strictly private.
drop policy if exists "users manage their own green inventory" on public.green_inventory_transactions;
create policy "users manage their own green inventory" on public.green_inventory_transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
/* ==================================================================== *
 * 13. Grants — RLS does the authorising, grants just open the doors     *
 * ==================================================================== */

grant select on public.roast_profiles, public.roast_events, public.roast_control_events,
                public.roast_curve_points, public.roast_tastings to anon, authenticated;
grant insert, update, delete on public.roast_profiles, public.roast_events,
                public.roast_control_events, public.roast_curve_points,
                public.roast_tastings to authenticated;
grant select, insert, update, delete on public.green_coffees,
                public.green_inventory_transactions to authenticated;
grant select on public.roast_profile_metrics, public.green_coffee_balances to anon, authenticated
