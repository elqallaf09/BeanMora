import AsyncStorage from '@react-native-async-storage/async-storage';
import { publicSupabase } from './client';
import { applyRemoteCoffeeLessons, remoteCoffeeLessonColumns, remoteCoffeePhraseColumns } from './core/coffee-knowledge';
import { withDeadline } from './requestDeadline';

const cacheKey = 'beanmora.coffee-lessons.v2';
let loading: Promise<void> | null = null;

/**
 * Published lessons from the database extend the bundled curriculum. The last
 * successful copy is cached so they keep working offline; every failure leaves
 * the bundled lessons untouched.
 */
export function loadRemoteCoffeeLessons(): Promise<void> {
  return (loading ??= refresh());
}

async function refresh() {
  try {
    const cached = await withDeadline(() => AsyncStorage.getItem(cacheKey), { timeoutMs: 2000 });
    if (cached) {
      const stored = JSON.parse(cached);
      applyRemoteCoffeeLessons(stored?.lessons, stored?.phrases);
    }
  } catch {
    // An unreadable cache is ignored; the bundle already answers.
  }
  if (!publicSupabase) return;
  try {
    const { data: lessons, error } = await publicSupabase
      .from('coffee_lessons')
      .select(remoteCoffeeLessonColumns)
      .eq('status', 'published')
      .limit(400);
    if (error || !Array.isArray(lessons)) return;
    // Learned wordings arrive in pages; a failed page keeps what was read so far.
    const phrases: unknown[] = [];
    for (let page = 0; page < 10; page++) {
      const { data, error: pageError } = await publicSupabase
        .from('coffee_lesson_phrases')
        .select(remoteCoffeePhraseColumns)
        .eq('status', 'published')
        .order('created_at')
        .range(page * 1000, page * 1000 + 999);
      if (pageError || !Array.isArray(data)) break;
      phrases.push(...data);
      if (data.length < 1000) break;
    }
    applyRemoteCoffeeLessons(lessons, phrases);
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ lessons, phrases }));
  } catch {
    // Offline or unavailable: keep the cached or bundled lessons.
  }
}
