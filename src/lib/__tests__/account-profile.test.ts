import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  accountCountries,
  accountCountryFlag,
  accountCountryName,
  loadAccountDetails,
  normalizeAccountPhone,
  saveAccountDetails,
  signupDetails,
  usernameAvailable,
} from "../account-profile";

const valid = {
  country: "JP",
  username: " coffee_lover ",
  email: " member@example.test ",
  password: "fixture_password",
  confirmation: "fixture_password",
  phone: "００８１ ９０-１２３４-５６７８",
};
describe("profile identity and private signup contact", () => {
  it("supports 249 searchable regions and derives only selected valid flags", () => {
    expect(accountCountries).toHaveLength(249);
    expect(new Set(accountCountries.map((c) => c.code)).size).toBe(249);
    expect(accountCountries.every((c) => c.ar && c.en && c.ja)).toBe(true);
    expect(accountCountryFlag("KW")).toBe("🇰🇼");
    expect(accountCountryFlag("JP")).toBe("🇯🇵");
    expect(accountCountryFlag("ZZ")).toBe("");
    expect(accountCountryFlag(null)).toBe("");
    expect(accountCountryName("JP", "ja")).toBe("日本");
  });
  it("normalizes Arabic, Persian and fullwidth digits and international prefixes", () => {
    expect(normalizeAccountPhone("+٩٦٥ ٥٠٠٠-٠٠٠٠")).toBe("+96550000000");
    expect(normalizeAccountPhone("۰۰۹۶۵ ۵۰۰۰۰۰۰۰")).toBe("+96550000000");
    expect(signupDetails(valid, "ja")).toEqual({
      email: "member@example.test",
      password: "fixture_password",
      metadata: {
        name: "coffee_lover",
        username: "coffee_lover",
        country: "JP",
        phone: "+819012345678",
        language: "ja",
      },
    });
    for (const phone of [
      "50000000",
      "+012345678",
      "+1234",
      "+1234567890123456",
      "+96550000000x",
      "",
    ])
      expect(() => normalizeAccountPhone(phone)).toThrow("ACCOUNT_PHONE");
  });
  it("rejects missing / invalid signup fields before sending Auth requests", () => {
    for (const [field, value, code] of [
      ["email", "invalid", "EMAIL"],
      ["username", "two words", "USERNAME"],
      ["country", "ZZ", "COUNTRY"],
      ["password", "short", "PASSWORD"],
      ["confirmation", "different", "CONFIRMATION"],
      ["phone", "invalid", "PHONE"],
    ] as const) {
      expect(() => signupDetails({ ...valid, [field]: value }, "ja")).toThrow(
        "ACCOUNT_" + code,
      );
    }
  });
  function fixture(owner = "owner") {
    let country = "JP",
      phone = "+819012345678";
    const user = () => ({
      id: owner,
      is_anonymous: false,
      user_metadata: { phone, country },
    });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { country }, error: null })),
      limit: vi.fn(async () => ({ data: [], error: null })),
    };
    const update = vi.fn(
      async ({ data }: { data: { phone: string; country: string } }) => {
        country = data.country;
        phone = data.phone;
        return { data: { user: user() }, error: null };
      },
    );
    const db = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: user() }, error: null })),
        updateUser: update,
      },
      from: vi.fn(() => query),
    };
    return { db: db as unknown as SupabaseClient, query, update };
  }
  it("loads the owner phone privately and saves it through Auth, with persisted country verification", async () => {
    const f = fixture();
    expect(await loadAccountDetails(f.db, "owner")).toEqual({
      country: "JP",
      phone: "+819012345678",
    });
    expect(
      await saveAccountDetails(f.db, "owner", "KW", "+٩٦٥ ٥٠٠٠٠٠٠٠"),
    ).toEqual({ country: "KW", phone: "+96550000000" });
    expect(f.update).toHaveBeenCalledWith({
      data: { country: "KW", phone: "+96550000000" },
    });
    expect(f.query.select).toHaveBeenCalledWith("country");
    expect(f.query.eq).toHaveBeenCalledWith("id", "owner");
    await expect(saveAccountDetails(f.db, "owner", "KW", "")).resolves.toEqual({
      country: "KW",
      phone: "",
    });
  });
  it("prevents editing or loading another account", async () => {
    const f = fixture("different-user");
    await expect(loadAccountDetails(f.db, "owner")).rejects.toThrow(
      "MEMBER_SIGN_IN_REQUIRED",
    );
    await expect(
      saveAccountDetails(f.db, "owner", "KW", valid.phone),
    ).rejects.toThrow("MEMBER_SIGN_IN_REQUIRED");
    expect(f.update).not.toHaveBeenCalled();
  });
  it("checks username availability without attempting account creation", async () => {
    const f = fixture();
    expect(await usernameAvailable(f.db, "coffee_lover")).toBe(true);
    f.query.limit.mockResolvedValueOnce({
      data: [{ username: "coffee_lover" }] as never[],
      error: null,
    });
    expect(await usernameAvailable(f.db, "coffee_lover")).toBe(false);
  });
});
