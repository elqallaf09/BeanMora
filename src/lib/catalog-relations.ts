/** Normalize a to-one PostgREST relation without discarding its inferred fields. */
export function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
