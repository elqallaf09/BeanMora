/**
 * Maps raw Supabase Auth / network errors to a message key under
 * `messages/{ar,en}.json`, so the UI never shows a raw Supabase error
 * string (always English, and sometimes an internal implementation
 * detail) directly to the user. Unrecognized errors fall back to a
 * generic, still-localized message — never the original error text.
 */

/**
 * Supabase's AuthApiError carries a stable, machine-readable `.code`
 * (e.g. "anonymous_provider_disabled", "over_request_rate_limit") and an
 * HTTP `.status`, in addition to `.message`. `.code` is the more reliable
 * signal — `.message` text is meant for humans and isn't guaranteed
 * stable across Supabase versions — so every check below prefers `.code`/
 * `.status` first and only falls back to a `.message` substring match for
 * errors that have never had a stable code (e.g. "Invalid login
 * credentials", which Supabase still returns as message-only).
 */
function extractErrorDetails(error: unknown): {
  message: string;
  code: string;
  status: number | null;
} {
  let message = "";
  let code = "";
  let status: number | null = null;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  if (error && typeof error === "object") {
    // Duck-type `.message`/`.code`/`.status` too — Supabase's
    // AuthError/AuthApiError are Error subclasses in practice, but this
    // keeps mapping correct even for a plain `{ message, code, status }`
    // shape (e.g. across a serialization boundary).
    if (!message && "message" in error && typeof (error as { message: unknown }).message === "string") {
      message = (error as { message: string }).message;
    }
    if ("code" in error && typeof (error as { code: unknown }).code === "string") {
      code = (error as { code: string }).code;
    }
    if ("status" in error && typeof (error as { status: unknown }).status === "number") {
      status = (error as { status: number }).status;
    }
  }

  return { message: message.toLowerCase(), code: code.toLowerCase(), status };
}

function isNetworkError(details: { message: string }): boolean {
  const { message } = details;
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed") ||
    message.includes("err_internet_disconnected") ||
    message.includes("err_network")
  );
}

function isRateLimitError(details: { message: string; code: string; status: number | null }): boolean {
  const { message, code, status } = details;
  return (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "over_sms_send_rate_limit" ||
    status === 429 ||
    message.includes("too many requests") ||
    message.includes("rate limit")
  );
}

/** For password/Google login on the Login page. */
export function mapLoginErrorToMessageKey(error: unknown): string {
  const details = extractErrorDetails(error);
  const { message, code } = details;

  if (isNetworkError(details)) return "errors.network";
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "auth.invalidCredentials";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "auth.emailNotConfirmed";
  }
  if (isRateLimitError(details)) return "auth.tooManyRequests";
  return "errors.generic";
}

/**
 * For the "Continue as guest" action specifically. Distinguishes the four
 * cases the product spec calls out separately: the anonymous provider
 * being turned off in the Supabase dashboard, a network failure, a rate
 * limit, and anything else (unexpected auth failure) — each maps to its
 * own localized message rather than one blanket "something went wrong".
 */
export function mapGuestErrorToMessageKey(error: unknown): string {
  const details = extractErrorDetails(error);
  const { message, code } = details;

  if (isNetworkError(details)) return "auth.guestErrorNetwork";

  if (
    code === "anonymous_provider_disabled" ||
    code === "provider_disabled" ||
    code === "signup_disabled" ||
    message.includes("anonymous sign-ins are disabled") ||
    message.includes("anonymous provider is disabled") ||
    message.includes("signups not allowed")
  ) {
    return "auth.guestErrorUnavailable";
  }

  if (isRateLimitError(details)) return "auth.tooManyRequests";

  return "auth.guestErrorGeneric";
}
