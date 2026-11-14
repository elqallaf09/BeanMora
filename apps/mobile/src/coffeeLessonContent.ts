import AsyncStorage from '@react-native-async-storage/async-storage';
import { catalogScope, publicSupabase } from './client';
import { withDeadline } from './requestDeadline';
import { emptyCoffeeLessonContent, parseCoffeeLessonContent, type CoffeeLessonContent } from './core/coffee-lesson-content';

const cacheKey = 'beanmora:coffee-lessons:v1:' + catalogScope;
const maxCacheAge = 24 * 60 * 60 * 1000;
let memory: { content: CoffeeLessonContent; savedAt: number } | undefined;
const columns = 'id,course_group,title_ar,title_en,body_ar,body_en,more_ar,more_en,source_title,source_url,supporting_sources,keywords,priority,status,requires_review';

/** Each question reads published content. Cached lessons are an offline fallback,
 * never a TTL that hides newly published or edited content from online users. */
export async function loadCoffeeLessonContent(signal: AbortSignal): Promise<CoffeeLessonContent> {
  const cached = memory && Date.now() - memory.savedAt < maxCacheAge
    ? Promise.resolve(memory.content)
    : withDeadline(async () => {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (!raw || raw.length > 8_000_000) return emptyCoffeeLessonContent;
      const saved = JSON.parse(raw);
      const age = Date.now() - saved.savedAt;
      return saved.version === 1 && Number.isFinite(age) && age >= 0 && age < maxCacheAge
        ? parseCoffeeLessonContent(saved.payload) : emptyCoffeeLessonContent;
    }, { timeoutMs: 500 }).catch(() => emptyCoffeeLessonContent);
  try {
    const payload = await withDeadline(async requestSignal => {
      if (!publicSupabase) throw new Error('LESSONS_UNAVAILABLE');
      const [lessons, phrases] = await Promise.all([
        publicSupabase.from('coffee_lessons').select(columns, { count: 'exact' })
          .eq('status', 'published').eq('requires_review', false).order('id').limit(500).abortSignal(requestSignal),
        publicSupabase.from('coffee_lesson_phrases').select('lesson_id,phrase,status', { count: 'exact' })
          .eq('status', 'published').order('id').limit(2000).abortSignal(requestSignal),
      ]);
      if (lessons.error || phrases.error || (lessons.count ?? 0) > 500 || (phrases.count ?? 0) > 2000
        || !Array.isArray(lessons.data) || !Array.isArray(phrases.data)) throw new Error('LESSONS_UNAVAILABLE');
      return { lessons: lessons.data, phrases: phrases.data };
    }, { signal, timeoutMs: 3500 });
    const content = parseCoffeeLessonContent(payload);
    const savedAt = Date.now();
    memory = { content, savedAt };
    // A successful empty response replaces the cache too: withdrawn lessons
    // and phrases must disappear when the server is reachable.
    void withDeadline(() => AsyncStorage.setItem(cacheKey, JSON.stringify({ version: 1, savedAt, payload })), { timeoutMs: 1000 }).catch(() => {});
    return content;
  } catch (error) {
    if (signal.aborted) throw error;
    return cached;
  }
}
