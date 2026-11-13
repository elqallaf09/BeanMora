import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { applyRemoteCoffeeLessons, coffeeLearningTopics, coffeeLessonById } from './coffee-knowledge';

/**
 * supabase/seed/coffee_lessons.sql is generated from the bundled curriculum so
 * the database starts with the same reviewed lessons the app ships offline.
 * Regenerate with: UPDATE_COFFEE_LESSONS_SEED=1 npx vitest run src/lib/coffee-lessons-seed.test.ts
 */
const seedPath = resolve(process.cwd(), 'supabase/seed/coffee_lessons.sql');
const quote = (value: string) => "'" + value.replace(/'/g, "''") + "'";
function seedSql() {
  applyRemoteCoffeeLessons(null);
  const rows = coffeeLearningTopics('ar').map(topic => {
    const ar = coffeeLessonById(topic.id, 'ar')!, en = coffeeLessonById(topic.id, 'en')!;
    return 'insert into public.coffee_lessons (id, course_group, title_ar, title_en, body_ar, body_en, more_ar, more_en, source_title, source_url, supporting_sources, priority, status, requires_review, last_verified_at)\nvalues ('
      + [topic.id, topic.group, ar.title, en.title, ar.answer, en.answer, ar.more, en.more, en.source.title, en.source.url].map(quote).join(', ')
      + `, ${quote(JSON.stringify(en.sources.slice(1)))}::jsonb, ${topic.priority}, 'published', false, now())\non conflict (id) do nothing;`;
  });
  return [
    '-- Generated from src/lib/coffee-curriculum.ts and coffee-knowledge.ts; do not edit by hand.',
    '-- Seeds the bundled, reviewed lessons. Existing rows are never overwritten, so',
    '-- edits made in the database survive a re-run.',
    ...rows, '',
  ].join('\n');
}
it('keeps the database seed identical to the bundled lessons', () => {
  const sql = seedSql();
  if (process.env.UPDATE_COFFEE_LESSONS_SEED) writeFileSync(seedPath, sql);
  expect(readFileSync(seedPath, 'utf8')).toBe(sql);
  expect(sql.match(/^insert into/gm)?.length).toBe(coffeeLearningTopics('en').length);
});
