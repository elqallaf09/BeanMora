-- BeanMora — 03: brew_methods, equipment_brands, equipment_models, user_equipment

create table public.brew_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in
    ('v60', 'espresso', 'xbloom', 'aeropress', 'chemex', 'french_press', 'cold_brew', 'moka_pot')),
  name_ar text not null,
  name_en text not null
);

alter table public.brew_methods enable row level security;

create policy "brew methods are publicly readable"
  on public.brew_methods for select
  using (true);

-- Reference data managed by admins/migrations only.
create policy "only admins write brew methods"
  on public.brew_methods for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.equipment_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

alter table public.equipment_brands enable row level security;

create policy "equipment brands are publicly readable"
  on public.equipment_brands for select
  using (true);

create policy "only admins write equipment brands"
  on public.equipment_brands for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.equipment_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.equipment_brands(id) on delete set null,
  category text not null check (category in
    ('grinder', 'espresso_machine', 'xbloom', 'v60_dripper', 'aeropress', 'chemex',
     'scale', 'kettle', 'filter', 'portafilter_basket', 'distribution_tool', 'other')),
  name text not null,
  image_url text,
  grind_range text,
  notes text,
  created_at timestamptz not null default now()
);

create index equipment_models_brand_id_idx on public.equipment_models (brand_id);
create index equipment_models_category_idx on public.equipment_models (category);

alter table public.equipment_models enable row level security;

create policy "equipment models are publicly readable"
  on public.equipment_models for select
  using (true);

create policy "only admins write equipment models"
  on public.equipment_models for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  equipment_model_id uuid references public.equipment_models(id) on delete set null,
  category text not null check (category in
    ('grinder', 'espresso_machine', 'xbloom', 'v60_dripper', 'aeropress', 'chemex',
     'scale', 'kettle', 'filter', 'portafilter_basket', 'distribution_tool', 'other')),
  custom_name text,
  is_default boolean not null default false,
  settings jsonb not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_equipment_named check (equipment_model_id is not null or custom_name is not null)
);

create index user_equipment_user_id_idx on public.user_equipment (user_id);
create unique index user_equipment_one_default_per_category
  on public.user_equipment (user_id, category)
  where is_default;

create trigger user_equipment_set_updated_at
  before update on public.user_equipment
  for each row execute function public.set_updated_at();

alter table public.user_equipment enable row level security;

create policy "users manage their own gear"
  on public.user_equipment for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
