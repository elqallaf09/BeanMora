-- BeanMora — 06: recipe_ratings, recipe_saves, recipe_collections, recipe_collection_items

create table public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  acidity int check (acidity between 1 and 5),
  bitterness int check (bitterness between 1 and 5),
  sweetness int check (sweetness between 1 and 5),
  body text check (body in ('light', 'medium', 'heavy')),
  balance int check (balance between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, user_id) -- one rating per user per recipe
);

create index recipe_ratings_recipe_id_idx on public.recipe_ratings (recipe_id);

create trigger recipe_ratings_set_updated_at
  before update on public.recipe_ratings
  for each row execute function public.set_updated_at();

alter table public.recipe_ratings enable row level security;

create policy "ratings follow parent recipe visibility"
  on public.recipe_ratings for select
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.visibility = 'public' or r.user_id = auth.uid() or public.has_role('admin'))
  ));

create policy "authenticated users rate recipes"
  on public.recipe_ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users edit their own rating"
  on public.recipe_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete their own rating"
  on public.recipe_ratings for delete
  using (auth.uid() = user_id or public.has_role('admin'));

-- ---------------------------------------------------------------------- --

create table public.recipe_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipe_collections_user_id_idx on public.recipe_collections (user_id);

create trigger recipe_collections_set_updated_at
  before update on public.recipe_collections
  for each row execute function public.set_updated_at();

alter table public.recipe_collections enable row level security;

create policy "users see their own collections, or public ones"
  on public.recipe_collections for select
  using (auth.uid() = user_id or not is_private);

create policy "users manage their own collections"
  on public.recipe_collections for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update their own collections"
  on public.recipe_collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete their own collections"
  on public.recipe_collections for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------- --

create table public.recipe_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.recipe_collections(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  personal_notes text,
  created_at timestamptz not null default now(),
  unique (collection_id, recipe_id)
);

create index recipe_collection_items_collection_id_idx on public.recipe_collection_items (collection_id);
create index recipe_collection_items_recipe_id_idx on public.recipe_collection_items (recipe_id);

alter table public.recipe_collection_items enable row level security;

create policy "collection items visible if collection is visible"
  on public.recipe_collection_items for select
  using (exists (
    select 1 from public.recipe_collections c
    where c.id = collection_id and (c.user_id = auth.uid() or not c.is_private)
  ));

create policy "collection owners manage items"
  on public.recipe_collection_items for all
  using (exists (select 1 from public.recipe_collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.recipe_collections c where c.id = collection_id and c.user_id = auth.uid()));

-- ---------------------------------------------------------------------- --

-- Simple bookmark flag, independent of named collections (a save with no
-- collection just means "starred"). Also used for saving beans by passing
-- recipe_id = null / bean_id — kept as two dedicated tables instead of a
-- polymorphic one so foreign keys stay real and RLS stays simple.
create table public.recipe_saves (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create index recipe_saves_user_id_idx on public.recipe_saves (user_id);
create index recipe_saves_recipe_id_idx on public.recipe_saves (recipe_id);

alter table public.recipe_saves enable row level security;

create policy "users see their own saves"
  on public.recipe_saves for select
  using (auth.uid() = user_id);

create policy "users create their own saves"
  on public.recipe_saves for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users delete their own saves"
  on public.recipe_saves for delete
  using (auth.uid() = user_id);
