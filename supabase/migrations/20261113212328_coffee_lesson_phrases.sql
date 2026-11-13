-- Words and question wordings the coffee expert learns over time (Kuwaiti, Gulf,
-- American and British usage). Each phrase routes a question to a lesson, which
-- may be a bundled lesson with no row in coffee_lessons, so lesson_id is not a
-- foreign key. Phrases are plain text, never regular expressions.
create table public.coffee_lesson_phrases (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null check (lesson_id ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  phrase text not null check (char_length(btrim(phrase)) between 4 and 60),
  dialect text not null check (dialect in ('kuwaiti','gulf','american','british','arabic','english')),
  example text check (example is null or char_length(example) <= 200),
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'published' check (status in ('published','archived')),
  created_at timestamptz not null default now()
);
create unique index coffee_lesson_phrases_unique on public.coffee_lesson_phrases (lesson_id, lower(btrim(phrase)));
comment on table public.coffee_lesson_phrases is 'Dialect words and question wordings that route a member question to a coffee lesson.';
comment on column public.coffee_lesson_phrases.phrase is 'Distinctive plain phrase (not regex). Matched as whole words after the app''s Arabic/Latin normalisation.';
comment on column public.coffee_lesson_phrases.example is 'A full example question using the phrase, for reviewers.';

alter table public.coffee_lesson_phrases enable row level security;
create policy "published coffee lesson phrases are publicly readable" on public.coffee_lesson_phrases
  for select using (status = 'published' or (select private.has_role('admin')) or (select private.has_role('moderator')));
create policy "only admins write coffee lesson phrases" on public.coffee_lesson_phrases
  for all using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));
revoke all on public.coffee_lesson_phrases from anon, authenticated;
grant select on public.coffee_lesson_phrases to anon;
grant select, insert, update, delete on public.coffee_lesson_phrases to authenticated;
