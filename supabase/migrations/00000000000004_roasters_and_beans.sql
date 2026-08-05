-- BeanMora — 04: roasters, beans, bean_images, bean_flavor_notes

create table public.roasters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  country text,
  website_url text,
  logo_url text,
  owner_user_id uuid references public.profiles(id) on delete set null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roasters_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create index roasters_country_idx on public.roasters (country);
create index roasters_search_idx on public.roasters
  using gin (to_tsvector('simple', unaccent(coalesce(name_ar, '') || ' ' || coalesce(name_en, ''))));

create trigger roasters_set_updated_at
  before update on public.roasters
  for each row execute function public.set_updated_at();

alter table public.roasters enable row level security;

create policy "roasters are publicly readable"
  on public.roasters for select
  using (true);

create policy "owners manage their roaster page"
  on public.roasters for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "admins manage all roasters"
  on public.roasters for all
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.beans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  roaster_id uuid references public.roasters(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  origin_country text,
  origin_region text,
  farm text,
  varietal text,
  process text check (process in
    ('washed', 'natural', 'honey', 'anaerobic', 'wet_hulled', 'other')),
  altitude_meters int check (altitude_meters is null or altitude_meters between 0 and 3000),
  roast_level text check (roast_level in ('light', 'medium_light', 'medium', 'medium_dark', 'dark')),
  roast_date date,
  description_ar text,
  description_en text,
  suitable_for_v60 boolean not null default true,
  suitable_for_espresso boolean not null default true,
  suitable_for_xbloom boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beans_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create index beans_roaster_id_idx on public.beans (roaster_id);
create index beans_origin_country_idx on public.beans (origin_country);
create index beans_process_idx on public.beans (process);
create index beans_roast_level_idx on public.beans (roast_level);
create index beans_published_idx on public.beans (is_published);
create index beans_search_idx on public.beans
  using gin (to_tsvector('simple', unaccent(
    coalesce(name_ar, '') || ' ' || coalesce(name_en, '') || ' ' ||
    coalesce(origin_country, '') || ' ' || coalesce(origin_region, '') || ' ' || coalesce(farm, '')
  )));

create trigger beans_set_updated_at
  before update on public.beans
  for each row execute function public.set_updated_at();

alter table public.beans enable row level security;

create policy "published beans are publicly readable"
  on public.beans for select
  using (is_published or auth.uid() = created_by or (select private.has_role('admin')));

create policy "authenticated users add beans"
  on public.beans for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "creators or admins edit beans"
  on public.beans for update
  using (auth.uid() = created_by or (select private.has_role('admin')))
  with check (auth.uid() = created_by or (select private.has_role('admin')));

create policy "admins delete beans"
  on public.beans for delete
  using ((select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.bean_images (
  id uuid primary key default gen_random_uuid(),
  bean_id uuid not null references public.beans(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index bean_images_bean_id_idx on public.bean_images (bean_id);

alter table public.bean_images enable row level security;

create policy "bean images are publicly readable"
  on public.bean_images for select
  using (true);

create policy "bean owners manage bean images"
  on public.bean_images for all
  using (exists (
    select 1 from public.beans b
    where b.id = bean_id and (b.created_by = auth.uid() or (select private.has_role('admin')))
  ))
  with check (exists (
    select 1 from public.beans b
    where b.id = bean_id and (b.created_by = auth.uid() or (select private.has_role('admin')))
  ));

-- ---------------------------------------------------------------------- --

create table public.bean_flavor_notes (
  id uuid primary key default gen_random_uuid(),
  bean_id uuid not null references public.beans(id) on delete cascade,
  flavor text not null,
  created_at timestamptz not null default now(),
  unique (bean_id, flavor)
);

create index bean_flavor_notes_bean_id_idx on public.bean_flavor_notes (bean_id);
create index bean_flavor_notes_flavor_idx on public.bean_flavor_notes (flavor);

alter table public.bean_flavor_notes enable row level security;

create policy "bean flavor notes are publicly readable"
  on public.bean_flavor_notes for select
  using (true);

create policy "bean owners manage flavor notes"
  on public.bean_flavor_notes for all
  using (exists (
    select 1 from public.beans b
    where b.id = bean_id and (b.created_by = auth.uid() or (select private.has_role('admin')))
  ))
  with check (exists (
    select 1 from public.beans b
    where b.id = bean_id and (b.created_by = auth.uid() or (select private.has_role('admin')))
  ));
