import type { CoffeeCourseGroup, CoffeeLesson } from './coffee-curriculum';
import { assistantSafeUrl } from './coffee-assistant';
import { normalizeSearch } from './deepSearch';

export interface CoffeeLessonContent {
  lessons: CoffeeLesson[];
  phrases: { lessonId: string; phrase: string }[];
}
export const emptyCoffeeLessonContent: CoffeeLessonContent = { lessons: [], phrases: [] };
const groups = new Set(['beans', 'grinding', 'water', 'equipment', 'brewing', 'roasting', 'sensory']);
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, min: number, max: number): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const lessonId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,59}$/.test(value);

/** Database keywords are literal text, never executable regular expressions. */
export function coffeePhrasePattern(phrases: string[]) {
  const escaped = [...new Set(phrases.map(normalizeSearch).filter(Boolean))]
    .map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return escaped.length
    ? new RegExp('(?:^|[^\\p{L}\\p{N}])(?:و|ب|ال)?(?:' + escaped.join('|') + ')(?=$|[^\\p{L}\\p{N}])', 'u')
    : /$a/;
}

/** Validate remote and cached content alike; drafts never reach the expert. */
export function parseCoffeeLessonContent(value: unknown): CoffeeLessonContent {
  const payload = record(value);
  const lessons: CoffeeLesson[] = [];
  for (const raw of (Array.isArray(payload.lessons) ? payload.lessons : []).slice(0, 500)) {
    const row = record(raw);
    if (row.status !== 'published' || row.requires_review !== false || !lessonId(row.id)
      || typeof row.course_group !== 'string' || !groups.has(row.course_group)
      || !text(row.title_ar, 2, 120) || !text(row.title_en, 2, 120)
      || !text(row.body_ar, 100, 2400) || !text(row.body_en, 100, 2400)
      || !text(row.more_ar, 20, 1200) || !text(row.more_en, 20, 1200)
      || !text(row.source_title, 2, 160) || !assistantSafeUrl(row.source_url)
      || !Array.isArray(row.keywords) || row.keywords.length > 24
      || !row.keywords.every(keyword => text(keyword, 2, 120))
      || !Number.isInteger(row.priority) || Number(row.priority) < 1 || Number(row.priority) > 200) continue;
    const sources = (Array.isArray(row.supporting_sources) ? row.supporting_sources : []).slice(0, 8)
      .map(record).flatMap(source => text(source.title, 2, 160) && assistantSafeUrl(source.url)
        ? [{ title: source.title, url: assistantSafeUrl(source.url)! }] : []);
    lessons.push({
      id: row.id, group: row.course_group as CoffeeCourseGroup,
      titles: [row.title_ar, row.title_en], ar: row.body_ar, en: row.body_en,
      more: [row.more_ar, row.more_en], title: row.source_title, url: assistantSafeUrl(row.source_url)!,
      priority: Number(row.priority), keywords: coffeePhrasePattern(row.keywords as string[]), supportingSources: sources,
    });
  }
  const phrases = (Array.isArray(payload.phrases) ? payload.phrases : []).slice(0, 2000)
    .map(record).flatMap(row => row.status === 'published' && lessonId(row.lesson_id) && text(row.phrase, 4, 60)
      ? [{ lessonId: row.lesson_id, phrase: row.phrase }] : []);
  return { lessons, phrases };
}
