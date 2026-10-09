import type { SupabaseClient } from "@supabase/supabase-js";
import { accountCountries } from "./account-countries";
import { requireMember } from "./member-contributions";

export { accountCountries } from "./account-countries";
export type AccountLocale = "ar" | "en" | "ja";
export const validAccountCountry = (value: string): boolean =>
  accountCountries.some((c) => c.code === value);
export function accountCountryName(
  value: string | null | undefined,
  locale: AccountLocale,
): string {
  return accountCountries.find((c) => c.code === value)?.[locale] ?? "";
}
export function accountCountryFlag(value: string | null | undefined): string {
  return value && validAccountCountry(value)
    ? String.fromCodePoint(...[...value].map((c) => 127397 + c.charCodeAt(0)))
    : "";
}
export function normalizeAccountPhone(value: string): string {
  const digits = value
    .replace(/[٠-٩۰-۹０-９]/g, (c) => {
      const n = c.charCodeAt(0);
      return String(
        n >= 0xff10 ? n - 0xff10 : n >= 0x6f0 ? n - 0x6f0 : n - 0x660,
      );
    })
    .trim()
    .replace(/[\s().-]/g, "")
    .replace(/^00/, "+");
  if (!/^\+[1-9][0-9]{7,14}$/.test(digits)) throw new Error("ACCOUNT_PHONE");
  return digits;
}
export function signupDetails(
  values: {
    country: string;
    username: string;
    email: string;
    password: string;
    confirmation: string;
    phone: string;
  },
  language: AccountLocale,
) {
  const email = values.email.trim(),
    username = values.username.trim().toLowerCase().replace(/^@/, "");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("ACCOUNT_EMAIL");
  if (!/^[a-z0-9_]{3,30}$/.test(username)) throw new Error("ACCOUNT_USERNAME");
  if (!validAccountCountry(values.country)) throw new Error("ACCOUNT_COUNTRY");
  if (values.password.length < 8) throw new Error("ACCOUNT_PASSWORD");
  if (values.password !== values.confirmation)
    throw new Error("ACCOUNT_CONFIRMATION");
  const phone = normalizeAccountPhone(values.phone);
  return {
    email,
    password: values.password,
    metadata: {
      name: username,
      username,
      country: values.country,
      phone,
      language,
    },
  };
}
export async function usernameAvailable(
  db: SupabaseClient,
  value: string,
): Promise<boolean> {
  if (!/^[a-z0-9_]{3,30}$/.test(value)) return false;
  const { data, error } = await db
    .from("profiles")
    .select("username")
    .eq("username", value)
    .limit(1);
  if (error) throw new Error("ACCOUNT_LOAD");
  return Array.isArray(data) && data.length === 0;
}
export async function loadAccountDetails(db: SupabaseClient, owner: string) {
  const auth = await db.auth.getUser();
  const user = auth.data.user;
  if (auth.error || !user || user.is_anonymous || user.id !== owner)
    throw new Error("MEMBER_SIGN_IN_REQUIRED");
  const { data, error } = await db
    .from("profiles")
    .select("country")
    .eq("id", owner)
    .single();
  if (error) throw new Error("ACCOUNT_LOAD");
  return {
    country: validAccountCountry(data?.country ?? "")
      ? (data.country as string)
      : "",
    phone:
      typeof user.user_metadata?.phone === "string"
        ? user.user_metadata.phone
        : "",
  };
}
export async function saveAccountDetails(
  db: SupabaseClient,
  owner: string,
  country: string,
  phone: string,
) {
  await requireMember(db, owner);
  if (!validAccountCountry(country)) throw new Error("ACCOUNT_COUNTRY");
  const normalized = phone.trim() ? normalizeAccountPhone(phone) : "";
  // Contact data stays in the owner's Auth metadata. It is never added to public profiles.
  const { data, error } = await db.auth.updateUser({
    data: { country, phone: normalized },
  });
  if (
    error ||
    data.user?.id !== owner ||
    data.user.user_metadata?.phone !== normalized
  )
    throw new Error("ACCOUNT_SAVE");
  const check = await db
    .from("profiles")
    .select("country")
    .eq("id", owner)
    .single();
  if (check.error || check.data?.country !== country)
    throw new Error("ACCOUNT_SAVE");
  return { country, phone: normalized };
}
