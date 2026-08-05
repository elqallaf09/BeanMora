/**
 * Maps raw Supabase Auth / network errors to a message key under
 * `messages/{ar,en}.json`, so the UI never shows a raw Supabase error
 * string (always English, and sometimes an internal implementation
 * detail) directly to the user. Unrecognized errors fall back to a
 * generic, still-localized message — never the original error text.
 */

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  // Supabase's AuthError/AuthApiError are Error subclasses in practice,
  // but duck-type on `.message` too so a plain `{ message, status }`
  // shape (e.g. across a serialization boundary) still maps correctly
  // instead of silently falling through to the generic message.
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "";
}

function isNetworkError(normalizedMessage: string): boolean {
  return (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("networkerror") ||
    normalizedMessage.includes("network request failed") ||
    normalizedMessage.includes("load failed") ||
    normalizedMessage.includes("err_internet_disconnected") ||
    normalizedMessage.includes("err_network")
  );
}

/** For password/Google login on the Login page. */
export function mapLoginErrorToMessageKey(error: unknown): string {
  const normalized = errorMessage(error).toLowerCase();

  if (isNetworkError(normalized)) return "errors.network";
  if (normalized.includes("invalid login credentials")) return "auth.invalidCredentials";
  if (normalized.includes("email not confirmed")) return "auth.emailNotConfirmed";
  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("429")
  ) {
    return "auth.tooManyRequests";
  }
  return "errors.generic";
}

/** For the "Continue as guest" action specifically. */
export function mapGuestErrorToMessageKey(error: unknown): string {
  const normalized = errorMessage(error).toLowerCase();

  if (isNetworkError(normalized)) return "auth.guestErrorNetwork";
  if (
    normalized.includes("anonymous sign-ins are disabled") ||
    normalized.includes("anonymous provider is disabled") ||
    normalized.includes("signups not allowed")
  ) {
    return "auth.guestErrorUnavailable";
  }
  return "auth.guestErrorGeneric";
}
