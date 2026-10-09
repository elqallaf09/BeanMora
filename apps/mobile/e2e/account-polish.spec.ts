import { expect, test, type Page, type Route } from "@playwright/test";
import { setLanguage } from "./settings";
import { selectProfileExtra } from "./profile-navigation";

// Only isolated fixture accounts and email endpoints are used in this suite.
const uid = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const bean = {
  id: "33333333-3333-4333-8333-333333333333",
  slug: "contrast",
  name_ar: "بن الوضوح",
  name_en: "Contrast coffee",
  requires_review: false,
  is_published: true,
  suitable_for_v60: true,
  roast_level: "light",
  origin_country: "Ethiopia",
  process: "natural",
  roaster: { name_ar: "محمصة الاختبار", name_en: "Fixture roaster" },
  flavors: [{ flavor: "chocolate" }],
  images: [],
};
const enc = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
async function fixtures(
  page: Page,
  options: { nonce?: boolean; arabic?: boolean; collection?: boolean } = {},
) {
  let user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "owner@example.test",
    new_email: "",
    is_anonymous: false,
    app_metadata: { provider: "email" },
    user_metadata: {},
    identities: [],
    created_at: "2026-10-01T00:00:00Z",
  };
  const profile = {
    id: uid,
    name: options.arabic ? "عاشق القهوة" : "Coffee Owner",
    username: "owner",
    avatar_url: null,
    bio: options.arabic ? "أشارك وصفاتي وتجارب القهوة" : "My coffee corner",
    is_private: false,
    share_collection: false,
  };
  const updates: Record<string, string>[] = [],
    changes: Record<string, unknown>[] = [];
  let reauthenticated = 0;
  let failLike = false,
    failComment = false,
    failLogout = false;
  const likeRows = [{ post_id: "post-1", user_id: other }];
  const commentRows: {
    id: string;
    post_id: string;
    user_id: string;
    body: string;
    created_at: string;
  }[] = [];
  const likeWrites: Record<string, unknown>[] = [],
    commentWrites: Record<string, unknown>[] = [];
  let logouts = 0;
  const token = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: uid, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.isolated_signature`;
  const reply = (route: Route, data: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "x-supabase-api-version": "2024-01-01",
        "access-control-expose-headers": "x-supabase-api-version",
      },
      body: JSON.stringify(data),
    });
  if (options.collection)
    await page.route("https://account-photo-fixture.test/**", (route) =>
      route.fulfill({
        path:
          "assets/images/" +
          (route.request().url().endsWith("grinder.jpg")
            ? "grinder.jpg"
            : "coffee-bag.jpg"),
        contentType: "image/jpeg",
      }),
    );
  await page.route("https://mobilefixture.supabase.co/**", (route) => {
    const url = new URL(route.request().url()),
      p = url.pathname,
      method = route.request().method();
    if (p.startsWith("/storage/v1/object/avatars/"))
      return reply(route, { Key: p.replace("/storage/v1/object/", "") });
    if (p.startsWith("/storage/v1/object/public/avatars/"))
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/b1sAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    if (p.endsWith("/settings"))
      return reply(route, { external: { google: true, apple: false } });
    if (p.endsWith("/token")) {
      if (route.request().postDataJSON().password === "wrong-current")
        return reply(
          route,
          { code: "invalid_credentials", message: "Invalid login credentials" },
          400,
        );
      return reply(route, {
        access_token: token,
        refresh_token: "isolated_refresh",
        token_type: "bearer",
        expires_in: 3600,
        user,
      });
    }
    if (p.endsWith("/reauthenticate")) {
      reauthenticated++;
      return reply(route, {});
    }
    if (p.endsWith("/user")) {
      if (method === "PUT") {
        const body = route.request().postDataJSON();
        updates.push(body);
        if (body.password && options.nonce && !body.nonce)
          return reply(
            route,
            {
              code: "reauthentication_needed",
              message: "Reauthentication needed",
            },
            422,
          );
        if (body.email) user.new_email = body.email;
      }
      return reply(route, user);
    }
    if (p.endsWith("/logout")) {
      logouts++;
      return failLogout
        ? reply(route, { message: "isolated logout failure" }, 503)
        : route.fulfill({ status: 204 });
    }
    if (p.endsWith("/post_likes")) {
      if (method === "POST") {
        const body = route.request().postDataJSON();
        likeWrites.push(body);
        if (failLike)
          return reply(route, { message: "isolated like failure" }, 503);
        likeRows.push(body);
        return route.fulfill({ status: 201 });
      }
      if (method === "DELETE") {
        expect(url.searchParams.get("post_id")).toBe("eq.post-1");
        expect(url.searchParams.get("user_id")).toBe("eq." + uid);
        const index = likeRows.findIndex(
          (l) => l.post_id === "post-1" && l.user_id === uid,
        );
        if (index >= 0) likeRows.splice(index, 1);
        return route.fulfill({ status: 204 });
      }
      return reply(route, likeRows);
    }
    if (p.endsWith("/comments")) {
      if (method === "POST") {
        const body = route.request().postDataJSON();
        commentWrites.push(body);
        if (failComment)
          return reply(route, { message: "isolated comment failure" }, 503);
        commentRows.push({
          ...body,
          id: "comment-" + commentRows.length,
          created_at: new Date().toISOString(),
        });
        return route.fulfill({ status: 201 });
      }
      return reply(route, commentRows);
    }
    if (p.endsWith("/profiles")) {
      if (method === "PATCH") {
        const body = route.request().postDataJSON();
        changes.push(body);
        Object.assign(profile, body);
        return reply(route, { id: uid, avatar_url: profile.avatar_url });
      }
      if (url.searchParams.get("select") === "username")
        return reply(route, { username: profile.username });
      return reply(route, [
        profile,
        {
          id: other,
          name: options.arabic ? "ركن البن" : "Coffee Friend",
          username: "friend",
          country: "Kuwait",
          avatar_url: null,
        },
      ]);
    }
    if (p.endsWith("/rpc/get_member_profile"))
      return reply(route, {
        profile,
        is_owner: true,
        can_view: true,
        follower_count: 2,
        following_count: 1,
        relationship: null,
        equipment: options.collection
          ? [
              {
                id: "fixture-equipment",
                equipment_model_id: null,
                category: "grinder",
                name: "Fixture grinder",
                name_ar: "طاحونة تجريبية",
                operation: ["يدوية", "Manual"],
                image_url: "https://account-photo-fixture.test/grinder.jpg",
                image_usage_status: "source_linked",
              },
            ]
          : [],
        beans: options.collection
          ? [
              {
                id: "fixture-bag",
                coffee_id: bean.id,
                kind: "bean",
                name_en: "Fixture coffee",
                name_ar: "بن التجربة",
                image_url: "https://account-photo-fixture.test/coffee-bag.jpg",
                image_usage_status: "source_linked",
              },
            ]
          : [],
        recipes: [],
        favorites: [],
        comments: [],
        photos: [],
      });
    if (p.endsWith("/beans")) return reply(route, [bean]);
    if (p.endsWith("/follows")) {
      expect(url.searchParams.get("status")).toBe("eq.accepted");
      return reply(route, [{ following_id: other }]);
    }
    if (p.endsWith("/posts")) {
      const rows = [uid, other].map((id, index) => ({
        id: "post-" + index,
        user_id: id,
        body: options.arabic
          ? index
            ? "صباح الخير ☕ تجربة اليوم: ترشيح هادئ ونكهات واضحة. ما وصفتكم المفضلة؟"
            : "كوب اليوم بإيحاءات الشوكولاتة وحلاوة جميلة. جرّبت طحنًا أخشن قليلًا وكانت النتيجة متوازنة."
          : index
            ? "A friend’s coffee story."
            : "My coffee story.",
        content_language: options.arabic ? "ar" : "en",
        created_at: "2026-10-08T00:00:00Z",
        recipe_id: null,
        roast_profile_id: null,
        roast: null,
        brew_log_id: null,
        bean_id: null,
        brew_method: null,
        dose_grams: null,
        water_grams: null,
        actual_time_seconds: null,
        outcome: null,
      }));
      return reply(
        route,
        url.searchParams.has("user_id")
          ? rows.filter((r) => r.user_id === other)
          : rows,
      );
    }
    return reply(route, []);
  });
  return {
    updates,
    changes,
    profile,
    confirm: () => {
      user = { ...user, email: user.new_email, new_email: "" };
    },
    nonceSent: () => reauthenticated,
    likeWrites,
    commentWrites,
    failLikes: (value: boolean) => {
      failLike = value;
    },
    failComments: (value: boolean) => {
      failComment = value;
    },
    failSignOut: (value: boolean) => {
      failLogout = value;
    },
    logouts: () => logouts,
  };
}
async function signIn(page: Page) {
  await page.goto("/");
  await setLanguage(page, "en");
  await page.getByRole("button", { name: "Open account", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("correct-current");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByTestId("account-screen")).toBeVisible();
  await expect(page.getByTestId("member-profile")).toBeVisible();
}
test("email stays unchanged until confirmation and wrong current password blocks mutation", async ({
  page,
}) => {
  const f = await fixtures(page);
  await signIn(page);
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  const security = page.getByTestId("account-security");
  await security
    .getByRole("button", { name: "Change email", exact: true })
    .click();
  await security
    .getByLabel("New email", { exact: true })
    .fill("new@example.test");
  await security
    .getByLabel("Current password", { exact: true })
    .fill("wrong-current");
  await security
    .getByRole("button", { name: "Send confirmation link", exact: true })
    .click();
  await expect(security.getByRole("alert")).toContainText(
    "current password is incorrect",
  );
  expect(f.updates).toHaveLength(0);
  await security
    .getByLabel("Current password", { exact: true })
    .fill("correct-current");
  await security
    .getByRole("button", { name: "Send confirmation link", exact: true })
    .click();
  await expect(page.getByTestId("pending-email-change")).toContainText(
    "new@example.test",
  );
  await expect(
    page
      .getByTestId("settings-screen")
      .getByText("owner@example.test", { exact: true }),
  ).toBeVisible();
  expect(f.updates[0].email).toBe("new@example.test");
  await security
    .getByRole("button", { name: "Check confirmation", exact: true })
    .click();
  await expect(security).toContainText("Confirmation is still pending");
  f.confirm();
  await security
    .getByRole("button", { name: "Check confirmation", exact: true })
    .click();
  await expect(page.getByTestId("pending-email-change")).toHaveCount(0);
  await expect(
    page
      .getByTestId("settings-screen")
      .getByText("new@example.test", { exact: true }),
  ).toBeVisible();
});
test("password validates matching fields and completes a server-required email nonce", async ({
  page,
}) => {
  const f = await fixtures(page, { nonce: true });
  await signIn(page);
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  const s = page.getByTestId("account-security");
  await s.getByRole("button", { name: "Change password", exact: true }).click();
  await s
    .getByLabel("Current password", { exact: true })
    .fill("correct-current");
  await s
    .getByLabel("New password", { exact: true })
    .fill("strong-new-password");
  await s
    .getByLabel("Confirm new password", { exact: true })
    .fill("different-password");
  await s.getByRole("button", { name: "Save password", exact: true }).click();
  await expect(s.getByRole("alert")).toContainText("matching passwords");
  expect(f.updates).toHaveLength(0);
  await s
    .getByLabel("Confirm new password", { exact: true })
    .fill("strong-new-password");
  await s.getByRole("button", { name: "Save password", exact: true }).click();
  await expect(
    s.getByLabel("Verification code", { exact: true }),
  ).toBeVisible();
  expect(f.nonceSent()).toBe(1);
  await s.getByLabel("Verification code", { exact: true }).fill("123456");
  await s.getByRole("button", { name: "Save password", exact: true }).click();
  await expect(s).toContainText("Password changed successfully");
  expect(f.updates.at(-1)).toMatchObject({
    password: "strong-new-password",
    current_password: "correct-current",
    nonce: "123456",
  });
  await expect(s.getByLabel("New password", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "strong-new-password",
  );
});
test("username is directly editable and the following feed uses accepted follows", async ({
  page,
}) => {
  const f = await fixtures(page);
  await signIn(page);
  await page
    .getByRole("button", { name: "Change username", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill("coffee_owner");
  await page.getByLabel("Name", { exact: true }).fill("New Coffee Name");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("@coffee_owner", { exact: true })).toBeVisible();
  expect(f.changes[0]).toMatchObject({
    username: "coffee_owner",
    name: "New Coffee Name",
  });
  await page.getByRole("button", { name: "coffeeHO", exact: true }).click();
  await expect(page.getByTestId("community-post-post-0")).toContainText(
    "My coffee story.",
  );
  await page.getByRole("button", { name: "Following", exact: true }).click();
  await expect(page.getByTestId("community-post-post-0")).toHaveCount(0);
  await expect(page.getByTestId("community-post-post-1")).toContainText(
    "A friend’s coffee story.",
  );
});
for (const width of [320, 800, 1536])
  test(`dark animated cards, account and social layout remain readable (${width})`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixtures(page, { arabic: true });
    await page.goto("/");
    await page
      .getByRole("button", { name: "الإعدادات", exact: true })
      .first()
      .click();
    const settings = page.getByTestId("settings-screen");
    await settings.getByRole("button", { name: "ليلي", exact: true }).click();
    await settings.getByRole("button", { name: "تم", exact: true }).click();
    await expect(settings).toHaveCount(0);
    const coffee = page.getByRole("button", {
      name: bean.name_ar,
      exact: true,
    });
    await expect(coffee).toBeVisible();
    const pair = await coffee.evaluate((el) => ({
      background: getComputedStyle(el.parentElement!).backgroundColor,
      text: getComputedStyle(
        [...el.querySelectorAll("*")].find(
          (n) => n.textContent === "بن الوضوح",
        )!,
      ).color,
    }));
    expect(pair.background).toBe("rgb(32, 27, 23)");
    expect(pair.text).toBe("rgb(247, 234, 219)");
    await page.screenshot({ path: info.outputPath(`home-dark-${width}.png`) });
    await signIn(page);
    await setLanguage(page, "ar");
    await expect(page.getByTestId("member-profile")).toBeVisible();
    const sections = page.getByTestId("profile-sections");
    await expect(
      sections.getByRole("button", { name: "المعدات", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "وصفاتي (0)", exact: true }).click();
    await expect(
      sections.getByRole("button", { name: "الوصفات", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page
      .getByRole("button", { name: "معدات القهوة (0)", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "حذف الحساب والبيانات", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByTestId("account-security")).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`account-dark-${width}.png`),
    });
    await page
      .getByRole("button", { name: "الإعدادات", exact: true })
      .first()
      .click();
    // Country/contact fields make Settings scrollable on tablet layouts too.
    await expect(settings.getByTestId("account-details")).toBeVisible();
    await expect(settings.getByTestId("account-details").getByText("جارٍ التحميل…", { exact: true })).toHaveCount(0);
    const deleteAccount = settings.getByRole("button", { name: "حذف الحساب والبيانات", exact: true });
    await deleteAccount.scrollIntoViewIfNeeded();
    await expect(deleteAccount).toBeInViewport({ ratio: 1 });
    await page.screenshot({
      path: info.outputPath(`settings-dark-${width}.png`),
    });
    const actions = page.getByTestId("account-security").getByRole("button");
    for (const a of await actions.all()) {
      const rect = await a.boundingBox();
      expect(rect!.height).toBeGreaterThanOrEqual(44);
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    }
    await settings.getByRole("button", { name: "تم", exact: true }).click();
    await page.getByRole("button", { name: "coffeeHO", exact: true }).click();
    await expect(page.getByTestId("community-post-post-1")).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`coffeeho-dark-${width}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("profile photo previews before saving and remains beside the handle after reload", async ({
  page,
}) => {
  const f = await fixtures(page);
  await signIn(page);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/b1sAAAAASUVORK5CYII=",
    "base64",
  );
  async function choose() {
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Change profile photo", exact: true })
      .click();
    await (
      await chooser
    ).setFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
    await expect(page.getByTestId("avatar-preview")).toBeVisible();
  }
  await choose();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(f.changes).toHaveLength(0);
  await choose();
  await page.getByRole("button", { name: "Save photo", exact: true }).click();
  await expect(
    page.getByText("Profile photo saved.", { exact: true }),
  ).toBeVisible();
  expect(f.profile.avatar_url).toContain("/avatars/" + uid + "/");
  await page.reload();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await expect(
    page.getByTestId("member-profile").getByText("@owner", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("avatar-edit").getByRole("img")).toBeVisible();
});

test("account actions live only in compact settings and sign-out failure can be retried", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const f = await fixtures(page);
  await signIn(page);
  for (const label of [
    "Change email",
    "Change password",
    "Sign out",
    "Delete account and data",
  ])
    await expect(
      page
        .getByTestId("account-screen")
        .getByRole("button", { name: label, exact: true }),
    ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  const panel = page.getByTestId("settings-screen");
  await expect(panel.getByTestId("account-details")).toBeVisible();
  await expect(panel.getByTestId("account-details").getByText("Loading…", { exact: true })).toHaveCount(0);
  const deleteAccount = panel.getByRole("button", { name: "Delete account and data", exact: true });
  await deleteAccount.scrollIntoViewIfNeeded();
  await expect(deleteAccount).toBeInViewport({ ratio: 1 });
  await expect(
    panel.getByText("New in this release", { exact: true }),
  ).toHaveCount(0);
  f.failSignOut(true);
  await panel.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Could not sign out");
  expect(f.logouts()).toBe(1);
  f.failSignOut(false);
  await panel.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("settings-account")).toHaveCount(0);
});

test("general timeline likes survive reload, unlike removes only the current member and a failure rolls back", async ({
  page,
}) => {
  const f = await fixtures(page);
  await signIn(page);
  await page.getByRole("button", { name: "coffeeHO", exact: true }).click();
  const post = page.getByTestId("community-post-post-1");
  for (const label of [
    "All languages",
    "Most liked",
    "Discussions",
    "Roasts",
    "Brew experiences",
    "Newest",
  ])
    await expect(
      page
        .getByTestId("community-screen")
        .getByRole("button", { name: label, exact: true }),
    ).toHaveCount(0);
  const like = post.getByRole("button", { name: "Like", exact: true });
  await expect(like).toContainText("Like · 1");
  f.failLikes(true);
  await like.click();
  await expect(post.getByRole("alert")).toContainText("Could not save like");
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(like).toContainText("Like · 1");
  f.failLikes(false);
  const savedLike = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith("/post_likes") &&
      response.request().method() === "POST",
  );
  await like.click();
  // Optimistic counts can appear before the mutation is acknowledged. Wait
  // for completion so reload tests persisted state instead of aborting a save.
  expect((await savedLike).status()).toBe(201);
  await expect(like).toBeEnabled();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect(like).toContainText("Like · 2");
  expect(f.likeWrites.at(-1)).toEqual({ post_id: "post-1", user_id: uid });
  await page.reload();
  await page.getByRole("button", { name: "coffeeHO", exact: true }).click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  const removedLike = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith("/post_likes") &&
      response.request().method() === "DELETE",
  );
  await like.click();
  expect((await removedLike).status()).toBe(204);
  await expect(like).toBeEnabled();
  await expect(like).toContainText("Like · 1");
  await expect(like).toHaveAttribute("aria-pressed", "false");
});

test("post comments keep a failed draft, retry once and remain visible after reload", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const f = await fixtures(page);
  await signIn(page);
  await page.getByRole("button", { name: "coffeeHO", exact: true }).click();
  const post = page.getByTestId("community-post-post-1");
  const open = post.getByRole("button", { name: "Comments", exact: true });
  await open.click();
  const draft = post.getByLabel("Write a comment", { exact: true });
  await draft.fill("A lovely cup. Which grind size did you use?");
  // Changing posts preserves each draft separately.
  await page
    .getByTestId("community-post-post-0")
    .getByRole("button", { name: "Comments", exact: true })
    .click();
  await page
    .getByTestId("community-post-post-0")
    .getByLabel("Write a comment", { exact: true })
    .fill("My separate draft");
  await open.click();
  await expect(draft).toHaveValue(
    "A lovely cup. Which grind size did you use?",
  );
  f.failComments(true);
  await post.getByRole("button", { name: "Send comment", exact: true }).click();
  await expect(post.getByRole("alert")).toContainText(
    "Your draft is kept here",
  );
  await expect(draft).toHaveValue(
    "A lovely cup. Which grind size did you use?",
  );
  await expect(
    post.getByRole("button", { name: "Like", exact: true }),
  ).toBeVisible();
  f.failComments(false);
  await post.getByRole("button", { name: "Send comment", exact: true }).click();
  await expect(
    post.getByText("A lovely cup. Which grind size did you use?", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(draft).toHaveValue("");
  await expect(open).toContainText("Comment · 1");
  expect(f.commentWrites).toHaveLength(2);
  expect(f.commentWrites.at(-1)).toMatchObject({
    post_id: "post-1",
    user_id: uid,
    parent_comment_id: null,
    recipe_id: null,
    is_hidden: false,
    content_language: "en",
  });
  await page.screenshot({
    path: info.outputPath("social-comments-light-phone.png"),
  });
  await page.reload();
  await page.getByRole("button", { name: "coffeeHO", exact: true }).click();
  await open.click();
  await expect(
    post.getByText("A lovely cup. Which grind size did you use?", {
      exact: true,
    }),
  ).toBeVisible();
});

test("a guest can read comments and is asked to sign in when interacting", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/");
  await setLanguage(page, "en");
  await page.getByRole("button", { name: "coffeeHO", exact: true }).click();
  const post = page.getByTestId("community-post-post-1");
  await post.getByRole("button", { name: "Comments", exact: true }).click();
  await expect(post.getByLabel("Write a comment", { exact: true })).toHaveCount(
    0,
  );
  await post
    .getByRole("button", { name: "Sign in to comment", exact: true })
    .click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

for (const scenario of [
  { width: 320, ar: true, dark: false },
  { width: 800, ar: true, dark: true },
  { width: 1536, ar: true, dark: false },
  { width: 320, ar: false, dark: true },
])
  test(`approved social profile retains collection and extra-section actions (${scenario.width}, ${scenario.ar ? "ar" : "en"}, ${scenario.dark ? "dark" : "light"})`, async ({
    page,
  }, info) => {
    const { width, ar, dark } = scenario;
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 1100 });
    const f = await fixtures(page, { arabic: ar, collection: true });
    if (!ar) {
      f.profile.name = "Coffee enthusiast with a longer display name";
      f.profile.username = "coffee_owner_with_long_handle";
    }
    await signIn(page);
    await setLanguage(page, ar ? "ar" : "en");
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
    }
    const profile = page.getByTestId("member-profile");
    await expect(page.getByTestId("profile-cover")).toBeVisible();
    const photo = profile.getByRole("img", {
      name: ar ? "طاحونة تجريبية" : "Fixture grinder",
      exact: true,
    });
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(1);
    await expect(
      page.getByTestId("profile-stats").getByRole("button"),
    ).toHaveCount(4);
    await expect(
      page.getByTestId("profile-sections").getByRole("button"),
    ).toHaveCount(5);
    const edit = profile.getByRole("button", {
      name: ar ? "تعديل الملف" : "Edit profile",
      exact: true,
    });
    expect((await edit.boundingBox())!.width).toBeLessThan(width * 0.75);
    for (const button of await page
      .getByTestId("profile-sections")
      .getByRole("button")
      .all()) {
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await expect(page.getByTestId("profile-bean-preview")).toHaveCount(
      width >= 700 ? 1 : 0,
    );
    const coffeeHO = page.getByRole("button", {
      name: "coffeeHO",
      exact: true,
    });
    const brew = page.getByRole("button", {
      name: ar ? "تحضير" : "Brew",
      exact: true,
    });
    const navBox = (await coffeeHO.boundingBox())!;
    expect(Math.abs(navBox.x + navBox.width / 2 - width / 2)).toBeLessThan(1);
    expect((await brew.boundingBox())!.x).toBeGreaterThan(navBox.x);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(photo).toBeInViewport();
    await expect(coffeeHO).toBeInViewport();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: info.outputPath(
        `approved-profile-${width}-${ar ? "ar" : "en"}-${dark ? "dark" : "light"}.png`,
      ),
    });
    await selectProfileExtra(
      page,
      ar ? "الوصفات المفضلة" : "Favorite recipes",
      ar,
    );
    await expect(
      profile.getByRole("heading", {
        name: ar ? "الوصفات المفضلة" : "Favorite recipes",
        exact: true,
      }),
    ).toBeVisible();
    await profile
      .getByRole("button", {
        name: ar ? "2 متابع" : "2 followers",
        exact: true,
      })
      .click();
    await expect(
      profile.getByRole("heading", {
        name: ar ? "المتابعون" : "Followers",
        exact: true,
      }),
    ).toBeVisible();
    await profile
      .getByRole("button", {
        name: ar ? "أكياس البن (1)" : "Coffee bags (1)",
        exact: true,
      })
      .click();
    await expect(
      profile.getByRole("img", {
        name: ar ? "بن التجربة" : "Fixture coffee",
        exact: true,
      }),
    ).toBeVisible();
    await edit.click();
    await expect(
      page.getByLabel(ar ? "اسم المستخدم" : "Username", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: ar ? "إلغاء التعديل" : "Cancel editing",
        exact: true,
      })
      .click();
    await page
      .getByTestId("profile-sections")
      .getByRole("button", { name: ar ? "المعدات" : "Equipment", exact: true })
      .click();
    await profile
      .getByRole("button", {
        name: ar ? "إضافة معدة" : "Add equipment",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", {
        name: ar ? "إضافة معدة من الكتالوج" : "Add equipment from catalog",
        exact: true,
      }),
    ).toBeVisible();
  });
