import AsyncStorage from '@react-native-async-storage/async-storage';
import { publicSupabase } from './client';
import { applyRemoteCoffeeLessons, remoteCoffeeLessonColumns } from './core/coffee-knowledge';
import { withDeadline } from './requestDeadline';

const cacheKey = 'beanmora.coffee-lessons.v1';
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
    if (cached) applyRemoteCoffeeLessons(JSON.parse(cached));
  } catch {
    // An unreadable cache is ignored; the bundle already answers.
  }
  if (!publicSupabase) return;
  try {
    const { data, error } = await publicSupabase
      .from('coffee_lessons')
      .select(remoteCoffeeLessonColumns)
      .eq('status', 'published')
      .limit(400);
    if (error || !Array.isArray(data)) return;
    applyRemoteCoffeeLessons(data);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // Offline or unavailable: keep the cached or bundled lessons.
  }
}
