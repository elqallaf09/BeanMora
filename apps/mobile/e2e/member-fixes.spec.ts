import { test, expect, type Page, type Route } from "@playwright/test";
import { openRecipeLibrary, chooseMethod } from "./navigation";
import { setLanguage } from "./settings";
import { selectProfileExtra } from "./profile-navigation";
const user = {
  id: "33333333-3333-4333-8333-333333333333",
  aud: "authenticated",
  role: "authenticated",
  email: "member-fixture@example.test",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-09-01T00:00:00Z",
  identities: [],
  is_anonymous: false,
};
const recipe = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Kenya test recipe",
  title_ar: "وصفة كينيا التجريبية",
  brew_method: "v60",
  visibility: "public",
  recipe_type: "official_manufacturer",
  source_coffee_name: "Kenya Sasha",
  source_tasting_notes: ["red currant", "black tea"],
  bean_id: null,
  roasted_product_id: null,
  dose_grams: 18,
  water_grams: 300,
  steps: [],
  equipment: [],
  flavor_notes: [],
  sources: [],
};
const model = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Baratza Encore ESP",
  category: "grinder",
  requires_review: false,
  description: "Fixture grinder",
  suitable_brew_methods: ["v60", "espresso"],
  brand: { name: "Baratza" },
  source_url: "https://www.baratza.com/en-us/product/encore-esp-zcg495",
  image_url: "https://member-photo-fixture.test/grinder.png",
  image_usage_status: "source_linked",
  specifications: {
    catalog: {
      schema_version: 1,
      name_ar: "باراتزا إنكور ESP",
      description_ar: "طاحونة التجربة",
      description_en: "Fixture grinder",
    },
  },
};
const encode = (v: object) =>
  Buffer.from(JSON.stringify(v)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_test_signature`;
async function reply(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "content-range":
        Array.isArray(data) && data.length
          ? `0-${data.length - 1}/${data.length}`
          : "*/0",
      "access-control-expose-headers": "content-range",
    },
    body: JSON.stringify(data),
  });
}
async function setup(
  page: Page,
  options: { failedSave?: boolean; failedSummary?: boolean; existingReview?: boolean; failedReview?: boolean; hiddenReview?: boolean } = {},
) {
  let saved = false,
    saveAttempts = 0,
    own: Record<string, unknown> | null = options.existingReview || options.hiddenReview ? {
      id: "66666666-6666-4666-8666-666666666666", user_id: user.id, rating: 4,
      review_text: "زين", pros: "", cons: "", experience: "used", status: options.hiddenReview ? "hidden" : "published",
      created_at: "2026-10-09T12:00:00Z",
    } : null,
    gear = false;
  const reviewWrites: { method: string; body: Record<string, unknown> | null }[] = [];
  const saves: Record<string, unknown>[] = [],
    searches: Record<string, unknown>[] = [],
    brews: Record<string, unknown>[] = [];
  await page.route("https://member-photo-fixture.test/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6khAAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.route("https://mobilefixture.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    if (path.endsWith("/token"))
      return reply(route, {
        access_token: token,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "isolated_member_fixture",
        user,
      });
    if (path.endsWith("/user")) return reply(route, user);
    if (path.endsWith("/profiles"))
      return reply(route, {
        ...user,
        name: "Fixture Member",
        username: "fixture_member",
        is_private: false,
        share_collection: false,
      });
    if (path.endsWith("/rpc/get_member_profile"))
      return reply(route, {
        profile: {
          id: user.id,
          name: "Fixture Member",
          username: "fixture_member",
          avatar_url: null,
          bio: "",
          is_private: false,
          share_collection: false,
        },
        is_owner: true,
        can_view: true,
        relationship: null,
        follower_count: 0,
        following_count: 0,
        recipes: [],
        photos: [],
        followers: [],
        following: [],
        requests: [],
        beans: [
          {
            id: "88888888-8888-4888-8888-888888888888",
            coffee_id: "88888888-8888-4888-8888-888888888888",
            kind: "bean",
            name_ar: "بن الحساب",
            name_en: "Fixture coffee",
            image_url: "https://member-photo-fixture.test/coffee.png",
            image_usage_status: "source_linked",
          },
        ],
        equipment: gear
          ? [
              {
                id: "77777777-7777-4777-8777-777777777777",
                equipment_model_id: model.id,
                category: "grinder",
                name: model.name,
                name_ar: "باراتزا إنكور ESP",
                image_url: model.image_url,
                image_usage_status: "source_linked",
              },
            ]
          : [],
        favorites: saved ? [recipe] : [],
      });
    if (
      path.endsWith("/rpc/search_public_recipes") ||
      path.endsWith("/rpc/search_public_recipes_v2")
    ) {
      searches.push(req.postDataJSON());
      return reply(route, [recipe]);
    }
    if (path.endsWith("/rpc/recipes_for_coffee") || path.endsWith("/recipes"))
      return reply(route, [recipe]);
    if (path.endsWith("/recipe_saves")) {
      if (req.method() === "POST") {
        saveAttempts++;
        saves.push(req.postDataJSON());
        saved = true;
        return reply(
          route,
          options.failedSave && saveAttempts === 1
            ? { message: "reply lost after committed save" }
            : null,
          options.failedSave && saveAttempts === 1 ? 503 : 200,
        );
      }
      if (req.method() === "DELETE") {
        saved = false;
        return reply(route, null);
      }
      return reply(
        route,
        url.searchParams.has("recipe_id")
          ? saved
            ? { recipe_id: recipe.id }
            : null
          : saved
            ? [
                {
                  recipe_id: recipe.id,
                  created_at: "2026-10-09T12:00:00Z",
                  recipe,
                },
              ]
            : [],
      );
    }
    if (path.endsWith("/equipment_models")) return reply(route, [model]);
    if (path.endsWith("/user_equipment")) {
      if (req.method() === "POST") {
        gear = true;
        return reply(route, null);
      }
      return reply(
        route,
        gear
          ? [
              {
                id: "77777777-7777-4777-8777-777777777777",
                equipment_model_id: model.id,
                category: "grinder",
                custom_name: null,
              },
            ]
          : [],
      );
    }
    if (path.endsWith("/rpc/equipment_review_summary"))
      return reply(
        route,
        options.failedSummary
          ? { message: "summary unavailable" }
          : [{ review_count: own ? 1 : 0, average_rating: own ? 4 : null }],
        options.failedSummary ? 503 : 200,
      );
    if (path.endsWith("/equipment_reviews")) {
      if (req.method() !== "GET") {
        reviewWrites.push({ method: req.method(), body: req.method() === "DELETE" ? null : req.postDataJSON() });
        if (options.failedReview && reviewWrites.length === 1) return reply(route, { message: "isolated review failure" }, 503);
        if (req.method() === "DELETE") { own = null; return reply(route, { id: "66666666-6666-4666-8666-666666666666" }); }
        const review = {
          id: "66666666-6666-4666-8666-666666666666",
          user_id: user.id,
          status: "published",
          created_at: "2026-10-09T12:00:00Z",
          ...req.postDataJSON(),
        };
        own = review;
        return reply(route, { id: review.id });
      }
      return reply(
        route,
        url.searchParams.has("user_id") ? own : own && own.status !== "hidden" ? [own] : [],
      );
    }
    if (path.endsWith("/rpc/record_configured_brew_v1")) {
      const body = req.postDataJSON();
      brews.push(body);
      return reply(route, body.p_request_id);
    }
    return reply(route, []);
  });
  return {
    saves,
    searches,
    brews,
    reviewWrites,
    removeSaveElsewhere: () => {
      saved = false;
    },
  };
}
async function signIn(page: Page) {
  await page.goto("/");
  await setLanguage(page, "en");
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("isolated-fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByTestId("account-screen")).toBeVisible();
}
test("account save retries a committed request, survives reopening and appears in favorites", async ({
  page,
}) => {
  const { saves, removeSaveElsewhere } = await setup(page, {
    failedSave: true,
  });
  await signIn(page);
  await openRecipeLibrary(page, "en");
  await page.getByRole("button", { name: recipe.title, exact: true }).click();
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not save");
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByText("Recipe saved.", { exact: true })).toBeVisible();
  expect(saves).toHaveLength(2);
  expect(saves[1]).toEqual(saves[0]);
  await page.reload();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await selectProfileExtra(page, "Favorite recipes");
  await expect(
    page.getByRole("button", { name: recipe.title, exact: true }),
  ).toBeVisible();
  await openRecipeLibrary(page, "en");
  await page.getByRole("button", { name: recipe.title, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remove saved recipe", exact: true }),
  ).toBeVisible();
  removeSaveElsewhere();
  await page.reload();
  await openRecipeLibrary(page, "en");
  await page.getByRole("button", { name: recipe.title, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save recipe", exact: true }),
  ).toBeVisible();
});
test("Arabic search, method, source and tasting filters survive recipe detail navigation", async ({
  page,
}) => {
  const { searches } = await setup(page);
  await page.goto("/");
  await openRecipeLibrary(page, "ar");
  await chooseMethod(page, "ar", "V60");
  await page.getByLabel("ابحث عن وصفة", { exact: true }).fill("كينيا");
  await page.getByRole("button", { name: "رسمي", exact: true }).click();
  await page
    .getByRole("button", { name: "تصفية الوصفات", exact: true })
    .click();
  await page.getByLabel("إيحاء محدد", { exact: true }).fill("كشمش أحمر");
  await page
    .getByRole("button", { name: "تطبيق التصفية", exact: true })
    .click();
  await page
    .getByRole("button", { name: recipe.title_ar, exact: true })
    .click();
  await page.getByRole("button", { name: "رجوع", exact: true }).click();
  await expect(page.getByLabel("ابحث عن وصفة", { exact: true })).toHaveValue(
    "كينيا",
  );
  await expect
    .poll(() => searches.at(-1))
    .toMatchObject({
      p_query: "كينيا",
      p_method: "v60",
      p_source: "official",
      p_flavor_note: "كشمش أحمر",
    });
  await page
    .getByRole("button", { name: "تصفية الوصفات، 1 مفعلة", exact: true })
    .click();
  await expect(page.getByLabel("إيحاء محدد", { exact: true })).toHaveValue(
    "كشمش أحمر",
  );
});
test("a failed public summary does not disable saving a member’s equipment experience", async ({
  page,
}) => {
  await setup(page, { failedSummary: true });
  await signIn(page);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await page.getByRole("button", { name: model.name, exact: true }).click();
  await page.getByRole("button", { name: "Rate 4/5", exact: true }).click();
  await page
    .getByLabel("Your review", { exact: true })
    .fill("A useful isolated equipment experience.");
  await page
    .getByRole("button", { name: "Save my review", exact: true })
    .click();
  await expect(
    page.getByText("Your review was saved.", { exact: true }),
  ).toBeVisible();
});
test("adding catalog gear shows its photo in my equipment and account collection", async ({
  page,
}) => {
  await setup(page);
  await signIn(page);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await page.getByRole("button", { name: model.name, exact: true }).click();
  await page
    .getByRole("button", { name: "Add to my equipment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add: " + model.name, exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: model.name, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await expect(
    page
      .getByTestId("member-profile")
      .getByRole("img", { name: model.name, exact: true }),
  ).toBeVisible();
  await page
    .getByTestId("member-profile")
    .getByRole("button", { name: "Coffee", exact: true })
    .click();
  await expect(
    page
      .getByTestId("member-profile")
      .getByRole("img", { name: "Fixture coffee", exact: true }),
  ).toBeVisible();
});
test("brew result sends the grinder, calibration and roast in the same confirmed request", async ({
  page,
}) => {
  const { brews } = await setup(page);
  await signIn(page);
  await openRecipeLibrary(page, "en");
  await page.getByRole("button", { name: recipe.title, exact: true }).click();
  await page
    .getByRole("button", { name: "Record my brew", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Grinder, device and roast", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Grinder model: Not specified", exact: true })
    .click();
  await page.getByRole("button", { name: model.name, exact: true }).click();
  await page
    .getByRole("button", {
      name: "Coffee roast level: Not specified",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page
    .getByLabel("Roast date YYYY-MM-DD (optional)", { exact: true })
    .fill("2026-10-01");
  await page
    .getByLabel("Zero calibration and burrs (optional)", { exact: true })
    .fill("Standard burrs, zero checked");
  await page.getByLabel("Actual grind setting", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Good", exact: true }).click();
  await page
    .getByRole("switch", { name: "I actually brewed this cup", exact: true })
    .click();
  await page.getByRole("button", { name: "Save result", exact: true }).click();
  await expect(
    page.getByText("Your brew was saved.", { exact: true }),
  ).toBeVisible();
  expect(brews).toHaveLength(1);
  expect(brews[0].p_context).toMatchObject({
    grinder_model_id: model.id,
    grind_setting: "25",
    roast_level: "light",
    roast_date: "2026-10-01",
    calibration: "Standard burrs, zero checked",
  });
});
test("expanded capsule menu finds Zill and Arabic flavor names at 320px", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "الكبسولات", exact: true }).click();
  await page.getByLabel("بحث الكبسولات", { exact: true }).fill("شقراء");
  await expect(
    page.getByRole("heading", { name: "شقراء", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/يحتوي مشتقات الحليب/)).toBeVisible();
  await page.getByLabel("بحث الكبسولات", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "نظام الماكينة: كل الأنظمة", exact: true })
    .click();
  await page
    .getByRole("button", { name: "نسبريسو فيرتو", exact: true })
    .click();
  await page.getByLabel("بحث الكبسولات", { exact: true }).fill("كراميل");
  await expect(
    page.getByRole("heading", { name: "كراميل ذهبي", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const [width, ar] of [[320, true], [1536, false]] as const) {
  test(`equipment review accepts three characters and edits inside the tapped opinion at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1009 });
    const { reviewWrites } = await setup(page);
    await signIn(page);
    if (ar) await setLanguage(page, 'ar');
    await page.getByRole('button', { name: ar ? 'الرئيسية' : 'Home', exact: true }).click();
    await page.getByRole('button', { name: ar ? 'أدوات القهوة' : 'Equipment', exact: true }).click();
    await page.getByRole('button', { name: ar ? 'باراتزا إنكور ESP' : model.name, exact: true }).click();
    await page.getByRole('button', { name: ar ? 'تقييم 4/5' : 'Rate 4/5', exact: true }).click();
    const review = page.getByLabel(ar ? 'رأيك وتجربتك' : 'Your review', { exact: true });
    const save = page.getByRole('button', { name: ar ? 'حفظ رأيي' : 'Save my review', exact: true });
    await review.fill('زي'); await save.click();
    await expect(page.getByText(ar ? 'اختر تقييماً واكتب رأياً من 3 إلى 2000 حرف.' : 'Choose a rating and write 3–2000 characters.', { exact: true })).toBeVisible();
    expect(reviewWrites).toHaveLength(0);
    await review.fill('زين'); await save.click();
    const own = page.getByTestId('equipment-own-review');
    await expect(own.getByText('زين', { exact: true })).toBeVisible();
    await expect(page.getByTestId('equipment-review-editor')).toHaveCount(0);
    await own.getByText('زين', { exact: true }).click();
    const editor = own.getByTestId('equipment-review-editor');
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel(ar ? 'رأيك وتجربتك' : 'Your review', { exact: true })).toHaveValue('زين');
    await review.fill('حلو');
    await page.getByRole('button', { name: ar ? 'إلغاء التعديل' : 'Cancel editing', exact: true }).click();
    await expect(editor).toHaveCount(0); expect(reviewWrites).toHaveLength(1);
    await own.getByText('زين', { exact: true }).click();
    await expect(review).toHaveValue('زين');
    await review.fill('حلو'); await save.click();
    await expect(own.getByText('حلو', { exact: true })).toBeVisible();
    await expect(editor).toHaveCount(0);
    expect(reviewWrites.map(w => [w.method, w.body?.review_text])).toEqual([['POST', 'زين'], ['PATCH', 'حلو']]);
    await page.screenshot({ path: info.outputPath('compact-equipment-own-review.png'), animations: 'disabled' });
  });
}
test('inline equipment edit retains a failed draft and retries only the owner review', async ({ page }) => {
  const { reviewWrites } = await setup(page, { existingReview: true, failedReview: true });
  await signIn(page);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await page.getByRole('button', { name: model.name, exact: true }).click();
  const own = page.getByTestId('equipment-own-review');
  await own.getByText('زين', { exact: true }).click();
  const editor = own.getByTestId('equipment-review-editor');
  await editor.getByLabel('Your review', { exact: true }).fill('حلو');
  await editor.getByRole('button', { name: 'Save my review', exact: true }).click();
  await expect(editor.getByText('Save was not confirmed. Try again.', { exact: true })).toBeVisible();
  await expect(editor.getByLabel('Your review', { exact: true })).toHaveValue('حلو');
  await editor.getByRole('button', { name: 'Save my review', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(own.getByText('حلو', { exact: true })).toBeVisible();
  expect(reviewWrites.map(w => w.method)).toEqual(['PATCH', 'PATCH']);
});
test('own moderated opinion opens inline for deletion without offering an edit write', async ({ page }) => {
  const { reviewWrites } = await setup(page, { hiddenReview: true });
  await signIn(page);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await page.getByRole('button', { name: model.name, exact: true }).click();
  await page.getByTestId('equipment-own-review').getByText('زين', { exact: true }).click();
  const editor = page.getByTestId('equipment-own-review').getByTestId('equipment-review-editor');
  await expect(editor.getByText('Your review is hidden after moderation. You can delete it.', { exact: true })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Save my review', exact: true })).toHaveCount(0);
  await editor.getByRole('button', { name: 'Delete my review', exact: true }).click();
  await expect(page.getByTestId('equipment-own-review')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Share your experience', exact: true })).toBeVisible();
  expect(reviewWrites.map(w => w.method)).toEqual(['DELETE']);
});
