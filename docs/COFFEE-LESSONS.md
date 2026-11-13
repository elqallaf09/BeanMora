# Coffee expert lessons

The coffee expert answers educational questions from two layers:

1. **Bundled lessons** in `src/lib/coffee-curriculum.ts` and `coffee-knowledge.ts`.
   They ship inside the app, work offline and are covered by the test suite.
2. **Database lessons** in `public.coffee_lessons`. The app reads the published,
   reviewed rows on start, caches them for offline use, and applies them over
   the bundle. No app release is needed for these to reach users running a
   version that includes this loader.

## How a database row is applied

- A row whose `id` matches a bundled lesson **replaces its text and sources**
  and keeps the bundled routing. Its `keywords` are added as extra phrases.
- A row with a new `id` **adds a lesson**. It is reached by its exact title or
  by any phrase in `keywords`.
- `keywords` are plain phrases, not regular expressions. They are compared
  after the usual normalisation (أ/إ/آ → ا, ة → ه, ى → ي, lower case), so write
  them the way a member would type them. Phrases shorter than 3 characters are
  ignored.
- When several lessons match a question, the highest `priority` wins.
- A row is visible to the app only when `status = 'published'` and
  `requires_review = false`. New rows default to draft and unreviewed.
- A row that fails validation in the app (missing text, non-https source,
  unknown group) is skipped and the bundled lesson is used instead.

## Adding a lesson

```sql
insert into public.coffee_lessons
  (id, course_group, title_ar, title_en, body_ar, body_en, more_ar, more_en,
   source_title, source_url, keywords, priority)
values
  ('siphon', 'brewing', 'السايفون', 'Siphon brewing',
   '…', '…', '…', '…',
   'Publisher — Page title', 'https://…',
   array['سايفون', 'siphon'], 105);

-- after reading it back and checking the source:
update public.coffee_lessons
   set status = 'published', requires_review = false, last_verified_at = now()
 where id = 'siphon';
```

Every figure in a lesson must come from the cited page.

## Seed

`supabase/seed/coffee_lessons.sql` is generated from the bundled lessons and
uses `on conflict (id) do nothing`, so it never overwrites an edited row.
A test keeps it in sync; regenerate it after changing a bundled lesson:

```
UPDATE_COFFEE_LESSONS_SEED=1 npx vitest run src/lib/coffee-lessons-seed.test.ts
```

Once a lesson exists in the database, the database copy is what online users
see. Changing the bundled text later does not change that row; update the row
too.

## Learned wordings

`public.coffee_lesson_phrases` holds words and question wordings (Kuwaiti,
Gulf, American, British…) that route a question to a lesson. `lesson_id` may
name a bundled lesson that has no row in `coffee_lessons`.

- A phrase is plain text and matches as whole words; a leading Arabic prefix
  (و، بـ، لـ، الـ) is allowed.
- The app ignores phrases shorter than four characters, so a generic word
  cannot capture unrelated questions. Store the distinctive part of a
  question in `phrase` and the full sentence in `example`.
- To withdraw a phrase, set `status = 'archived'`.

A daily scheduled task adds wordings and new sourced lessons; each run records
a `research_jobs` row whose `job_key` starts with `coffee_expert_learning_`.
