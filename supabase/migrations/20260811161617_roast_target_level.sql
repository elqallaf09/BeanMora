-- The roast level the roaster was aiming for, recorded before the batch runs.
--
-- Distinct from `roast_level`, which is what the coffee actually came out at
-- and is only known after the drop. Keeping them in separate columns is the
-- whole point: comparing intent against outcome is how a roaster learns, and
-- collapsing the two would destroy exactly that comparison. Nullable, because
-- plenty of roasts are exploratory and have no target.
alter table public.roast_profiles
  add column if not exists target_roast_level text;

alter table public.roast_profiles
  drop constraint if exists roast_profiles_target_roast_level_check;

alter table public.roast_profiles
  add constraint roast_profiles_target_roast_level_check check (
    target_roast_level is null
    or target_roast_level = any (array['light','medium_light','medium','medium_dark','dark'])
  );

comment on column public.roast_profiles.target_roast_level is
  'Intended roast level, set before roasting. roast_level holds the achieved level, set after the drop.';
