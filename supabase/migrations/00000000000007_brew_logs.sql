-- BeanMora — 07: brew_logs, brew_log_taste_scores

create table public.brew_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  bean_id uuid references public.beans(id) on delete set null,
  brew_method text references public.brew_methods(code),
  actual_time_seconds int check (actual_time_seconds is null or actual_time_seconds > 0),
  dose_grams numeric(6, 2),
  water_grams numeric(7, 2),
  water_temp_c numeric(4, 1),
  grind_setting text,
  notes text,
  created_at timestamptz not null default now()
);

create index brew_logs_user_id_idx on public.brew_logs (user_id);
create index brew_logs_recipe_id_idx on public.brew_logs (recipe_id);
create index brew_logs_created_at_idx on public.brew_logs (created_at desc);

alter table public.brew_logs enable row level security;

-- Brew logs are always private to their owner — this is the "how did MY
-- brew actually go" record, never shown to other users directly.
create policy "users see only their own brew logs"
  on public.brew_logs for select
  using (auth.uid() = user_id);

create policy "users create their own brew logs"
  on public.brew_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update their own brew logs"
  on public.brew_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete their own brew logs"
  on public.brew_logs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------- --

create table public.brew_log_taste_scores (
  id uuid primary key default gen_random_uuid(),
  brew_log_id uuid not null references public.brew_logs(id) on delete cascade,
  acidity int check (acidity between 1 and 5),
  bitterness int check (bitterness between 1 and 5),
  sweetness int check (sweetness between 1 and 5),
  body text check (body in ('light', 'medium', 'heavy')),
  balance int check (balance between 1 and 5),
  overall_rating int check (overall_rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (brew_log_id)
);

alter table public.brew_log_taste_scores enable row level security;

create policy "users see taste scores for their own brew logs"
  on public.brew_log_taste_scores for select
  using (exists (
    select 1 from public.brew_logs bl where bl.id = brew_log_id and bl.user_id = auth.uid()
  ));

create policy "users manage taste scores for their own brew logs"
  on public.brew_log_taste_scores for all
  using (exists (select 1 from public.brew_logs bl where bl.id = brew_log_id and bl.user_id = auth.uid()))
  with check (exists (select 1 from public.brew_logs bl where bl.id = brew_log_id and bl.user_id = auth.uid()));
