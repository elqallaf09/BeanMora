# Coffee Expert editorial content

Coffee Expert reads the existing `public.coffee_lessons` and
`public.coffee_lesson_phrases` tables in the BeanMora Supabase project.
New published lessons, edits, and dialect phrases are fetched for the next
educational question, including “tell me more”, without a content release.

## Publishing

- Use a stable lesson `id`, one of the existing course groups, Arabic and English
  titles, bodies and practical exercises, and a verified HTTPS primary source.
- `supporting_sources` contains `{ "title": "...", "url": "https://..." }` objects.
- `keywords` contains up to 24 literal phrases; regular expressions are not supported.
- Set `status = 'published'` and `requires_review = false` only after editorial
  review. Maintain `last_verified_at` when reviewing source facts.
- Publish dialect variants in `coffee_lesson_phrases`, referring to either a
  database lesson ID or an existing bundled lesson ID. Orphan phrases do nothing.
- A database lesson with the same ID overrides the bundled text and sources.
  A new ID adds a new topic. There is no need to edit the bundled curriculum or
  language registry for Arabic/English database lessons. Other locales use their
  existing translations when available and otherwise the English content.

## Loading and failure behavior

The app uses its existing public client and existing read-only RLS policies.
Queries explicitly filter published, reviewed lessons and published phrases.
Remote content and cached content are both validated. HTTPS sources, text
lengths, group names and priorities are checked; keyword patterns are escaped.
No schema, privileges, credentials or database write APIs are added.

Both table reads run concurrently under a 3.5-second deadline. Successful reads,
including empty results, replace the fallback cache. A failed read uses the
last successful snapshot for up to 24 hours, then the bundled lessons alone.
The cache is scoped to the Supabase URL. The read size is bounded at 500 lessons
and 2,000 phrases; larger catalogs fail closed to the fallback instead of
silently caching a truncated result. Calculations still run without a request.

This change must first be delivered to each client. Already-installed native
versions that lack this reader cannot acquire it through a database edit.
Once the reader is present, subsequent lesson publication is a data operation.
Native store distribution and physical-device testing are separate from the
web deployment and automated iOS/Android bundle checks.

## Verification

Unit coverage checks new lessons, overrides, Arabic/English follow-ups, dialects,
drafts, malformed data, safe links, literal matching, and shopping/calculation
routing. Browser coverage changes a lesson between questions without reloading,
checks both languages, reloads offline to read the persisted copy, and verifies
that a successful empty response removes the remote lesson from the cache.

Production already contains `processing-comparison` and five earlier lessons.
`geisha-variety` is useful for live verification because its detailed lesson is
not bundled in the static curriculum. Ask “شنو قيشا؟” and verify the database
lesson title, body, and source rather than accepting a generic varieties answer.
