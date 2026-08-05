-- BeanMora — 05: recipes, recipe_steps, recipe_pours, recipe_equipment,
--               recipe_images, recipe_versions

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  bean_id uuid references public.beans(id) on delete set null,
  title text not null,
  brew_method text not null references public.brew_methods(code),
  dose_grams numeric(6, 2) check (dose_grams is null or dose_grams > 0),
  water_grams numeric(7, 2) check (water_grams is null or water_grams > 0),
  ratio numeric(6, 2) generated always as (
    case when dose_grams > 0 then round(water_grams / dose_grams, 2) else null end
  ) stored,
  water_temp_c numeric(4, 1) check (water_temp_c is null or water_temp_c between 0 and 100),
  grinder_setting text,
  total_time_seconds int check (total_time_seconds is null or total_time_seconds > 0),
  pour_style text check (pour_style in ('circular', 'center', 'pulse', 'continuous')),
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  visibility text not null default 'draft' check (visibility in ('draft', 'public', 'private')),
  flavor_notes text[] not null default '{}',
  notes text,
  content_language text not null default 'ar' check (content_language in ('ar', 'en')),
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);
create index recipes_bean_id_idx on public.recipes (bean_id);
create index recipes_brew_method_idx on public.recipes (brew_method);
create index recipes_visibility_idx on public.recipes (visibility);
create index recipes_created_at_idx on public.recipes (created_at desc);
-- Trigram GIN index, not to_tsvector(unaccent(...)) — unaccent() is STABLE,
-- not IMMUTABLE, and Postgres rejects non-IMMUTABLE functions in index
-- expressions. See roasters_search_idx / beans_search_idx in migration 04
-- for the same fix and full rationale. Search queries should normalize
-- with lower() and use ILIKE or trigram similarity.
create index recipes_search_idx
  on public.recipes
  using gin (
    (
      lower(
        coalesce(title, '') || ' ' ||
        coalesce(notes, '')
      )
    ) gin_trgm_ops
  );

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

create policy "public recipes are readable by everyone"
  on public.recipes for select
  using (
    visibility = 'public'
    or auth.uid() = user_id
    or (select private.has_role('admin'))
  );

create policy "authenticated users create recipes"
  on public.recipes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "owners update their own recipes"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owners delete their own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id or (select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_number int not null check (step_number > 0),
  title text not null,
  description text,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  unique (recipe_id, step_number)
);

create index recipe_steps_recipe_id_idx on public.recipe_steps (recipe_id);

alter table public.recipe_steps enable row level security;

create policy "recipe steps follow parent recipe visibility"
  on public.recipe_steps for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility = 'public' or r.user_id = auth.uid() or (select private.has_role('admin')))
  ));

create policy "recipe owners manage steps"
  on public.recipe_steps for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------- --

create table public.recipe_pours (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  pour_number int not null check (pour_number > 0),
  water_grams numeric(7, 2) not null check (water_grams > 0),
  start_at_seconds int not null check (start_at_seconds >= 0),
  is_bloom boolean not null default false,
  created_at timestamptz not null default now(),
  unique (recipe_id, pour_number)
);

create index recipe_pours_recipe_id_idx on public.recipe_pours (recipe_id);

alter table public.recipe_pours enable row level security;

create policy "recipe pours follow parent recipe visibility"
  on public.recipe_pours for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility = 'public' or r.user_id = auth.uid() or (select private.has_role('admin')))
  ));

create policy "recipe owners manage pours"
  on public.recipe_pours for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------- --

create table public.recipe_equipment (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  equipment_model_id uuid references public.equipment_models(id) on delete set null,
  category text not null check (category in
    ('grinder', 'espresso_machine', 'xbloom', 'v60_dripper', 'aeropress', 'chemex',
     'scale', 'kettle', 'filter', 'portafilter_basket', 'distribution_tool', 'other')),
  notes text
);

create index recipe_equipment_recipe_id_idx on public.recipe_equipment (recipe_id);

alter table public.recipe_equipment enable row level security;

create policy "recipe equipment follows parent recipe visibility"
  on public.recipe_equipment for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility = 'public' or r.user_id = auth.uid() or (select private.has_role('admin')))
  ));

create policy "recipe owners manage recipe equipment"
  on public.recipe_equipment for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------- --

create table public.recipe_images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index recipe_images_recipe_id_idx on public.recipe_images (recipe_id);

alter table public.recipe_images enable row level security;

create policy "recipe images follow parent recipe visibility"
  on public.recipe_images for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility = 'public' or r.user_id = auth.uid() or (select private.has_role('admin')))
  ));

create policy "recipe owners manage recipe images"
  on public.recipe_images for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------- --

-- Snapshot history whenever a recipe is edited or "copied and tweaked" —
-- powers version history and the copy-then-modify flow required by the
-- product spec (keep provenance of forks).
create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version_number int not null check (version_number > 0),
  forked_from_recipe_id uuid references public.recipes(id) on delete set null,
  snapshot jsonb not null,
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (recipe_id, version_number)
);

create index recipe_versions_recipe_id_idx on public.recipe_versions (recipe_id);

alter table public.recipe_versions enable row level security;

create policy "recipe versions follow parent recipe visibility"
  on public.recipe_versions for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility = 'public' or r.user_id = auth.uid() or (select private.has_role('admin')))
  ));

create policy "recipe owners write versions"
  on public.recipe_versions for insert
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));
