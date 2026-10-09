import { expect, test, type Page } from "@playwright/test";
import { setLanguage } from "./settings";
const coffeeId = "33333333-3333-4333-8333-333333333333";
const secondId = "44444444-4444-4444-8444-444444444444";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/b1sAAAAASUVORK5CYII=",
  "base64",
);
const beans = [coffeeId, secondId].map((id, i) => ({
  id,
  slug: "coffee-" + i,
  name_en: i ? "Second coffee" : "First coffee",
  name_ar: i ? "البن الثاني" : "البن الأول",
  requires_review: false,
  is_published: true,
  suitable_for_v60: true,
  suitable_for_espresso: true,
  suitable_for_xbloom: true,
  source_url: "https://catalog.example/coffee-" + i,
  image_url: "https://images.example/coffee-" + i + ".png",
  image_usage_status: "source_linked",
  image_kind: "packaging",
  flavors: [],
  roaster: { name_en: "Fixture roaster", name_ar: "محمصة التجربة" },
}));
const gear = Array.from({ length: 6 }, (_, i) => ({
  id: `55555555-5555-4555-8555-${String(i).padStart(12, "0")}`,
  name: "Rotating tool " + i,
  category: ["grinder", "scale", "kettle"][i % 3],
  brand: { name: "Brand " + i },
  source_url: "https://catalog.example/tool-" + i,
  image_url: "https://images.example/tool-" + i + ".png",
  image_usage_status: "source_linked",
  requires_review: false,
}));
async function fixture(page: Page) {
  const scopes: string[] = [];
  await page.route("https://images.example/**", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
  await page.route("https://mobilefixture.supabase.co/**", (route) => {
    const u = new URL(route.request().url());
    const path = u.pathname;
    let data: unknown = [];
    if (path.endsWith("/beans")) data = beans;
    if (path.endsWith("/equipment_models")) data = gear;
    if (path.endsWith("/roasters"))
      data = ["Kuwait", "Japan"].map((country, i) => ({
        id: "roaster-" + i,
        name_en: "Roaster " + country,
        name_ar: "محمصة " + country,
        country,
        requires_review: false,
      }));
    if (path.endsWith("/rpc/recipes_for_coffee"))
      scopes.push(route.request().postDataJSON().p_bean_id);
    if (
      path.endsWith("/recipes") &&
      u.searchParams.get("bean_id") === "is.null"
    ) {
      const method =
        u.searchParams.get("brew_method")?.replace("eq.", "") ?? "v60";
      data = [
        {
          id: "66666666-6666-4666-8666-666666666666",
          title: "General " + method + " guide",
          title_ar: "وصفة عامة",
          brew_method: method,
          visibility: "public",
          recipe_type: "official_manufacturer",
          dose_grams: 15,
          water_grams: 250,
          water_temp_c: 94,
          total_time_seconds: 180,
          is_incomplete_source: false,
          sources: [
            {
              source_url: "https://catalog.example/brew",
              source_name: "Fixture source",
            },
          ],
          steps: [
            {
              step_number: 1,
              title: "Brew",
              description: "Use the published brew settings.",
            },
          ],
          equipment: [],
        },
      ];
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/");
  await setLanguage(page, "en");
  return scopes;
}
test("brew changes coffee without owning a bag, offers all 15 methods and labels a general guide", async ({
  page,
}) => {
  const scopes = await fixture(page);
  await page.getByRole("button", { name: "Brew", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose coffee: First coffee", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Second coffee", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Choose coffee: Second coffee",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Choose brew method:/ }).click();
  for (const method of [
    "AeroPress",
    "Chemex",
    "French press",
    "Cold brew",
    "Moka pot",
    "Origami",
    "Kalita Wave",
    "April",
    "OREA",
    "Hario Switch",
    "Pour over",
    "Auto drip",
  ])
    await expect(
      page.getByRole("button", { name: method, exact: true }),
    ).toBeAttached();
  await page.getByLabel("Search this list", { exact: true }).fill("AeroPress");
  await page.getByRole("button", { name: "AeroPress", exact: true }).click();
  await expect(
    page.getByText("General aeropress guide", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/General guide; adjust for your coffee/),
  ).toBeVisible();
  expect(scopes.at(-1)).toBe(secondId);
});
test("catalog photos appear and tools rotate automatically while focus keeps the chosen model stable", async ({
  page,
}) => {
  await page.clock.install();
  await fixture(page);
  await expect(page.getByTestId("coffee-product-photo").first()).toBeVisible();
  const section = page.getByTestId("home-tools");
  await expect(
    section.getByRole("button", { name: /Rotating tool/ }),
  ).toHaveCount(3);
  const names = await section
    .getByRole("button", { name: /Rotating tool/ })
    .allTextContents();
  await page.clock.runFor(3500);
  await expect
    .poll(() =>
      section.getByRole("button", { name: /Rotating tool/ }).allTextContents(),
    )
    .not.toEqual(names);
  await expect(section.getByRole('button', { name: /Pause rotation|Other tools|Resume rotation/ })).toHaveCount(0);
  await section.getByRole('button', { name: /Rotating tool/ }).first().focus();
  const paused = await section
    .getByRole("button", { name: /Rotating tool/ })
    .allTextContents();
  await page.clock.runFor(6500);
  expect(
    await section
      .getByRole("button", { name: /Rotating tool/ })
      .allTextContents(),
  ).toEqual(paused);
  await section
    .getByRole("button", { name: /Rotating tool/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /Rotating tool/ }),
  ).toBeVisible();
});
test("roaster country opens a short menu and returns only the selected country", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("button", { name: "Roasteries", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Japan", exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Country: All countries", exact: true })
    .click();
  await page.getByRole("button", { name: "Japan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Roaster Japan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Roaster Kuwait", exact: true }),
  ).not.toBeVisible();
});
