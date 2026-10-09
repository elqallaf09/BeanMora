import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { setMemberFavorite } from "../member-social";
const owner = "33333333-3333-4333-8333-333333333333";
const recipe = "11111111-1111-4111-8111-111111111111";
function fixture(confirm = true) {
  let saved = false;
  const calls: { method: string; url: URL; prefer: string }[] = [];
  const db = createClient(
    "https://isolated.example.test",
    "isolated-public-fixture",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          const url = new URL(String(input)),
            method = init?.method ?? "GET";
          calls.push({
            method,
            url,
            prefer: new Headers(init?.headers).get("prefer") ?? "",
          });
          if (method === "POST") saved = true;
          if (method === "DELETE") saved = false;
          const body =
            method === "GET"
              ? saved && confirm
                ? { recipe_id: recipe }
                : null
              : null;
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
    },
  );
  vi.spyOn(db.auth, "getUser").mockResolvedValue({
    data: { user: { id: owner, is_anonymous: false } as never },
    error: null,
  });
  return { db, calls };
}
it("repeated saves use INSERT DO NOTHING and confirm only the signed-in member’s row", async () => {
  const { db, calls } = fixture();
  await setMemberFavorite(db, owner, recipe, true);
  await setMemberFavorite(db, owner, recipe, true);
  expect(
    calls
      .filter((c) => c.method === "POST")
      .every((c) => c.prefer.includes("resolution=ignore-duplicates")),
  ).toBe(true);
  expect(
    calls
      .filter((c) => c.method === "GET")
      .every(
        (c) =>
          c.url.searchParams.get("user_id") === "eq." + owner &&
          c.url.searchParams.get("recipe_id") === "eq." + recipe,
      ),
  ).toBe(true);
  expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  await setMemberFavorite(db, owner, recipe, false);
  expect(calls.at(-2)?.method).toBe("DELETE");
  expect(calls.at(-2)?.url.searchParams.get("user_id")).toBe("eq." + owner);
});
it("an HTTP success without a readable saved row never confirms a save", async () => {
  const { db } = fixture(false);
  await expect(setMemberFavorite(db, owner, recipe, true)).rejects.toThrow(
    "FAVORITE_SAVE",
  );
});
it("a changed identity cannot write a favorite for the previous account", async () => {
  const { db, calls } = fixture();
  await expect(setMemberFavorite(db, recipe, recipe, true)).rejects.toThrow(
    "MEMBER_SIGN_IN_REQUIRED",
  );
  expect(calls).toEqual([]);
});
