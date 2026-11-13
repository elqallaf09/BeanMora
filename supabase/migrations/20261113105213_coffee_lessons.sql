-- Coffee expert lessons, editable without an app release.
-- The app bundles a reviewed offline copy; a published row here overrides the
-- bundled lesson with the same id, and a new id adds a lesson. Routing phrases
-- are plain text (never regular expressions) and are matched after the app's
-- usual Arabic/Latin normalisation.
create table public.coffee_lessons (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  course_group text not null check (course_group in ('beans','grinding','water','equipment','brewing','roasting','sensory')),
  title_ar text not null check (char_length(title_ar) between 2 and 120),
  title_en text not null check (char_length(title_en) between 2 and 120),
  body_ar text not null check (char_length(body_ar) between 100 and 2400),
  body_en text not null check (char_length(body_en) between 100 and 2400),
  more_ar text not null check (char_length(more_ar) between 20 and 1200),
  more_en text not null check (char_length(more_en) between 20 and 1200),
  source_title text not null check (char_length(source_title) between 2 and 160),
  source_url text not null check (source_url ~ '^https://[^\s]+$'),
  supporting_sources jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_sources) = 'array'),
  keywords text[] not null default '{}'::text[] check (cardinality(keywords) <= 24),
  priority integer not null default 60 check (priority between 1 and 200),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  requires_review boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.coffee_lessons is 'Sourced bilingual coffee-expert lessons. Published, reviewed rows override or extend the lessons bundled in the app.';
comment on column public.coffee_lessons.keywords is 'Plain routing phrases (not regex). A question containing one of them is routed to this lesson.';

create trigger coffee_lessons_set_updated_at before update on public.coffee_lessons
  for each row execute function public.set_updated_at();

alter table public.coffee_lessons enable row level security;

create policy "published reviewed coffee lessons are publicly readable" on public.coffee_lessons
  for select using (
    (status = 'published' and not requires_review)
    or (select private.has_role('admin'))
    or (select private.has_role('moderator'))
  );
create policy "only admins write coffee lessons" on public.coffee_lessons
  for all using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));

revoke all on public.coffee_lessons from anon, authenticated;
grant select on public.coffee_lessons to anon;
grant select, insert, update, delete on public.coffee_lessons to authenticated;
