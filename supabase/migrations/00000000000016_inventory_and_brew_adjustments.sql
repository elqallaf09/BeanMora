-- BeanMora — 16 (Phase 2): My Coffee Inventory + brew_log_adjustments

create table public.user_bean_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  roasted_product_id uuid references public.roasted_products(id) on delete set null,
  legacy_bean_id uuid references public.beans(id) on delete set null,
  barcode text,
  roast_date date,
  opened_at date,
  original_weight_grams int check (original_weight_grams is null or original_weight_grams > 0),
  remaining_weight_grams int check (remaining_weight_grams is null or remaining_weight_grams >= 0),
  storage_location text,
  preferred_recipe_id uuid references public.recipes(id) on delete set null,
  last_grind_setting text,
  brew_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_bean_inventory_has_product check (
    roasted_product_id is not null or legacy_bean_id is not null
  ),
  constraint user_bean_inventory_weight_sane check (
    remaining_weight_grams is null or original_weight_grams is null or remaining_weight_grams <= original_weight_grams
  )
);

create index user_bean_inventory_user_id_idx on public.user_bean_inventory (user_id);
create index user_bean_inventory_roasted_product_id_idx on public.user_bean_inventory (roasted_product_id);

create trigger user_bean_inventory_set_updated_at
  before update on public.user_bean_inventory
  for each row execute function public.set_updated_at();

alter table public.user_bean_inventory enable row level security;

-- Private to the owner only — spec §14/§27 ("مخزون البن يراه صاحبه فقط").
create policy "users manage only their own bean inventory"
  on public.user_bean_inventory for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------- --

-- Structured diff explaining what changed between one brew attempt and the
-- next for the same bean (spec §15's "attempt 1: slow flow, attempt 2:
-- coarser grind, attempt 3: excellent" narrative). One row per changed
-- field so the UI can render a clean timeline without parsing free text.
create table public.brew_log_adjustments (
  id uuid primary key default gen_random_uuid(),
  brew_log_id uuid not null references public.brew_logs(id) on delete cascade,
  previous_brew_log_id uuid references public.brew_logs(id) on delete set null,
  field_changed text not null check (field_changed in
    ('grind_setting', 'dose_grams', 'water_grams', 'water_temp_c', 'bloom_time_seconds',
     'total_time_seconds', 'pour_style', 'equipment', 'other')),
  previous_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);

create index brew_log_adjustments_brew_log_id_idx on public.brew_log_adjustments (brew_log_id);

alter table public.brew_log_adjustments enable row level security;

create policy "users see adjustments for their own brew logs"
  on public.brew_log_adjustments for select
  using (exists (
    select 1 from public.brew_logs bl where bl.id = brew_log_id and bl.user_id = (select auth.uid())
  ));

create policy "users manage adjustments for their own brew logs"
  on public.brew_log_adjustments for all
  using (exists (select 1 from public.brew_logs bl where bl.id = brew_log_id and bl.user_id = (select auth.uid())))
  with check (exists (select 1 from public.brew_logs bl where bl.id = brew_log_id and bl.user_id = (select auth.uid())));
