import { setLanguage } from './settings';
import { test, expect, type Page, type Route } from "@playwright/test";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "member@example.test",
  is_anonymous: false,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-01-01T00:00:00Z",
};
const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
const token = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: user.id, role: "authenticated", is_anonymous: false, exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
const bean = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "member-test",
  name_en: "Member coffee",
  name_ar: "بن العضو",
  requires_review: false,
  is_published: true,
  origin_country: "Brazil",
  images: [],
  flavors: [],
};
const gear = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Member grinder",
  category: "grinder",
  requires_review: false,
  specifications: {},
  suitable_brew_methods: [],
};
async function reply(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}
async function signedIn(page: Page) {
  await page.goto("/");
  await setLanguage(page, 'en');
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("isolated-fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(user.email, { exact: true })).toBeVisible();
}
async function more(page: Page, name: string) {
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
}
function authentication(path: string) {
  return path.endsWith("/token")
    ? {
        access_token: token,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "isolated-refresh",
        user,
      }
    : path.endsWith("/user")
      ? user
      : null;
}
for (const kind of ["recipe", "bean"] as const)
  test(`member ${kind}: validated photo and complete details, failed save retries the same submission`, async ({
    page,
  }) => {
    const writes: Record<string, any>[] = [];
    const uploads: string[] = [];
    await page.route("https://mobilefixture.supabase.co/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const auth = authentication(path);
      if (auth) return reply(route, auth);
      if (path.startsWith("/storage/v1/object/member-media/")) {
        uploads.push(path);
        expect(route.request().headers()["content-type"]).toBe("image/png");
        expect(route.request().postDataBuffer()?.subarray(0, 8)).toEqual(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        );
        return reply(route, { Key: path });
      }
      if (path.endsWith(`/rpc/submit_member_${kind}`)) {
        const data = route.request().postDataJSON();
        writes.push(data);
        return reply(
          route,
          writes.length === 1
            ? { message: "temporary fixture failure" }
            : data.p_id,
          writes.length === 1 ? 503 : 200,
        );
      }
      return reply(route, []);
    });
    await signedIn(page);
    await more(page, kind === "recipe" ? "Add recipe" : "Add coffee");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Check:");
    expect(writes).toHaveLength(0);
    await page
      .getByLabel(kind === "recipe" ? "Recipe name" : "Coffee name", {
        exact: true,
      })
      .fill(kind === "recipe" ? "Member recipe" : "Member coffee");
    if (kind === "recipe") {
      await page.getByLabel("Roaster", { exact: true }).fill("Rawi");
      await page.getByLabel("Coffee name", { exact: true }).fill("Alba");
      await page.getByLabel("Coffee dose (g)", { exact: true }).fill("١٥");
      await page
        .getByLabel("Water or beverage weight (g)", { exact: true })
        .fill("٢٥٠");
      await page
        .getByLabel("Brew steps — one step per line", { exact: true })
        .fill("Bloom with 40 g\nPour the remaining water");
      await page
        .getByLabel("Recipe URL (https://)", { exact: true })
        .fill("https://example.test/recipe");
    } else {
      await page.getByLabel("Roaster name", { exact: true }).fill("Jebla");
      await page.getByLabel("Origin country", { exact: true }).fill("Brazil");
      await page.getByLabel("Bag weight (g)", { exact: true }).fill("٢٥٠");
      await page
        .getByLabel("Farm or producer", { exact: true })
        .fill("Fixture farm");
      await page
        .getByLabel("Coffee product URL (https://)", { exact: true })
        .fill("https://example.test/coffee");
      await page
        .getByLabel("Roaster website (https://)", { exact: true })
        .fill("https://example.test/");
    }
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Choose image (optional)", exact: true })
      .click();
    await (
      await chooser
    ).setFiles({
      name: "bag.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(
      page.getByRole("img", { name: "Selected image", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Confirm");
    expect(uploads).toHaveLength(0);
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Could not confirm saving",
    );
    await page
      .getByRole("button", { name: "Retry saving", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      kind === "recipe"
        ? "Recipe and steps saved"
        : "Coffee added to your bags",
    );
    expect(writes).toHaveLength(2);
    expect(writes[0]).toEqual(writes[1]);
    expect(uploads).toHaveLength(1);
    expect(writes[1].p_payload.image_path).toBe(
      `${user.id}/${writes[1].p_id}.png`,
    );
    if (kind === "recipe") {
      expect(writes[1].p_payload).toMatchObject({
        dose: "15",
        water: "250",
        visibility: "private",
        steps: ["Bloom with 40 g", "Pour the remaining water"],
        source_url: "https://example.test/recipe",
      });
    } else {
      expect(writes[1].p_payload).toMatchObject({
        roaster_name: "Jebla",
        origin: "Brazil",
        farm: "Fixture farm",
        weight: "250",
        roaster_url: "https://example.test/",
      });
    }
  });

test("owned equipment and bags: confirm removal, keep item on failure and undo after confirmed success", async ({
  page,
}) => {
  const archive: Record<string, boolean> = {
    user_equipment: false,
    user_bean_inventory: false,
  };
  const writes: Record<string, any[]> = {
    user_equipment: [],
    user_bean_inventory: [],
  };
  await page.route("https://mobilefixture.supabase.co/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname,
      table = path.split("/").at(-1)!;
    const auth = authentication(path);
    if (auth) return reply(route, auth);
    if (table in archive) {
      const id = table === "user_equipment" ? "gear-row" : "bag-row";
      if (route.request().method() === "PATCH") {
        expect(url.searchParams.get("user_id")).toBe(`eq.${user.id}`);
        expect(url.searchParams.get("id")).toBe(`eq.${id}`);
        const body = route.request().postDataJSON();
        writes[table].push(body);
        if (writes[table].length === 1)
          return reply(route, { message: "temporary failure" }, 503);
        archive[table] = Boolean(body.archived_at);
        return reply(route, { id });
      }
      return reply(
        route,
        archive[table]
          ? []
          : table === "user_equipment"
            ? [{ id, equipment_model_id: gear.id, custom_name: null }]
            : [
                {
                  id,
                  legacy_bean_id: bean.id,
                  roasted_product_id: null,
                  original_weight_grams: 250,
                  remaining_weight_grams: 150,
                  brew_count: 0,
                },
              ],
      );
    }
    return reply(
      route,
      table === "beans" ? [bean] : table === "equipment_models" ? [gear] : [],
    );
  });
  await signedIn(page);
  for (const [name, table, remove, label] of [
    [
      "My equipment",
      "user_equipment",
      "Remove from my equipment",
      "Member grinder",
    ],
    ["My bags", "user_bean_inventory", "Remove from my bags", "Member coffee"],
  ]) {
    await more(page, name);
    await expect(page.getByText(label, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: remove, exact: true }).click();
    expect(writes[table]).toHaveLength(0);
    await page
      .getByRole("button", { name: "Confirm removal", exact: true })
      .click();
    await expect(page.getByText(label, { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Could not (complete the action|remove this bag)/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Confirm removal", exact: true })
      .click();
    await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Undo removal", exact: true })
      .click();
    await expect(page.getByText(label, { exact: true })).toBeVisible();
    expect(writes[table]).toHaveLength(3);
    expect(writes[table][2].archived_at).toBeNull();
  }
});
