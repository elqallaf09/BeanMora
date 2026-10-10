import { expect, test } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/b1sAAAAASUVORK5CYII=",
  "base64",
);
const coffees = Array.from({ length: 8 }, (_, n) => ({
  id: `12121212-1212-4212-8212-${String(n).padStart(12, "0")}`,
  slug: "pick-" + n,
  name_ar: "بن مختار " + n,
  name_en: "Coffee pick " + n,
  requires_review: false,
  is_published: true,
  suitable_for_v60: true,
  image_url: "https://picks-fixture.test/coffee.png",
  image_usage_status: "rights_confirmed",
  roaster: { name_ar: "محمصة التجربة", name_en: "Test roaster" },
  flavors: [],
  images: [],
}));
const tools = Array.from({ length: 9 }, (_, n) => ({
  id: `34343434-3434-4434-8434-${String(n).padStart(12, "0")}`,
  name: "Test tool " + n,
  requires_review: false,
  category: n % 2 ? "grinder" : "espresso_machine",
  brand: { name: "Fixture" },
  image_url: "https://picks-fixture.test/tool.png",
  image_usage_status: "rights_confirmed",
  specifications: {
    catalog: { schema_version: 1, name_ar: "معدة مختارة " + n },
  },
}));
test('clearing equipment selection requires approval and cancel keeps both models', async ({ page }) => {
  await page.route('https://picks-fixture.test/**', r => r.fulfill({ contentType: 'image/png', body: png }));
  await page.route('https://mobilefixture.supabase.co/**', r => {
    const path = new URL(r.request().url()).pathname;
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify(path.endsWith('/equipment_models') ? tools : path.endsWith('/beans') ? coffees : []) });
  });
  await page.goto('/');
  await page.getByTestId('library-navigation').getByRole('button', { name: 'أدوات القهوة', exact: true }).click();
  for (const item of tools.slice(0, 2)) await page.getByTestId('equipment-card-' + item.id).getByRole('button', { name: 'أضف للمقارنة', exact: true }).click();
  const dialog = page.getByTestId('confirm-dialog');
  await page.getByRole('button', { name: 'مسح الاختيار', exact: true }).click();
  await expect(page.getByRole('button', { name: 'إزالة من المقارنة', exact: true })).toHaveCount(2);
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await expect(page.getByRole('button', { name: 'قارن (2/3)', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'مسح الاختيار', exact: true }).click();
  await dialog.getByRole('button', { name: 'موافقة', exact: true }).click();
  await expect(page.getByRole('button', { name: 'إزالة من المقارنة', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'مسح الاختيار', exact: true })).toHaveCount(0);
});
for (const width of [320, 1536])
  test(`compact direct navigation and 30-second cached picks at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1009 });
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    let reads = 0;
    await page.route("https://picks-fixture.test/**", (r) =>
      r.fulfill({ contentType: "image/png", body: png }),
    );
    await page.route("https://mobilefixture.supabase.co/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      const data = path.endsWith("/beans")
        ? coffees
        : path.endsWith("/equipment_models")
          ? tools
          : [];
      if (path.endsWith("/beans") || path.endsWith("/equipment_models"))
        reads++;
      return r.fulfill({
        contentType: "application/json",
        headers: {
          "content-range": `0-${Math.max(0, data.length - 1)}/${data.length}`,
          "access-control-expose-headers": "content-range",
        },
        body: JSON.stringify(data),
      });
    });
    await page.goto("/");
    const nav = page.getByTestId("library-navigation");
    await expect(
      nav.getByRole("button", { name: "خبير القهوة", exact: true }),
    ).toBeVisible();
    await expect(
      nav.getByRole("button", { name: "المزيد", exact: true }),
    ).toHaveCount(0);
    const picker = page.getByTestId("method-picker");
    const all = picker.getByRole("button", { name: "الكل", exact: true }),
      arrow = picker.getByRole("button", { name: /^كل طرق التحضير/ });
    const [allBox, arrowBox] = await Promise.all([
      all.boundingBox(),
      arrow.boundingBox(),
    ]);
    expect(Math.abs(allBox!.y - arrowBox!.y)).toBeLessThan(6);
    const coffee = page.getByTestId("home-coffee-picks"),
      equipment = page.getByTestId("home-tools");
    await expect(coffee.getByRole("button", { name: /^بن مختار/ })).toHaveCount(
      4,
    );
    await expect(
      equipment.getByRole("button", { name: /^معدة مختارة/ }),
    ).toHaveCount(3);
    const names = async (which: typeof coffee) =>
      which
        .getByRole("button")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("aria-label")).join("|"),
        );
    const beforeCoffee = await names(coffee),
      beforeTools = await names(equipment),
      beforeReads = reads;
    await page.clock.runFor(29_000);
    expect(await names(coffee)).toBe(beforeCoffee);
    expect(await names(equipment)).toBe(beforeTools);
    await page.clock.runFor(1500);
    await expect
      .poll(() => names(coffee), { timeout: 6000 })
      .not.toBe(beforeCoffee);
    await expect
      .poll(() => names(equipment), { timeout: 6000 })
      .not.toBe(beforeTools);
    expect(reads).toBe(beforeReads);
    await expect(
      page.getByRole("button", {
        name: /أدوات أخرى|إيقاف التبديل|تشغيل التبديل/,
      }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath("compact-home-arabic.png") });
    const section = coffee.locator("..");
    await section
      .getByRole("button", { name: "عرض الكل", exact: true })
      .click();
    await expect(page.getByTestId("search-screen")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^بن مختار/ })).toHaveCount(
      8,
    );
  });
