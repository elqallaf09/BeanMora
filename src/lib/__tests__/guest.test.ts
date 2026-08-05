import { describe, expect, it } from "vitest";
import { isGuestUser } from "@/lib/guest";

describe("isGuestUser", () => {
  it("is true for a session with is_anonymous: true", () => {
    expect(isGuestUser({ is_anonymous: true })).toBe(true);
  });

  it("is false for a permanent session (is_anonymous: false)", () => {
    expect(isGuestUser({ is_anonymous: false })).toBe(false);
  });

  it("is false when is_anonymous is undefined (older session shape)", () => {
    expect(isGuestUser({ is_anonymous: undefined })).toBe(false);
  });

  it("is false for a null/undefined user (signed out)", () => {
    expect(isGuestUser(null)).toBe(false);
    expect(isGuestUser(undefined)).toBe(false);
  });
});
