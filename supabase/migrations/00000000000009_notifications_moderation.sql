-- BeanMora — 09: notifications, reports, blocks, moderation_actions

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,   -- recipient
  actor_id uuid references public.profiles(id) on delete set null,          -- who triggered it
  type text not null check (type in
    ('like', 'comment', 'follow', 'recipe_save', 'reply', 'new_recipe_from_followed',
     'verification_approved', 'xbloom_sync_status', 'saved_recipe_updated')),
  entity_type text check (entity_type in ('recipe', 'post', 'comment', 'profile', 'xbloom_sync_job')),
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where not is_read;

alter table public.notifications enable row level security;

create policy "users see only their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Notifications are inserted by triggers/server logic on behalf of other
-- users (e.g. someone liking your recipe inserts a row where user_id is the
-- recipe owner, not the actor) — so INSERT is intentionally not opened to
-- `authenticated` broadly. Application code performing these inserts uses
-- SECURITY DEFINER helper functions added per-feature in later phases
-- (Phase 7), not a blanket client-side insert policy.

-- ---------------------------------------------------------------------- --

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('recipe', 'post', 'comment', 'user')),
  target_id uuid not null,
  reason text not null check (reason in
    ('spam', 'harassment', 'off_topic', 'misinformation', 'inappropriate_content', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);
create index reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;

create policy "reporters see their own reports; moderators see all"
  on public.reports for select
  using (auth.uid() = reporter_id or (select private.has_role('admin')) or (select private.has_role('moderator')));

create policy "authenticated users file reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

create policy "moderators update report status"
  on public.reports for update
  using ((select private.has_role('admin')) or (select private.has_role('moderator')))
  with check ((select private.has_role('admin')) or (select private.has_role('moderator')));

-- ---------------------------------------------------------------------- --

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create index blocks_blocker_id_idx on public.blocks (blocker_id);

alter table public.blocks enable row level security;

create policy "users see only their own block list"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "users create their own blocks"
  on public.blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "users remove their own blocks"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- ---------------------------------------------------------------------- --

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('recipe', 'post', 'comment', 'user', 'bean', 'roaster')),
  target_id uuid not null,
  action text not null check (action in ('hide', 'unhide', 'delete', 'warn', 'suspend', 'verify', 'merge')),
  reason text,
  created_at timestamptz not null default now()
);

create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);

alter table public.moderation_actions enable row level security;

create policy "only moderators and admins see moderation actions"
  on public.moderation_actions for select
  using ((select private.has_role('admin')) or (select private.has_role('moderator')));

create policy "only moderators and admins write moderation actions"
  on public.moderation_actions for insert
  with check ((select private.has_role('admin')) or (select private.has_role('moderator')));
