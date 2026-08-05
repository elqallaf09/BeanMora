import type { User } from "@supabase/supabase-js";

/**
 * True if `user` is a Supabase anonymous (guest) session.
 *
 * Guest sessions authenticate under the exact same Postgres `authenticated`
 * role as a permanent account (see migration 18) — the only reliable
 * signal for "is this actually a guest" anywhere in the app is this flag,
 * never the presence of a `user` object by itself.
 *
 * Never derive "is this a guest" from `profiles.username` / `profiles.name`
 * — migration 18's `handle_new_user()` fills those with a placeholder
 * ("guest_xxxxxxxx" / "Guest") purely to satisfy the NOT NULL/unique
 * database constraints. That's a storage detail, not a UI signal: always
 * check `is_anonymous` and render the localized "Guest"/"ضيف" label
 * instead of reading those columns for a guest session.
 */
export function isGuestUser(user: Pick<User, "is_anonymous"> | null | undefined): boolean {
  return Boolean(user?.is_anonymous);
}
