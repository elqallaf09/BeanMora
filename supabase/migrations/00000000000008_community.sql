-- BeanMora — 08: follows, posts, post_media, post_likes, comments, comment_likes

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index follows_follower_id_idx on public.follows (follower_id);
create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy "follow relationships are publicly readable"
  on public.follows for select
  using (true);

create policy "users create their own follows"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "users remove their own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------- --

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  body text,
  content_language text not null default 'ar' check (content_language in ('ar', 'en')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_not_empty check (body is not null or recipe_id is not null)
);

create index posts_user_id_idx on public.posts (user_id);
create index posts_created_at_idx on public.posts (created_at desc);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

create policy "public, non-hidden posts are readable by everyone"
  on public.posts for select
  using (
    (visibility = 'public' and not is_hidden)
    or auth.uid() = user_id
    or (select private.has_role('admin'))
    or (select private.has_role('moderator'))
  );

create policy "authenticated users create posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "owners edit their own posts"
  on public.posts for update
  using (auth.uid() = user_id or (select private.has_role('admin')) or (select private.has_role('moderator')))
  with check (auth.uid() = user_id or (select private.has_role('admin')) or (select private.has_role('moderator')));

create policy "owners delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id or (select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index post_media_post_id_idx on public.post_media (post_id);

alter table public.post_media enable row level security;

create policy "post media follows parent post visibility"
  on public.post_media for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_id
      and ((p.visibility = 'public' and not p.is_hidden) or p.user_id = auth.uid() or (select private.has_role('admin')))
  ));

create policy "post owners manage post media"
  on public.post_media for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

-- ---------------------------------------------------------------------- --

create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index post_likes_post_id_idx on public.post_likes (post_id);

alter table public.post_likes enable row level security;

create policy "post likes are publicly readable"
  on public.post_likes for select
  using (true);

create policy "users like posts once"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users remove their own like"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------- --

-- Comments attach to either a recipe or a post (never both), and support
-- one level of replies via parent_comment_id.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null,
  content_language text not null default 'ar' check (content_language in ('ar', 'en')),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_single_parent check (
    (recipe_id is not null and post_id is null) or (recipe_id is null and post_id is not null)
  )
);

create index comments_recipe_id_idx on public.comments (recipe_id);
create index comments_post_id_idx on public.comments (post_id);
create index comments_parent_comment_id_idx on public.comments (parent_comment_id);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

alter table public.comments enable row level security;

create policy "comments follow parent content visibility"
  on public.comments for select
  using (
    not is_hidden
    and (
      recipe_id is null or exists (
        select 1 from public.recipes r
        where r.id = recipe_id and (r.visibility = 'public' or r.user_id = auth.uid())
      )
    )
    and (
      post_id is null or exists (
        select 1 from public.posts p
        where p.id = post_id and ((p.visibility = 'public' and not p.is_hidden) or p.user_id = auth.uid())
      )
    )
    or auth.uid() = user_id
    or (select private.has_role('admin'))
    or (select private.has_role('moderator'))
  );

create policy "authenticated users comment"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "comment owners edit their own comment"
  on public.comments for update
  using (auth.uid() = user_id or (select private.has_role('admin')) or (select private.has_role('moderator')))
  with check (auth.uid() = user_id or (select private.has_role('admin')) or (select private.has_role('moderator')));

create policy "comment owners delete their own comment"
  on public.comments for delete
  using (auth.uid() = user_id or (select private.has_role('admin')));

-- ---------------------------------------------------------------------- --

create table public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index comment_likes_comment_id_idx on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

create policy "comment likes are publicly readable"
  on public.comment_likes for select
  using (true);

create policy "users like comments once"
  on public.comment_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users remove their own comment like"
  on public.comment_likes for delete
  using (auth.uid() = user_id);
