/**
 * Pure helpers for editing an Espresso Dial-In attempt (the "Previous
 * Attempts" timeline on the espresso hub). Kept separate from the UI so the
 * tasting-note vocabulary and input validation are unit-testable without
 * mocking Supabase or React. Ratio math itself is shared with the rest of
 * the app via `calculateRatio` in `@/lib/recipe-calculations` — not
 * duplicated here.
 */

/** The six dial-in outcome tags a user can attach to a saved attempt.
 * 'custom' means "none of these fit" — the actual description lives in the
 * attempt's existing freeform `notes` column, not a second text field. */
export const TASTING_NOTES = ["balanced", "too_sour", "too_bitter", "too_fast", "too_slow", "custom"] as const;

export type TastingNote = (typeof TASTING_NOTES)[number];

export function isTastingNote(value: string | null | undefined): value is TastingNote {
  return !!value && (TASTING_NOTES as readonly string[]).includes(value);
}

export interface AttemptInput {
  doseGrams: number;
  waterGrams: number;
  timeSeconds: number;
}

/**
 * An edited attempt must keep every measured quantity strictly positive —
 * a zero, negative, or non-numeric dose/yield/time isn't a real shot, it's
 * a blank or broken form state and must not be saved over the real row.
 */
export function isValidAttemptInput(input: AttemptInput): boolean {
  return (
    Number.isFinite(input.doseGrams) &&
    input.doseGrams > 0 &&
    Number.isFinite(input.waterGrams) &&
    input.waterGrams > 0 &&
    Number.isFinite(input.timeSeconds) &&
    input.timeSeconds > 0
  );
}
