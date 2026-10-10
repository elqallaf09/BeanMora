import { expect, test } from "@playwright/test";
import { setLanguage } from "./settings";

const machines = Array.from({ length: 11 }, (_, i) => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i + 1).padStart(12, "0")}`,
  name: i === 0 ? "Fresh Roast SR800" : `Roasting model ${i + 1}`,
  category: "roaster",
  requires_review: false,
  description: "A verified roasting machine with adjustable airflow.",
  source_url: "https://manufacturer.example/roaster",
  specifications: {
    catalog: {
      schema_version: 1,
      name_ar: i === 0 ? "فريش روست SR800" : `ماكينة تحميص ${i + 1}`,
      description_ar: "ماكينة تحميص موثقة مع تحكم في تدفق الهواء.",
    },
  },
}));
for (const [width, locale, dark] of [
  [320, "ar", false],
  [390, "en", false],
  [800, "ar", true],
  [1280, "en", true],
] as const) {
  test(`${width} ${locale}: compact capsules, roasters, saved coffee and expert`, async ({
    page,
  }, info) => {
    const ar = locale === "ar",
      errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.route("https://mobilefixture.supabase.co/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          path.endsWith("/equipment_models") ? machines : [],
        ),
      });
    });
    await page.goto("/");
    if (!ar) await setLanguage(page, "en");
    if (dark) {
      await page
        .getByRole("button", {
          name: ar ? "الإعدادات" : "Settings",
          exact: true,
        })
        .first()
        .click();
      const settings = page.getByTestId("settings-screen");
      await settings
        .getByRole("button", { name: ar ? "ليلي" : "Dark", exact: true })
        .click();
      await settings
        .getByRole("button", { name: ar ? "تم" : "Done", exact: true })
        .click();
      await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
    }
    await expect(
      page.getByRole("button", {
        name: ar ? "لك أنت" : "For you",
        exact: true,
      }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: ar ? "الكبسولات" : "Capsules", exact: true })
      .click();
    const capsules = page.getByTestId("capsule-catalog"),
      cards = capsules.getByTestId("capsule-product-card");
    await expect(cards).toHaveCount(12);
    const boxes = await Promise.all([
      cards.nth(0).boundingBox(),
      cards.nth(1).boundingBox(),
    ]);
    expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(3);
    expect(boxes[0]!.width).toBeLessThan(width / 2);
    await expect(
      capsules.getByText(ar ? "مصدر التوافق" : "Compatibility source", {
        exact: true,
      }),
    ).toHaveCount(0);
    await capsules
      .getByLabel(ar ? "بحث الكبسولات" : "Search capsules", { exact: true })
      .fill("ZX_NO_MATCH");
    await expect(cards).toHaveCount(0);
    await capsules
      .getByLabel(ar ? "بحث الكبسولات" : "Search capsules", { exact: true })
      .fill("");
    await expect(cards).toHaveCount(12);
    await page.screenshot({
      path: info.outputPath("capsules.png"),
      animations: "disabled",
    });
    await page
      .getByRole("button", {
        name: ar ? "مختبر التحميص" : "Roast Lab",
        exact: true,
      })
      .click();
    const image = page.getByTestId("roast-levels-image");
    await expect(image).toBeVisible();
    expect((await image.boundingBox())!.height).toBeLessThanOrEqual(145);
    await page
      .getByRole("button", {
        name: ar ? "معدات التحميص" : "Roasting equipment",
        exact: true,
      })
      .click();
    const roasters = page
      .getByTestId("roasting-equipment-grid")
      .getByTestId("roasting-equipment-card");
    await expect(roasters).toHaveCount(11);
    const machinesBoxes = await Promise.all([
      roasters.nth(0).boundingBox(),
      roasters.nth(1).boundingBox(),
    ]);
    expect(Math.abs(machinesBoxes[0]!.y - machinesBoxes[1]!.y)).toBeLessThan(3);
    await page.screenshot({
      path: info.outputPath("roasting-equipment-grid.png"),
      animations: "disabled",
    });
    await page
      .getByLabel(ar ? "ابحث عن ماكينة تحميص" : "Search roasting machines", {
        exact: true,
      })
      .fill("SR800");
    await expect(roasters).toHaveCount(1);
    await page.screenshot({
      path: info.outputPath("roasting-equipment.png"),
      animations: "disabled",
    });
    await page
      .getByRole("button", {
        name: ar ? "البن المحفوظ" : "Saved coffees",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("method-guide")).toHaveCount(0);
    await page
      .getByTestId("method-picker")
      .getByRole("button", { name: ar ? "إيروبرس" : "AeroPress", exact: true })
      .click();
    await expect(page.getByTestId("method-guide")).toHaveCount(0);
    await page
      .getByRole("button", {
        name: ar ? "خبير القهوة" : "Coffee expert",
        exact: true,
      })
      .click();
    const expert = page.getByTestId("coffee-assistant"),
      composer = page.getByTestId("assistant-composer");
    await expect(
      expert.getByRole("button", {
        name: ar ? "مكتبة المعرفة" : "Knowledge library",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(expert.getByRole("heading")).toHaveCount(0);
    await expect(composer).toBeVisible();
    expect((await composer.boundingBox())!.y).toBeLessThan(450);
    await expect.poll(() => expert.evaluate(element => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) < 1) return false;
      }
      return true;
    })).toBe(true);
    await page.screenshot({
      path: info.outputPath("coffee-expert-start.png"),
      animations: "disabled",
    });
    await composer
      .getByLabel(ar ? "سؤالك عن القهوة" : "Your coffee question", {
        exact: true,
      })
      .fill(ar ? "احسب 18 غرام بنسبة 1:16" : "Calculate 18 g at 1:16");
    await expert
      .getByRole("button", { name: ar ? "إرسال" : "Send", exact: true })
      .click();
    await expect(expert).toContainText("288");
    await page.screenshot({
      path: info.outputPath("coffee-expert.png"),
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
