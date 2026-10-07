import { expect, test, type Route } from "@playwright/test";
const bean = {
  id: "12121212-1212-4212-8212-121212121212",
  slug: "locale-bean",
  name_ar: "بن التجربة",
  name_en: "Test coffee",
  description_ar: "تفاصيل البن بالعربية",
  description_en: "Coffee details in English",
  requires_review: false,
  is_published: true,
  suitable_for_v60: true,
  flavors: [],
  roaster_id: "roaster",
  roaster: { name_ar: "محمصة راوي", name_en: "Rawi Coffee" },
  images: [],
};
const recipe = {
  id: "34343434-3434-4434-8434-343434343434",
  title: "Test recipe",
  title_ar: "وصفة التجربة",
  brew_method: "v60",
  visibility: "public",
  recipe_type: "community",
  dose_grams: 15,
  water_grams: 250,
  notes: "English recipe notes",
  notes_ar: "ملاحظات الوصفة بالعربية",
  steps: [
    {
      step_number: 1,
      title: "Bloom",
      title_ar: "التزهير",
      description: "Pour water",
      description_ar: "صب الماء",
    },
  ],
  sources: [],
  equipment: [],
  flavor_notes: [],
};
const equipment = {
  id: "56565656-5656-4565-8565-565656565656",
  name: "Test grinder",
  category: "grinder",
  requires_review: false,
  suitable_brew_methods: ["v60"],
  brand: { name: "Fixture" },
  specifications: {
    catalog: {
      schema_version: 1,
      name_ar: "طاحونة التجربة",
      description_ar: "تفاصيل الطاحونة بالعربية",
      description_en: "Grinder details in English",
    },
  },
};
async function fixture(route: Route) {
  const path = new URL(route.request().url()).pathname;
  const rows = path.endsWith("/beans")
    ? [bean]
    : path.endsWith("/recipes") || path.endsWith("/rpc/search_public_recipes")
      ? [recipe]
      : path.endsWith("/equipment_models")
        ? [equipment]
        : path.endsWith("/roasters")
          ? [
              {
                id: "roaster",
                slug: "rawi",
                name_ar: "محمصة راوي",
                name_en: "Rawi Coffee",
                country: "Kuwait",
                requires_review: false,
              },
            ]
          : [];
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: {
      "content-range": rows.length
        ? `0-${rows.length - 1}/${rows.length}`
        : "*/0",
      "access-control-expose-headers": "content-range",
    },
    body: JSON.stringify(rows),
  });
}
test("switching language preserves each selected detail and translates in place", async ({
  page,
}) => {
  await page.route("https://mobilefixture.supabase.co/**", fixture);
  await page.goto("/");
  await page
    .getByRole("button", { name: "البن والإيحاءات", exact: true })
    .click();
  await page.getByRole("button", { name: "بن التجربة", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Test coffee", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Coffee details in English", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "بن التجربة", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("coffee-photo-unavailable").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "رجوع", exact: true }).click();
  await page
    .getByRole("button", { name: "مكتبة الوصفات", exact: true })
    .click();
  await page.getByRole("button", { name: "وصفة التجربة", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Test recipe", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recipe and source details", exact: true })
    .click();
  await expect(
    page.getByText("English recipe notes", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await page
    .getByRole("button", { name: /Test grinder/ })
    .first()
    .click();
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "طاحونة التجربة", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("تفاصيل الطاحونة بالعربية", { exact: true }),
  ).toBeVisible();
});
test("compact navigation and capsule systems fit 320px; guest contributions require login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("https://mobilefixture.supabase.co/**", fixture);
  await page.goto("/");
  const nav = page.getByTestId("library-navigation");
  expect(await nav.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(
    true,
  );
  await page.getByRole("button", { name: "الكبسولات", exact: true }).click();
  await page
    .getByRole("button", { name: "نسبريسو فيرتو", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "نسبريسو فيرتو", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "نسبريسو أوريجينال", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "المزيد", exact: true }).click();
  await page.getByRole("button", { name: "إضافة بن", exact: true }).click();
  await expect(
    page.getByText("سجّل دخولك لإضافة وصفة أو بن وصورته.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "حفظ", exact: true }),
  ).toHaveCount(0);
});
