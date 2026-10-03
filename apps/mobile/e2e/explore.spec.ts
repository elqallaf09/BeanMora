import { test, expect, type Page, type Route } from "@playwright/test";

// Isolated browser fixtures. These never become production catalog or reviews.
const roasterId = "44444444-4444-4444-8444-444444444444";
const modelId = "55555555-5555-4555-8555-555555555555";
const bean = {
  id: "22222222-2222-4222-8222-222222222222",
  roaster_id: roasterId,
  name_ar: "بن المحمصة المعزول",
  name_en: "Isolated roaster coffee",
  requires_review: false,
  is_published: true,
  suitable_for_xbloom: true,
  suitable_for_v60: true,
  roast_level: "light",
  roaster: { name_ar: "محمصة معزولة", name_en: "Isolated roaster" },
  images: [],
  flavors: [],
};
const model = {
  id: modelId,
  name: "Bialetti Moka Express",
  category: "other",
  requires_review: false,
  source_url: "https://manufacturer-fixture.test/moka",
  image_url: "https://photo-fixture.test/moka.jpg",
  image_usage_status: "source_linked",
  suitable_brew_methods: [],
  specifications: {},
};
const roaster = {
  id: roasterId,
  name_ar: "محمصة معزولة",
  name_en: "Isolated roaster",
  country: "Kuwait",
  requires_review: false,
  locations: [],
  description_ar: "وصف المحمصة المعزولة",
  description_en: "Isolated roaster description",
};
const recipes = Array.from({ length: 64 }, (_, i) => ({
  id: "11111111-1111-4111-8111-" + String(i).padStart(12, "0"),
  title: `Source recipe ${i}`,
  title_ar: `وصفة المصدر ${i}`,
  brew_method: "xbloom",
  visibility: "public",
  recipe_type: i % 2 ? "community" : "official_manufacturer",
  bean_id: i === 0 ? bean.id : null,
  dose_grams: 18,
  water_grams: null,
  total_time_seconds: null,
  source_author_name: "Isolated publisher",
  source_brew_parameters: {
    water_ml: 288,
    ratio: 16,
    grind_size: 48,
    model: i % 2 ? "Original" : "Studio",
    pours: [
      {
        volume: 288,
        temperature: 99.44,
        pause_seconds: 0,
        flow_rate: null,
        pattern_code: 2,
      },
    ],
  },
  sources: [
    {
      source_url: "https://source-fixture.test/recipe/" + i,
      source_name: "Isolated publisher",
    },
  ],
  steps: [],
  equipment: [],
  flavor_notes: [],
}));

async function english(page: Page) {
  await page
    .getByRole("button", { name: "تغيير اللغة، العربية", exact: true })
    .click();
  await page.getByRole("button", { name: "English", exact: true }).click();
}
async function response(
  route: Route,
  data: unknown,
  status = 200,
  count?: number,
) {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers:
      count === undefined
        ? {}
        : {
            "content-range": `0-${Math.max(0, (data as unknown[]).length - 1)}/${count}`,
            "access-control-expose-headers": "content-range",
          },
    body: JSON.stringify(data),
  });
}

for (const width of [320, 768]) {
  test(`equipment and roaster details are browsable without signing in at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1024 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://photo-fixture.test/**", (r) => r.abort());
    await page.route("https://mobilefixture.supabase.co/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      await response(
        route,
        path.endsWith("/beans")
          ? [bean]
          : path.endsWith("/recipes")
            ? [recipes[0]]
            : path.endsWith("/equipment_models")
              ? [model]
              : path.endsWith("/roasters")
                ? [roaster]
                : path.endsWith("/equipment_review_summary")
                  ? [{ review_count: 0, average_rating: null }]
                  : [],
      );
    });
    await page.goto("/");
    await english(page);
    await page.getByRole("button", { name: "Equipment", exact: true }).click();
    await page.getByRole("button", { name: model.name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Tradeoffs", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Model photo unavailable", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("No published opinions yet. Share the first experience.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Sign in to write a review",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Roasteries", exact: true }).click();
    await page
      .getByRole("button", { name: roaster.name_en, exact: true })
      .click();
    await page.getByRole("button", { name: bean.name_en, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: bean.name_en }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: roaster.name_en }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "Change language, English",
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("full recipe pagination retries a failed page and filters sources and machine models", async ({
  page,
}) => {
  let allowNextPage = false;
  const requestedOffsets: number[] = [];
  await page.route("https://mobilefixture.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith("/recipes")) return response(route, []);
    const limit = Number(url.searchParams.get("limit"));
    if (limit !== 30) return response(route, recipes.slice(0, 2));
    const offset = Number(url.searchParams.get("offset") || 0);
    requestedOffsets.push(offset);
    if (offset === 30 && !allowNextPage)
      return response(route, { message: "Isolated page failure" }, 503);
    const items = recipes.filter(
      (r) =>
        (!url.searchParams.has("recipe_type") ||
          url.searchParams.get("recipe_type")!.includes(r.recipe_type)) &&
        (!url.searchParams.has("source_brew_parameters->>model") ||
          url.searchParams.get("source_brew_parameters->>model") ===
            "eq." + r.source_brew_parameters.model),
    );
    return response(
      route,
      items.slice(offset, offset + limit),
      200,
      items.length,
    );
  });
  await page.goto("/");
  await english(page);
  await page.getByRole("button", { name: "Brew", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Source recipe 0", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More recipes", exact: true }).click();
  await expect(
    page.getByText("Could not load recipes.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "More recipes", exact: true }),
  ).toBeDisabled();
  allowNextPage = true;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("button", { name: "More recipes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Source recipe 63", exact: true }),
  ).toBeVisible();
  expect(requestedOffsets[0]).toBe(0);
  expect(
    requestedOffsets.filter((offset) => offset === 30).length,
  ).toBeGreaterThanOrEqual(2);
  expect(requestedOffsets.filter((offset) => offset === 60)).toHaveLength(1);
  await page
    .getByTestId("recipe-catalog")
    .getByRole("button", { name: "xBloom", exact: true })
    .click();
  await page.getByRole("button", { name: "Official", exact: true }).click();
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Source recipe 0", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Source recipe 0", exact: true })
    .click();
  await expect(page.getByText("288 ml", { exact: true })).toBeVisible();
  await expect(page.getByText(/99.44°C/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Isolated publisher", exact: true }),
  ).toBeVisible();
});

test("members can save, edit and delete their own equipment opinion with confirmed writes", async ({
  page,
}) => {
  const user = {
    id: "33333333-3333-4333-8333-333333333333",
    aud: "authenticated",
    role: "authenticated",
    email: "review-fixture@example.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-09-01T00:00:00Z",
    identities: [],
    is_anonymous: false,
  };
  const encode = (v: object) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
  let own: Record<string, unknown> | null = null;
  const mutations: string[] = [];
  await page.route("https://mobilefixture.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (path.endsWith("/token"))
      return response(route, {
        access_token: token,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "isolated_review_fixture",
        user,
      });
    if (path.endsWith("/user")) return response(route, user);
    if (path.endsWith("/equipment_models")) return response(route, [model]);
    if (path.endsWith("/equipment_review_summary"))
      return response(route, [
        { review_count: own ? 1 : 0, average_rating: own ? own.rating : null },
      ]);
    if (path.endsWith("/equipment_reviews")) {
      if (req.method() !== "GET") {
        mutations.push(req.method());
        if (req.method() === "DELETE") own = null;
        else
          own = {
            id: "66666666-6666-4666-8666-666666666666",
            user_id: user.id,
            status: "published",
            created_at: "2026-10-03T00:00:00Z",
            ...req.postDataJSON(),
          };
        return response(route, { id: "66666666-6666-4666-8666-666666666666" });
      }
      return response(
        route,
        url.searchParams.has("user_id") ? own : own ? [own] : [],
      );
    }
    return response(route, []);
  });
  await page.route("https://photo-fixture.test/**", (r) => r.abort());
  await page.goto("/");
  await english(page);
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("isolated-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await page.getByRole("button", { name: model.name, exact: true }).click();
  await page.getByRole("button", { name: "Rate 4/5", exact: true }).click();
  await page
    .getByLabel("Your review", { exact: true })
    .fill("An isolated, useful brewing experience.");
  await page
    .getByRole("button", { name: "Save my review", exact: true })
    .click();
  await expect(
    page.getByText("Your review was saved.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Edit your review", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Your review", { exact: true })
    .fill("Updated isolated brewing experience.");
  await page
    .getByRole("button", { name: "Save my review", exact: true })
    .click();
  await expect(
    page.getByText("Updated isolated brewing experience.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete my review", exact: true })
    .click();
  await expect(
    page.getByText("Your review was deleted.", { exact: true }),
  ).toBeVisible();
  expect(mutations).toEqual(["POST", "PATCH", "DELETE"]);
});
