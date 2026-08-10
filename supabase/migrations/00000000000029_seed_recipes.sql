-- BeanMora — 29: real, sourced, structured recipe(s) linked to beans and
--               brew-method equipment already seeded in migrations 26-28.
--
-- Forward-only. Does not modify migrations 01-28.
--
-- SCOPE / HONESTY NOTE
-- Only one recipe is seeded here: GREY's Finca El Diviso V60 recipe,
-- independently fetched this session from
-- https://greydoha.qa/product/el-diviso, which is genuinely complete
-- (dose, water, ratio, grind, four pours, total time all stated on-page).
-- GREY's own /recipes index lists several more brew guides (Finca El
-- Bosque, Guji Uraga, Haraz LOT 8070, Rivense El Chirripo, Rivense La
-- Guaca, Sunda Wanoja) and both aeropress.com/pages/how-to-brew and
-- flairespresso.com/pages/flair-58-brewing-guide were attempted this
-- session for an official-manufacturer recipe to link against the
-- equipment catalog — all of these returned empty/JS-rendered content to
-- this session's fetcher (same client-rendering limitation already
-- documented for Legacy Roastery and Camel Step in migrations 26-27) and
-- are therefore NOT included here rather than reconstructed from memory.
-- They are left as follow-up discovery-pipeline targets, not fabricated.
--
-- Idempotent: re-running does nothing once this recipe's slug exists.

-- ---------------------------------------------------------------------- --
-- 1. System attribution account
-- ---------------------------------------------------------------------- --
-- public.recipes.user_id is not null and FKs to public.profiles(id), which
-- itself FKs to auth.users(id) (migration 02). A roaster-sourced recipe
-- ingested by the discovery pipeline still needs a real, valid author row
-- to satisfy that chain, so this creates one fixed, well-known service
-- account the same way any Supabase project seeds a system user: a direct
-- auth.users insert. It carries no usable password and is never meant to
-- sign in — it only exists so moderators have one consistent place
-- ("BeanMora Official") to see what the discovery pipeline attributes
-- sourced, non-personal recipes to. public.handle_new_user() (migration 02)
-- fires on this insert and creates the matching profiles row automatically.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'official@beanmora.app',
  'disabled:system-account:not-a-real-password',
  now(),
  '{"provider":"system","providers":["system"]}'::jsonb,
  '{"name":"BeanMora Official","username":"beanmora_official","language":"en"}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

update public.profiles
set is_verified = true,
    bio = 'System attribution account for recipes and facts sourced directly from official roaster and manufacturer publications by BeanMora''s discovery pipeline. Not a real person; this account cannot sign in.'
where id = '11111111-1111-1111-1111-111111111111'
  and coalesce(bio, '') <> 'System attribution account for recipes and facts sourced directly from official roaster and manufacturer publications by BeanMora''s discovery pipeline. Not a real person; this account cannot sign in.';

-- ---------------------------------------------------------------------- --
-- 2. Recipe: GREY — Finca El Diviso (V60)
-- ---------------------------------------------------------------------- --
-- Source facts (https://greydoha.qa/product/el-diviso, fetched this
-- session): Origin Colombia, Process Natural Anaerobic, Varietal Geisha,
-- Altitude 1600m, Roast light, "best for V60", Ratio 1:15, Dose 18g,
-- Grind size "14 EK" (the roaster's own EK43-scale grind number — stored
-- verbatim in grinder_setting, not translated into another grinder's
-- scale), four pours reaching cumulative 50g / 155g / 220g / 270g, Total
-- time 2:39 (159s). 18g x 15 = 270g, which matches the stated 4th-pour
-- cumulative total exactly — pour_sum_validated is true because that
-- arithmetic genuinely checks out against the two independently-stated
-- numbers (dose+ratio vs. final pour), not because it was assumed.
--
-- What is NOT on the source page and is therefore NOT claimed as fact:
-- water temperature, and the individual start time of each pour (only the
-- final total time is published). is_incomplete_source = true flags this,
-- and per-pour start_at_seconds below are computed by linear interpolation
-- across the published total time as a labelled estimate — recorded in
-- recipe_pours because the column is not-null, but the recipe's own notes
-- explicitly say these four numbers are estimated, not roaster-published.

insert into public.recipes
  (slug, user_id, bean_id, title, brew_method, dose_grams, water_grams,
   grinder_setting, total_time_seconds, pour_style, visibility,
   flavor_notes, notes, content_language, recipe_type, pour_sum_validated,
   is_incomplete_source)
select
  'grey-finca-el-diviso-v60',
  '11111111-1111-1111-1111-111111111111',
  b.id,
  'GREY Finca El Diviso — V60',
  'v60',
  18,
  270,
  '14 EK (GREY''s own EK43-scale grind number, as published)',
  159,
  'pulse',
  'public',
  array['Red rose', 'Peach', 'Grape yoghurt'],
  'Dose, ratio, grind number and the four pour totals are published exactly as stated on the roaster''s product page. Water temperature is not published and is left blank rather than assumed. The timing of each individual pour is not published either (only the 2:39 total) — the per-pour start times stored for this recipe are BeanMora''s own linear-interpolation estimate across that total, not a roaster-confirmed timestamp; treat them as a guide, not a specification.',
  'en',
  'official_roaster',
  true,
  true
from public.beans b
where b.slug = 'grey-finca-el-diviso'
on conflict (slug) do nothing;

insert into public.recipe_steps (recipe_id, step_number, title, description, duration_seconds)
select r.id, v.step_number, v.title, v.description, v.duration_seconds
from public.recipes r
join (values
  (1, 'First pour', 'Pour to a cumulative 50g to saturate the bed.', 29),
  (2, 'Second pour', 'Pour to a cumulative 155g.', 62),
  (3, 'Third pour', 'Pour to a cumulative 220g.', 39),
  (4, 'Fourth pour', 'Pour to a cumulative 270g (final).', 29)
) as v(step_number, title, description, duration_seconds)
  on true
where r.slug = 'grey-finca-el-diviso-v60'
  and not exists (
    select 1 from public.recipe_steps s where s.recipe_id = r.id and s.step_number = v.step_number
  );

-- water_grams here is the INCREMENTAL amount for that pour (the app sums
-- pours to build the cumulative brew timeline — see recipe_pours usage in
-- src/app/[locale]/(app)/brew/page.tsx), derived from the published
-- cumulative totals: 50, 155-50=105, 220-155=65, 270-220=50.
-- start_at_seconds is the estimate described above (linear interpolation
-- of each pour's cumulative-water fraction across the published 159s
-- total): round(159 * 50/270)=29, round(159*155/270)=91,
-- round(159*220/270)=130, round(159*270/270)=159.
insert into public.recipe_pours (recipe_id, pour_number, water_grams, start_at_seconds, is_bloom)
select r.id, v.pour_number, v.water_grams, v.start_at_seconds, false
from public.recipes r
join (values
  (1, 50, 29),
  (2, 105, 91),
  (3, 65, 130),
  (4, 50, 159)
) as v(pour_number, water_grams, start_at_seconds)
  on true
where r.slug = 'grey-finca-el-diviso-v60'
  and not exists (
    select 1 from public.recipe_pours p where p.recipe_id = r.id and p.pour_number = v.pour_number
  );

-- Category-level equipment link only: the source page names the brew
-- format ("V60") but does not name a specific dripper brand/model, so no
-- equipment_model_id is claimed — linking a specific Hario/Kalita SKU here
-- would be an unstated inference, not a sourced fact.
insert into public.recipe_equipment (recipe_id, equipment_model_id, category, notes)
select r.id, null, 'v60_dripper',
  'Source specifies "V60" as the brew format; no specific dripper brand or model is named on the product page, so none is claimed here.'
from public.recipes r
where r.slug = 'grey-finca-el-diviso-v60'
  and not exists (
    select 1 from public.recipe_equipment re where re.recipe_id = r.id and re.category = 'v60_dripper'
  );

insert into public.recipe_sources (recipe_id, source_type, source_url, source_name, last_verified_at, data_confidence)
select r.id, 'official_product_page', 'https://greydoha.qa/product/el-diviso', 'GREY — Finca El Diviso product page', now(), 'verified'
from public.recipes r
where r.slug = 'grey-finca-el-diviso-v60'
  and not exists (
    select 1 from public.recipe_sources rs where rs.recipe_id = r.id and rs.source_url = 'https://greydoha.qa/product/el-diviso'
  );
