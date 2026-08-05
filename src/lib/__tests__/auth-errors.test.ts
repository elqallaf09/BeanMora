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
  it("maps a disabled-anonymous-provider error to the unavailable key", () => {
    expect(
      mapGuestErrorToMessageKey(new Error("Anonymous sign-ins are disabled")),
    ).toBe("auth.guestErrorUnavailable");
  });

  it("maps network failures to the guest-specific network key", () => {
    expect(mapGuestErrorToMessageKey(new TypeError("Failed to fetch"))).toBe(
      "auth.guestErrorNetwork",
    );
  });

  it("falls back to the generic guest error key for anything else", () => {
    expect(mapGuestErrorToMessageKey(new Error("boom"))).toBe("auth.guestErrorGeneric");
  });
});
