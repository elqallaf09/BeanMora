import { describe, expect, it } from "vitest";
import { mapGuestErrorToMessageKey, mapLoginErrorToMessageKey } from "@/lib/auth-errors";

describe("mapLoginErrorToMessageKey", () => {
  it("maps Supabase's raw 'Invalid login credentials' to a localized key", () => {
    expect(mapLoginErrorToMessageKey(new Error("Invalid login credentials"))).toBe(
      "auth.invalidCredentials",
    );
  });

  it("maps an unconfirmed-email error to a localized key", () => {
    expect(mapLoginErrorToMessageKey(new Error("Email not confirmed"))).toBe(
      "auth.emailNotConfirmed",
    );
  });

  it("maps rate-limit errors to a localized key", () => {
    expect(mapLoginErrorToMessageKey(new Error("Too many requests"))).toBe("auth.tooManyRequests");
  });

  it("maps network failures to the shared network error key", () => {
    expect(mapLoginErrorToMessageKey(new TypeError("Failed to fetch"))).toBe("errors.network");
  });

  it("falls back to a generic localized key for unrecognized errors, never the raw message", () => {
    const key = mapLoginErrorToMessageKey(new Error("relation \"public.profiles\" does not exist"));
    expect(key).toBe("errors.generic");
    expect(key).not.toContain("relation");
  });

  it("handles non-Error throwables without crashing", () => {
    expect(mapLoginErrorToMessageKey("a plain string error")).toBe("errors.generic");
    expect(mapLoginErrorToMessageKey(undefined)).toBe("errors.generic");
  });
});

describe("mapGuestErrorToMessageKey", () => {
  it("maps a disabled-anonymous-provider error (by message) to the unavailable key", () => {
    expect(
      mapGuestErrorToMessageKey(new Error("Anonymous sign-ins are disabled")),
    ).toBe("auth.guestErrorUnavailable");
  });

  // This is the actual bug report this test guards against: Supabase's
  // AuthApiError carries a stable `.code` ("anonymous_provider_disabled")
  // in addition to `.message` — a plain Error instance built from just a
  // string (as in the test above) never has that `.code`, so this case
  // exercises the real shape `signInAnonymously()` returns and would have
  // previously fallen through to the generic fallback message.
  it("maps a disabled-anonymous-provider error (by .code) to the unavailable key, even with an unrelated message", () => {
    const error = Object.assign(new Error("Unexpected server error"), {
      code: "anonymous_provider_disabled",
      status: 422,
    });
    expect(mapGuestErrorToMessageKey(error)).toBe("auth.guestErrorUnavailable");
  });

  it("maps network failures to the guest-specific network key", () => {
    expect(mapGuestErrorToMessageKey(new TypeError("Failed to fetch"))).toBe(
      "auth.guestErrorNetwork",
    );
  });

  it("maps a rate-limit error (by .code) to the shared too-many-requests key", () => {
    const error = Object.assign(new Error("Request rate limit reached"), {
      code: "over_request_rate_limit",
      status: 429,
    });
    expect(mapGuestErrorToMessageKey(error)).toBe("auth.tooManyRequests");
  });

  it("maps a plain 429 status (no matching .code) to the too-many-requests key", () => {
    const error = Object.assign(new Error("Something odd"), { status: 429 });
    expect(mapGuestErrorToMessageKey(error)).toBe("auth.tooManyRequests");
  });

  it("falls back to the generic guest error key for an unexpected auth failure", () => {
    expect(mapGuestErrorToMessageKey(new Error("boom"))).toBe("auth.guestErrorGeneric");
  });

  it("duck-types a plain { message, code, status } object (not an Error instance)", () => {
    expect(
      mapGuestErrorToMessageKey({
        message: "Anonymous sign-ins are disabled",
        code: "anonymous_provider_disabled",
        status: 422,
      }),
    ).toBe("auth.guestErrorUnavailable");
  });
});
