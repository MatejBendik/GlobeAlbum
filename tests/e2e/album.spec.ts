import {
  test,
  expect,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import sharp from "sharp";
import { TEST_ORIGIN } from "./constants";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }),
});
test.beforeEach(async ({ page }) => {
  // Never fetch community map tiles from browser automation.
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tiny.png"),
    }),
  );
});
test.afterAll(async () => {
  await db.$disconnect();
});

async function selectVisitDate(
  page: Page,
  year: string,
  month: string,
  day: RegExp,
) {
  await page.getByRole("button", { name: /Visit date/ }).click();
  const calendar = page.getByRole("dialog", {
    name: "Choose visit date",
    exact: true,
  });
  await calendar
    .getByRole("combobox", { name: "Choose the Year" })
    .selectOption(year);
  await calendar
    .getByRole("combobox", { name: "Choose the Month" })
    .selectOption(month);
  await calendar.getByRole("button", { name: day }).click();
  await expect(calendar).not.toBeVisible();
}

async function account(
  context: BrowserContext,
  onboarded = false,
  image?: string,
) {
  const id = randomUUID();
  const username = `tester-${id.slice(0, 8)}`;
  await db.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      name: "Jamie",
      emailVerified: true,
      image,
    },
  });
  const response = await fetch("http://127.0.0.1:8788/test/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: id }),
  });
  const { token } = await response.json();
  await context.addCookies([
    {
      name: "__Secure-neon-auth.session_token",
      value: token,
      secure: true,
      url: TEST_ORIGIN.replace("http:", "https:"),
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  if (onboarded)
    await db.globe.create({
      data: { userId: id, username, displayName: "Jamie's globe" },
    });
  return { id, username };
}

test("exposes public notices and the tagged portfolio link", async ({
  page,
}) => {
  await page.goto("/sign-up");
  const registration = page.getByRole("main");
  await expect(
    registration.getByRole("link", { name: "Terms of Service" }),
  ).toHaveAttribute("href", "/terms");
  await registration.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Retention and account deletion" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const footer = page.getByRole("contentinfo");
  const portfolioLink = footer.getByRole("link", { name: "Matej Bendík" });
  const portfolio = new URL((await portfolioLink.getAttribute("href"))!);
  expect(portfolio.hostname).toBe("www.matejbendik.com");
  expect(portfolio.searchParams.get("utm_source")).toBe("globealbum");
  await expect(portfolioLink).toHaveAttribute("target", "_blank");
  await expect(portfolioLink).toHaveAttribute("rel", "noopener");
  await footer.getByRole("link", { name: "Report content" }).click();
  await expect(page).toHaveURL(/\/terms#report-content$/);
  await expect(
    page.getByRole("link", { name: "Email a content report" }),
  ).toHaveAttribute("href", /^mailto:matejbendik\.mb@gmail\.com\?/);
});

test("keeps the theme beside the signed-in account and its private avatar", async ({
  page,
  context,
  browser,
}) => {
  const avatar = "https://lh3.googleusercontent.com/account-picture";
  await page.route(avatar, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tiny.png"),
    }),
  );
  const owner = await account(context, true, avatar);
  await db.globe.update({
    where: { userId: owner.id },
    data: { published: true },
  });
  const headerSizes: number[][] = [];
  for (const route of [
    "/",
    "/demo",
    "/studio",
    "/settings",
    "/privacy",
    `/u/${owner.username}`,
  ]) {
    await page.goto(route);
    const controls = page.locator(".account-controls");
    const toggle = controls.getByRole("button", {
      name: "Switch to dark mode",
    });
    const trigger = controls.getByRole("button", { name: "Account menu" });
    await expect(toggle).toBeEnabled();
    await expect(trigger.locator("img")).toBeVisible();
    await expect(trigger.locator("img")).toHaveAttribute("src", avatar);
    await expect(trigger.locator("img")).toHaveAttribute(
      "referrerpolicy",
      "no-referrer",
    );
    const [header, logo, themeButton, accountButton] = await Promise.all([
      page.locator(".site-header").boundingBox(),
      page.locator(".site-header .brand").boundingBox(),
      toggle.boundingBox(),
      trigger.boundingBox(),
    ]);
    expect(themeButton!.x).toBeLessThan(accountButton!.x);
    headerSizes.push([
      header!.height,
      logo!.x,
      logo!.height,
      themeButton!.height,
      accountButton!.height,
      accountButton!.width,
    ]);
  }
  expect(headerSizes).toEqual(headerSizes.map(() => headerSizes[0]));
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menu").locator("img")).toBeVisible();

  const visitor = await browser.newContext({ baseURL: TEST_ORIGIN });
  try {
    const publicPage = await visitor.newPage();
    const response = await publicPage.goto(`/u/${owner.username}`);
    await expect(
      publicPage.getByRole("heading", { name: "Jamie's globe" }),
    ).toBeVisible();
    expect(await response!.text()).not.toContain(avatar);
  } finally {
    await visitor.close();
  }
});

test("publishes an uploaded profile photo and revokes it when hidden or removed", async ({
  page,
  context,
  browser,
}) => {
  const googlePhoto = "https://lh3.googleusercontent.com/account-picture";
  await page.route(googlePhoto, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tiny.png"),
    }),
  );
  const owner = await account(context, true, googlePhoto);
  await page.goto("/settings");
  const settingsAvatar = page.locator(".settings-avatar img");
  await expect(settingsAvatar).toHaveAttribute("src", googlePhoto);
  const photoInput = page.getByLabel("Choose a profile photo");
  await expect(photoInput).toBeEnabled();
  await photoInput.setInputFiles("tests/fixtures/tiny.png");
  await page.getByRole("button", { name: "Save photo", exact: true }).click();
  await expect(settingsAvatar).toHaveAttribute("src", /^\/api\/avatars\//);
  const avatarUrl = (await settingsAvatar.getAttribute("src"))!;
  const visitor = await browser.newContext({ baseURL: TEST_ORIGIN });
  try {
    expect((await visitor.request.get(avatarUrl)).status()).toBe(404);
    await page.goto("/studio");
    await page
      .getByRole("button", { name: "Share globe", exact: true })
      .click();
    await page.getByRole("button", { name: "Publish my globe" }).click();
    await expect(
      page.getByRole("button", { name: "Make globe private" }),
    ).toBeVisible();
    const publicPage = await visitor.newPage();
    await publicPage.goto(`/u/${owner.username}`);
    await expect(
      publicPage.locator(".collection-heading .globe-avatar img"),
    ).toHaveAttribute("src", avatarUrl);
    const image = await visitor.request.get(avatarUrl);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/webp");
    await page.getByRole("button", { name: "Make globe private" }).click();
    await expect(
      page.getByRole("button", { name: "Publish my globe" }),
    ).toBeVisible();
    expect((await visitor.request.get(avatarUrl)).status()).toBe(404);

    await page.goto("/settings");
    await page
      .getByRole("button", { name: "Remove photo", exact: true })
      .click();
    await expect(settingsAvatar).toHaveAttribute("src", googlePhoto);
    expect((await page.request.get(avatarUrl)).status()).toBe(404);
    const job = await db.cleanupJob.findFirst({
      where: {
        keys: {
          has: `avatars/${new URL(avatarUrl, TEST_ORIGIN).searchParams.get("v")}.webp`,
        },
      },
    });
    expect(Number(job?.releaseBytes)).toBeGreaterThan(0);
  } finally {
    await visitor.close();
  }
});

test("uses a copy of the Google photo on a published globe when the owner chooses it", async ({
  page,
  context,
  browser,
}) => {
  const googlePhoto = "https://lh3.googleusercontent.com/account-picture";
  await page.route(googlePhoto, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tiny.png"),
    }),
  );
  const owner = await account(context, true, googlePhoto);
  await db.globe.update({
    where: { userId: owner.id },
    data: { published: true },
  });
  await page.goto("/settings");
  const settingsAvatar = page.locator(".settings-avatar img");
  await expect(settingsAvatar).toHaveAttribute("src", googlePhoto);
  await page
    .getByRole("button", { name: "Use Google photo on my globe" })
    .click();
  await expect(settingsAvatar).toHaveAttribute("src", /^\/api\/avatars\//);
  const avatarUrl = (await settingsAvatar.getAttribute("src"))!;
  await page.goto("/studio");
  await expect(
    page.locator(".collection-heading .globe-avatar img"),
  ).toHaveAttribute("src", avatarUrl);

  const visitor = await browser.newContext({ baseURL: TEST_ORIGIN });
  try {
    const publicPage = await visitor.newPage();
    const response = await publicPage.goto(`/u/${owner.username}`);
    await expect(
      publicPage.locator(".collection-heading .globe-avatar img"),
    ).toHaveAttribute("src", avatarUrl);
    expect(await response!.text()).not.toContain(googlePhoto);
    const image = await visitor.request.get(avatarUrl);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/webp");

    await page.goto("/settings");
    await page
      .getByRole("button", { name: "Remove photo", exact: true })
      .click();
    await expect(settingsAvatar).toHaveAttribute("src", googlePhoto);
    expect((await visitor.request.get(avatarUrl)).status()).toBe(404);
    await publicPage.reload();
    await expect(
      publicPage.locator(".collection-heading .globe-avatar"),
    ).toHaveCount(0);
  } finally {
    await visitor.close();
  }
});

test("creates a private collection, adds a visit, publishes and hides it", async ({
  page,
  context,
  browser,
}) => {
  const owner = await account(context);
  await page.goto("/studio");
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel("What should we call you?").fill("Jamie's globe");
  const address = page.getByLabel("Your globe address");
  await expect(address).toHaveAttribute("readonly", "");
  await expect(address).toHaveValue(/^jamie-s-globe(?:-\d+)?$/);
  owner.username = await address.inputValue();
  await expect(
    page.getByText(`${TEST_ORIGIN}/u/${owner.username}`, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create my globe" }).click();
  await expect(page).toHaveURL(/studio/);
  await expect(
    page.getByRole("heading", { name: "Jamie's globe" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add place", exact: true }).click();
  const add = page.getByRole("dialog");
  await add.getByLabel("City or town").fill("Paris");
  await add.getByRole("button", { name: "Choose location on a map" }).click();
  await add.getByLabel("Country or territory").selectOption("FR");
  await expect(add.locator('input[type="number"]')).toHaveCount(0);
  await expect(add.getByRole("button", { name: /Visit date/ })).toBeVisible();
  await add
    .getByRole("button", { name: "Use map center", exact: true })
    .click();
  await add.getByRole("button", { name: "Add place", exact: true }).click();
  await expect(
    add.getByRole("heading", { name: "Add photos to Paris" }),
  ).toBeVisible();
  await add.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".collection-stats")).toHaveText(
    "1 place in 1 country",
  );
  await page.getByRole("button", { name: /My places/ }).click();
  await page.getByRole("button", { name: /Paris France/ }).click();
  await expect(
    page.getByRole("heading", { name: "Paris", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const visit = page.getByRole("dialog").last();
  await selectVisitDate(page, "2024", "5", /June 1st, 2024/);
  await visit.getByRole("button", { name: "Add visit", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "2024-06-01 0 photos" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Share globe", exact: true }).click();
  await page.getByRole("button", { name: "Publish my globe" }).click();
  await expect(
    page.getByRole("button", { name: "Make globe private" }),
  ).toBeVisible();
  const visitor = await browser.newContext({ baseURL: TEST_ORIGIN });
  const publicPage = await visitor.newPage();
  await publicPage.goto(`/u/${owner.username}`);
  await expect(
    publicPage.getByRole("heading", { name: "Jamie's globe" }),
  ).toBeVisible();
  const place = await db.place.findFirstOrThrow({
    where: { globe: { userId: owner.id } },
  });
  const response = await publicPage.request.get(
    `/api/places/${place.id}/gallery`,
  );
  expect(response.ok()).toBe(true);
  const dto = await response.json();
  expect(dto).not.toHaveProperty("visits");
  expect(dto).not.toHaveProperty("pendingPhotos");
  expect(JSON.stringify(dto)).not.toContain("2024-06-01");
  await page.getByRole("button", { name: "Make globe private" }).click();
  await expect(
    page.getByRole("button", { name: "Publish my globe" }),
  ).toBeVisible();
  await publicPage.goto(`/u/${owner.username}`);
  await expect(
    publicPage.getByRole("heading", { name: "This globe is not available." }),
  ).toBeVisible();
  await expect(
    publicPage.getByRole("heading", { name: "Jamie's globe" }),
  ).not.toBeVisible();
  expect(
    (await publicPage.request.get(`/api/places/${place.id}/gallery`)).status(),
  ).toBe(404);
  await visitor.close();
});

test("shares current public globe previews and revokes them when hidden", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(75_000);
  const owner = await account(context, true);
  const globe = await db.globe.findUniqueOrThrow({
    where: { userId: owner.id },
  });
  const place = await db.place.create({
    data: {
      globeId: globe.id,
      name: "Paris",
      sourceCountry: "FR",
      latitude: 48.85,
      longitude: 2.35,
      visits: { create: {} },
    },
  });
  const publicPath = `/u/${owner.username}`;
  const crawler = { "User-Agent": "facebookexternalhit/1.1" };

  async function readImageUrl(path: string) {
    const document = await request.get(path, { headers: crawler });
    const head = (await document.text()).split("</head>")[0];
    const image = head.match(/property="og:image" content="([^"]+)"/)?.[1];
    if (image) {
      expect(head).toContain(`name="twitter:image" content="${image}"`);
      expect(head).toContain('name="robots" content="noindex, nofollow"');
    }
    return image;
  }

  async function downloadImage(url: string) {
    const response = await request.get(url, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const bytes = await response.body();
    expect(await sharp(bytes).metadata()).toMatchObject({
      width: 1200,
      height: 630,
    });
    return { bytes, headers: response.headers() };
  }

  const defaultImage = await readImageUrl("/");
  expect(defaultImage).toBe(`${TEST_ORIGIN}/share-image.png`);
  await downloadImage(defaultImage!);
  expect(await readImageUrl(publicPath)).toBeUndefined();

  await page.goto("/studio");
  await page.getByRole("button", { name: "Share globe", exact: true }).click();
  await page.getByRole("button", { name: "Publish my globe" }).click();
  await expect(
    page.getByRole("button", { name: "Make globe private" }),
  ).toBeVisible();
  const dottedUrl = (await readImageUrl(publicPath))!;
  const dotted = await downloadImage(dottedUrl);
  expect(dotted.headers["cache-control"]).toContain("no-store");
  await page.keyboard.press("Escape");

  await page.getByText("Globe style", { exact: true }).click();
  await page.getByRole("button", { name: /^Classic/ }).click();
  await expect
    .poll(async () => (await readImageUrl(publicPath)) !== dottedUrl)
    .toBe(true);
  const classicUrl = (await readImageUrl(publicPath))!;
  const classic = await downloadImage(classicUrl);
  expect(classic.bytes.equals(dotted.bytes)).toBe(false);
  const previous = await request.get(dottedUrl, { maxRedirects: 0 });
  expect(previous.status()).toBe(307);
  expect(new URL(previous.headers().location, TEST_ORIGIN).href).toBe(
    classicUrl,
  );

  await page.goto(`/studio?place=${place.id}`);
  await page.getByRole("button", { name: "Add photos", exact: true }).click();
  await page.getByLabel("Choose photos").setInputFiles({
    name: "preview.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 80, height: 80, channels: 3, background: "#e500b0" },
    })
      .png()
      .toBuffer(),
  });
  await page.getByRole("button", { name: "Upload photo", exact: true }).click();
  await expect(
    page.getByText("Added to your globe", { exact: true }),
  ).toBeVisible();
  const photoUrl = (await readImageUrl(publicPath))!;
  expect(photoUrl).not.toBe(classicUrl);
  const withPhoto = await downloadImage(photoUrl);
  await test.info().attach("public-globe-share-image", {
    body: withPhoto.bytes,
    contentType: "image/png",
  });
  const { data, info } = await sharp(withPhoto.bytes)
    .resize(120, 63)
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(
    data.some(
      (red, offset) =>
        offset % info.channels === 0 &&
        red > 180 &&
        data[offset + 1] < 50 &&
        data[offset + 2] > 120,
    ),
  ).toBe(true);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Delete photo", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect.poll(() => readImageUrl(publicPath)).toBe(classicUrl);

  await page.goto("/studio");
  await page.getByRole("button", { name: "Share globe", exact: true }).click();
  await page.getByRole("button", { name: "Make globe private" }).click();
  await expect(
    page.getByRole("button", { name: "Publish my globe" }),
  ).toBeVisible();
  expect(await readImageUrl(publicPath)).toBeUndefined();
  for (const url of [dottedUrl, classicUrl, photoUrl]) {
    expect((await request.get(url, { maxRedirects: 0 })).status()).toBe(404);
  }
});

test("validates file size through the form before creating an upload", async ({
  page,
  context,
}) => {
  const owner = await account(context, true);
  const globe = await db.globe.findUniqueOrThrow({
    where: { userId: owner.id },
  });
  const place = await db.place.create({
    data: {
      globeId: globe.id,
      name: "Paris",
      sourceCountry: "FR",
      latitude: 48.85,
      longitude: 2.35,
      visits: { create: {} },
    },
  });
  await page.goto(`/studio?place=${place.id}`);
  await page.getByRole("button", { name: "Add photos", exact: true }).click();
  let uploadRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/uploads") uploadRequests++;
  });
  await page.getByLabel("Choose photos").setInputFiles({
    name: "too-large.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(20_000_001),
  });
  await expect(page.getByRole("alert")).toContainText("20 MB");
  await page
    .getByRole("button", { name: /^Upload photos?$/, exact: true })
    .click();
  expect(uploadRequests).toBe(0);
  expect(
    await db.uploadIntent.count({
      where: { photo: { visit: { placeId: place.id } } },
    }),
  ).toBe(0);
});

test("uploads a batch, cancels a transfer and retries a failed file", async ({
  page,
  context,
}) => {
  const owner = await account(context, true);
  const globe = await db.globe.findUniqueOrThrow({
    where: { userId: owner.id },
  });
  const place = await db.place.create({
    data: {
      globeId: globe.id,
      name: "Paris",
      sourceCountry: "FR",
      latitude: 48.85,
      longitude: 2.35,
      visits: { create: {} },
    },
  });
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  let attempts = 0;
  let notifyBlocked!: () => void;
  let releaseBlocked!: () => void;
  const blocked = new Promise<void>((resolve) => {
    notifyBlocked = resolve;
  });
  const released = new Promise<void>((resolve) => {
    releaseBlocked = resolve;
  });
  await page.route(/^http:\/\/127\.0\.0\.1:8787\/upload\?/, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    attempts++;
    if (attempts === 1) return route.abort("failed");
    if (attempts === 2) {
      notifyBlocked();
      await released;
    }
    try {
      await route.continue();
    } catch {
      /* The cancelled XHR may already be gone. */
    }
  });
  await page.goto(`/studio?place=${place.id}`);
  await page.getByRole("button", { name: "Add photos", exact: true }).click();
  const buffer = readFileSync("tests/fixtures/tiny.png");
  await page.getByLabel("Choose photos").setInputFiles(
    ["retry.png", "cancel.png", "keep.png"].map((name) => ({
      name,
      mimeType: "image/png",
      buffer,
    })),
  );
  await page
    .getByRole("button", { name: /^Upload photos?$/, exact: true })
    .click();
  try {
    await blocked;
    await expect(page.getByText("Uploading 0%", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Cancel cancel.png", exact: true })
      .click();
  } finally {
    releaseBlocked();
  }
  await expect(
    page.getByText("Added to your globe", { exact: true }),
  ).toHaveCount(1);
  const retry = page.getByRole("button", {
    name: "Retry retry.png",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(
    page.getByText("Added to your globe", { exact: true }),
  ).toHaveCount(2);
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  expect(
    await db.photo.count({ where: { visit: { placeId: place.id } } }),
  ).toBe(2);
  expect(
    await db.photo.count({
      where: { visit: { placeId: place.id }, status: "READY" },
    }),
  ).toBe(2);
  expect(browserErrors).toEqual([]);
});

test("keeps all places accessible without WebGL", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      kind: string,
      ...args: unknown[]
    ) {
      if (kind === "webgl2" || kind === "webgl") return null;
      return original.apply(this, [kind, ...args] as never);
    } as typeof original;
  });
  await page.goto("/demo");
  await expect(page.getByText("Your places are still here.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start rotation" }),
  ).toBeVisible();
  await page.getByLabel("Search places").fill("Kyoto");
  await expect(page.locator(".place-row")).toHaveCount(1);
  await page.getByRole("button", { name: /Kyoto Japan/ }).click();
  await expect(
    page.getByRole("heading", { name: "Kyoto", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("browses repeated-visit photos, edits a caption and deletes the account", async ({
  page,
  context,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) =>
    browserErrors.push(error.stack ?? error.message),
  );
  const owner = await account(context, true);
  const globe = await db.globe.findUniqueOrThrow({
    where: { userId: owner.id },
  });
  const place = await db.place.create({
    data: {
      globeId: globe.id,
      name: "Paris",
      sourceCountry: "FR",
      latitude: 48.85,
      longitude: 2.35,
      visits: {
        create: [
          {
            photos: {
              create: {
                caption: "First visit",
                status: "READY",
                thumbnailKey: "photos/first/thumbnail.webp",
                displayKey: "photos/first/display.webp",
                totalBytes: 100,
              },
            },
          },
          {
            photos: {
              create: {
                caption: "Second visit",
                status: "READY",
                thumbnailKey: "photos/second/thumbnail.webp",
                displayKey: "photos/second/display.webp",
                totalBytes: 100,
              },
            },
          },
        ],
      },
    },
  });
  // UI test only: image delivery is verified separately against real Cloudflare.
  await page.route(/^http:\/\/127\.0\.0\.1:8787\/image\?/, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tiny.png"),
    }),
  );
  await page.goto(`/studio?place=${place.id}`);
  await expect(page.getByLabel("A little context")).toHaveValue("First visit");
  await page.getByRole("button", { name: "Next photo" }).click();
  await expect(page.getByLabel("A little context")).toHaveValue("Second visit");
  await page.getByRole("button", { name: "Previous photo" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByLabel("A little context")).toHaveValue("First visit");
  await page.locator(".gallery-image").dispatchEvent("touchstart", {
    touches: [{ identifier: 0, clientX: 200 }],
    changedTouches: [{ identifier: 0, clientX: 200 }],
  });
  await page.locator(".gallery-image").dispatchEvent("touchend", {
    changedTouches: [{ identifier: 0, clientX: 80 }],
  });
  await expect(page.getByLabel("A little context")).toHaveValue("Second visit");
  await page.getByRole("button", { name: "Previous photo" }).click();
  await page.getByLabel("A little context").fill("A new memory");
  await page.getByRole("button", { name: "Save caption" }).click();
  await expect
    .poll(
      async () =>
        await db.photo.count({
          where: { visit: { placeId: place.id }, caption: "A new memory" },
        }),
    )
    .toBe(1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Profile settings" }).click();
  await page
    .getByLabel(`Type ${owner.username} to confirm`)
    .fill(owner.username);
  await page
    .getByRole("button", { name: "Delete account permanently" })
    .click();
  await expect(page).toHaveURL(TEST_ORIGIN + "/");
  expect(await db.user.findUnique({ where: { id: owner.id } })).toBeNull();
  expect(
    await db.deletedIdentity.findUnique({ where: { userId: owner.id } }),
  ).toMatchObject({ authDeletedAt: null });
  await page.goto("/studio");
  await expect(page).toHaveURL(/sign-in/);
  expect(browserErrors).toEqual([]);
});

test("explains a deleted identity and stops registration while provider cleanup is pending", async ({
  page,
  context,
}) => {
  const owner = await account(context, true);
  await page.goto("/studio");
  await db.deletedIdentity.create({ data: { userId: owner.id } });
  await db.user.delete({ where: { id: owner.id } });
  await page.goto("/sign-up");
  await expect(
    page.getByRole("alert", { name: "Google authorization notice" }),
  ).toContainText("Your previous account was deleted.");
  const forbidden = await page.request.post("/api/account/restart", {
    headers: { Origin: "https://untrusted.example" },
  });
  expect(forbidden.status()).toBe(403);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(
    page.getByText(
      "Your previous account is still being removed. Please try again shortly.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
  expect(await db.user.findUnique({ where: { id: owner.id } })).toBeNull();
  expect(
    await db.deletedIdentity.findUnique({ where: { userId: owner.id } }),
  ).toMatchObject({ authDeletedAt: null });
});

test("validates email signup and reports the managed invalid-password response", async ({
  page,
}) => {
  await page.goto("/sign-up");
  let signups = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/sign-up/email")) signups++;
  });
  await page.getByLabel("Name", { exact: true }).fill("Jamie");
  await page.getByLabel("Email", { exact: true }).fill("invalid-email");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  expect(signups).toBe(0);
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("jamie@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in with email" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with email" }),
  ).toBeEnabled();
});

test("renders the landing page and example without horizontal overflow", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  if (mobile) await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "GlobeAlbum." }),
  ).toBeVisible();
  const preview = page.locator(".hero-globe-composition");
  const globe = preview.locator("[data-globe-style]");
  const styles = preview.getByRole("group", { name: "Preview globe style" });
  const dotted = styles.getByRole("button", { name: "Dotted" });
  const minimal = styles.getByRole("button", { name: "Minimal" });
  const classic = styles.getByRole("button", { name: "Classic" });
  await expect(globe).toHaveAttribute("data-globe-style", "dotted");
  await expect(dotted).toHaveAttribute("aria-pressed", "true");
  if (mobile) {
    const [first, middle, last] = await Promise.all([
      dotted.boundingBox(),
      minimal.boundingBox(),
      classic.boundingBox(),
    ]);
    expect(middle!.y).toBe(first!.y);
    expect(last!.y).toBe(first!.y);
    expect(middle!.width).toBeCloseTo(first!.width, 1);
    expect(last!.width).toBeCloseTo(first!.width, 1);
    expect(last!.x + last!.width).toBeCloseTo(320 - first!.x, 1);
    await minimal.tap();
  } else {
    await minimal.press("Enter");
  }
  await expect(globe).toHaveAttribute("data-globe-style", "atlas");
  await expect(minimal).toHaveAttribute("aria-pressed", "true");
  await expect(
    globe.locator(".globe-country-label[data-label-visible]").first(),
  ).toBeVisible();
  await classic.click();
  await expect(globe).toHaveAttribute("data-globe-style", "orbit");
  await expect(classic).toHaveAttribute("aria-pressed", "true");
  await expect(minimal).toHaveAttribute("aria-pressed", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/verification/landing-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await dotted.click();
  await expect(globe).toHaveAttribute("data-globe-style", "dotted");
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "The long way home" }),
  ).toBeVisible();
  await expect(page.locator(".globe-stage canvas")).toBeVisible();
  await expect(page.locator("[data-globe-style]")).toHaveAttribute(
    "data-globe-style",
    "dotted",
  );
  await expect(
    page.locator(".globe-marker.photo-marker").first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/verification/globe-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("removes a failed JPEG and selects the same file again without closing", async ({
  page,
  context,
}) => {
  const owner = await account(context, true);
  const globe = await db.globe.findUniqueOrThrow({
    where: { userId: owner.id },
  });
  const place = await db.place.create({
    data: {
      globeId: globe.id,
      name: "Paris",
      sourceCountry: "FR",
      latitude: 48.85,
      longitude: 2.35,
      visits: { create: {} },
    },
  });
  let rejected = false;
  await page.route("**/api/uploads", async (route) => {
    if (!rejected) {
      rejected = true;
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "This request origin is not allowed." }),
      });
    }
    return route.continue();
  });
  await page.goto(`/studio?place=${place.id}`);
  await page.getByRole("button", { name: "Add photos", exact: true }).click();
  const file = {
    name: "same.jpeg",
    mimeType: "image/jpeg",
    buffer: readFileSync("tests/fixtures/tiny.jpeg"),
  };
  await page.getByLabel("Choose photos").setInputFiles(file);
  await expect(page.getByAltText("Preview of same.jpeg")).toBeVisible();
  await expect(
    page.getByText("1 photo selected", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Upload photos?$/, exact: true })
    .click();
  await expect(
    page.getByText("This request origin is not allowed.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove same.jpeg", exact: true })
    .click();
  await expect(
    page.getByText("This request origin is not allowed.", { exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("Choose photos").setInputFiles(file);
  await expect(page.getByAltText("Preview of same.jpeg")).toBeVisible();
  await expect(
    page.getByText("1 photo selected", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Upload photos?$/, exact: true })
    .click();
  await expect(
    page.getByText("Added to your globe", { exact: true }),
  ).toBeVisible();
});

test("finds city coordinates automatically and accepts one optional visit date", async ({
  page,
  context,
}) => {
  const owner = await account(context, true);
  if (!process.env.GLOBEALBUM_LIVE_GEONAMES_USERNAME)
    await page.route("**/api/places/search?**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          places: [
            {
              name: "Krompachy",
              providerId: "724443",
              country: "SK",
              region: "Košice",
              latitude: 48.9145,
              longitude: 20.8751,
            },
          ],
        }),
      }),
    );
  await page.goto("/studio");
  await page.getByRole("button", { name: "Add place", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("City or town").fill("Krompachy");
  await expect(
    dialog.getByRole("listbox", { name: "City suggestions" }),
  ).toBeVisible();
  await dialog
    .getByRole("combobox", { name: "City or town" })
    .press("ArrowDown");
  await dialog.getByRole("combobox", { name: "City or town" }).press("Enter");
  await expect(dialog.locator('input[type="number"]')).toHaveCount(0);
  await expect(dialog.locator('input[type="date"]')).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: /Visit date/ }),
  ).toContainText("Choose a date");
  await dialog.getByRole("button", { name: "Add place", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Add photos to Krompachy" }),
  ).toBeVisible();
  await dialog.getByLabel("Choose photos").setInputFiles({
    name: "new-place.png",
    mimeType: "image/png",
    buffer: readFileSync("tests/fixtures/tiny.png"),
  });
  await dialog
    .getByRole("button", { name: "Upload photo", exact: true })
    .click();
  await expect(
    dialog.getByText("Added to your globe", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const place = await db.place.findFirstOrThrow({
    where: { name: "Krompachy", globe: { userId: owner.id } },
    include: { visits: true },
  });
  expect(place.latitude).toBeCloseTo(48.9145, 3);
  expect(place.longitude).toBeCloseTo(20.8751, 3);
  expect(place.sourceCountry).toBe("SK");
  expect(place.providerId).toMatch(/^\d+$/);
  if (process.env.GLOBEALBUM_LIVE_GEONAMES_USERNAME)
    console.info(
      "PASS live GeoNames search, keyboard selection and PostgreSQL persistence",
    );
  expect(place.visits[0].startDate).toBeNull();
  expect(place.visits[0].endDate).toBeNull();
  expect(
    await db.photo.count({
      where: { visitId: place.visits[0].id, status: "READY" },
    }),
  ).toBe(1);
});

test("waits for the address form to become interactive before accepting a name", async ({
  page,
  context,
}) => {
  await account(context);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => {
    await gate;
    try {
      await route.continue();
    } catch {}
  });
  try {
    await page.goto("/onboarding", { waitUntil: "commit" });
    await expect(page.getByLabel("What should we call you?")).toBeVisible();
    await expect(page.getByLabel("What should we call you?")).toBeDisabled();
  } finally {
    release();
  }
  await page.getByLabel("What should we call you?").fill("Matej Bendík");
  await expect(page.getByLabel("Your globe address")).toHaveValue(
    /^matej-bendik(?:-\d+)?$/,
  );
});

test("opens the landing photo directly and keeps places in a floating panel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const marker = page
    .locator('.hero-globe-composition .photo-marker[data-facing="true"]')
    .first();
  await expect(marker).toBeVisible();
  await marker.locator(".marker-paper").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").locator(".gallery-main-image"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/demo");
  await expect(page.locator(".place-sidebar")).toHaveCount(0);
  await expect(
    page.getByLabel("Place list", { exact: true }),
  ).not.toBeVisible();
  const stage = await page.locator(".globe-workspace").boundingBox();
  expect(stage!.width).toBeGreaterThan(
    (page.viewportSize()?.width || 0) * 0.95,
  );
  await page.getByRole("button", { name: /Places/ }).click();
  const panel = page.getByLabel("Place list", { exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.locator(".place-row")).toHaveCount(6);
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(page.getByRole("button", { name: /Places/ })).toBeFocused();
});

test("switches the whole globe between light and dark and remembers the preference", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/demo");
  const land = await page.request.get("/land-dots.json");
  expect(land.headers()["content-type"]).toContain("application/json");
  expect((await land.json()).length).toBeGreaterThan(100);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('[data-globe-theme="light"]')).toBeVisible();
  await page.screenshot({
    path: `.local/verification/light-${testInfo.project.name}.png`,
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('[data-globe-theme="dark"]')).toBeVisible();
  await page.screenshot({
    path: `.local/verification/dark-${testInfo.project.name}.png`,
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.getByRole("button", { name: /Places/ }).click();
  await page.getByRole("button", { name: /Paris France/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(errors).toEqual([]);
});

test("shows account navigation when signed in and signs out from the dropdown", async ({
  page,
  context,
}) => {
  await account(context, true);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  const heroActions = page.locator(".hero-actions");
  await expect(
    nav.getByRole("link", { name: "Create your globe", exact: true }),
  ).toHaveCount(0);
  await expect(nav.locator('a[href="/demo"]')).toHaveCount(0);
  await expect(
    heroActions.getByRole("link", { name: "Open your globe", exact: true }),
  ).toHaveAttribute("href", "/studio");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "My globe" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Profile settings" }).click();
  await expect(page).toHaveURL(TEST_ORIGIN + "/settings");
  await expect(
    page.getByRole("heading", { name: "Profile settings" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(TEST_ORIGIN + "/");
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).not.toBeVisible();
  const createGlobe = heroActions.getByRole("link", {
    name: "Create your globe",
    exact: true,
  });
  await expect(createGlobe).toHaveAttribute("href", "/sign-in");
  await expect(createGlobe).toHaveAccessibleDescription("Free to use");
  await expect(
    heroActions.getByText("Free to use", { exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Create your globe", exact: true }),
  ).toHaveAttribute("href", "/sign-in");
  await expect(
    heroActions.getByRole("link", { name: "Explore an example", exact: true }),
  ).toHaveAttribute("href", "/demo");
  await expect(nav.locator('a[href="/demo"]')).toHaveText("Explore an example");
});

test("edits a profile on its own settings page without changing its address", async ({
  page,
  context,
}, testInfo) => {
  const owner = await account(context, true);
  await page.goto("/studio?settings=profile");
  await expect(page).toHaveURL(TEST_ORIGIN + "/settings");
  await expect(
    page.getByRole("heading", { name: "Profile settings" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Your globe address")).toHaveValue(
    `${TEST_ORIGIN}/u/${owner.username}`,
  );
  await expect(page.getByLabel("Your globe address")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.getByLabel("Sign-in email")).toHaveValue(
    `${owner.id}@example.test`,
  );
  await expect(page.getByLabel("Sign-in email")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.getByText("Private globe", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete account permanently" }),
  ).toBeDisabled();
  await page.getByLabel("Display name", { exact: true }).fill("Jamie Travels");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile updated.");
  await expect(page.locator(".settings-identity-name")).toHaveText(
    "Jamie Travels",
  );
  expect(
    await db.globe.findUnique({ where: { userId: owner.id } }),
  ).toMatchObject({
    displayName: "Jamie Travels",
    username: owner.username,
    published: false,
  });
  await page.reload();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Jamie Travels",
  );
  await expect(page.getByLabel("Your globe address")).toHaveValue(
    `${TEST_ORIGIN}/u/${owner.username}`,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/verification/settings-${testInfo.project.name}-light.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: `.local/verification/settings-${testInfo.project.name}-dark.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Back to my globe" }).click();
  await expect(page).toHaveURL(TEST_ORIGIN + "/studio");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Profile settings" }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Jamie Travels",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("requires sign-in and onboarding before opening settings", async ({
  page,
  context,
}) => {
  const sessionProbe = await page.request.head("/api/auth/get-session");
  expect(sessionProbe.status()).toBe(200);
  expect(await sessionProbe.text()).toBe("");
  await page.goto("/settings");
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByLabel("Sign-in email")).toHaveCount(0);
  await account(context);
  await page.goto("/settings");
  await expect(page).toHaveURL(TEST_ORIGIN + "/onboarding");
});

test("explains an existing-email Google conflict and sends the signup callbacks", async ({
  page,
}) => {
  await page.goto("/sign-up?error=account_not_linked");
  await expect(
    page.getByRole("alert", { name: "Google authorization notice" }),
  ).toContainText(
    "Sign in with email, then connect Google in Profile settings.",
  );
  let payload: Record<string, string> | undefined;
  await page.route("**/api/auth/sign-in/social", (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: "PROVIDER_UNAVAILABLE",
        message: "Unavailable",
      }),
    });
  });
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(
    page.getByText("Sign-in is unavailable. Please try again.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(payload?.provider).toBe("google");
  expect(new URL(payload!.callbackURL, TEST_ORIGIN).pathname).toBe("/studio");
  expect(new URL(payload!.newUserCallbackURL, TEST_ORIGIN).pathname).toBe(
    "/onboarding",
  );
  expect(new URL(payload!.errorCallbackURL, TEST_ORIGIN).pathname).toBe(
    "/sign-in",
  );
  await page.goto("/sign-in?error=private-unexpected-provider-message");
  await expect(
    page.getByRole("alert", { name: "Google authorization notice" }),
  ).toHaveText("Google sign-in could not be completed. Please try again.");
  await expect(
    page.getByText("private-unexpected-provider-message", { exact: true }),
  ).toHaveCount(0);
});

test("requires a session for Google linking and preserves the globe through failure and retry", async ({
  page,
  context,
}) => {
  const denied = await page.request.post("/api/auth/link-social", {
    data: {
      provider: "google",
      idToken: { token: "invalid", nonce: "invalid" },
    },
  });
  expect(denied.status()).toBe(401);
  const owner = await account(context, true);
  const before = await db.globe.findUniqueOrThrow({
    where: { userId: owner.id },
  });
  const linkRequest = page.waitForRequest((request) =>
    request.url().endsWith("/api/auth/link-social"),
  );
  // Exercise the real Neon SDK/proxy contract without contacting Google or
  // passing a real identity token to the isolated Auth fake.
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `let attempts = 0; window.google = { accounts: { id: {
        initialize(options) { this.options = options; },
        renderButton(parent) {
          const button = document.createElement("button");
          button.textContent = "Continue with Google";
          button.onclick = () => this.options.callback({
            credential: ++attempts === 1 ? "invalid-test-token" : "local-contract-google-token"
          });
          parent.replaceChildren(button);
        }
      } } };`,
    }),
  );
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Connect Google", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  const payload = (await linkRequest).postDataJSON();
  expect(payload.provider).toBe("google");
  expect(payload.idToken.token).toBe("invalid-test-token");
  expect(payload.idToken.nonce).toMatch(/^[0-9a-f-]{36}$/);
  expect(payload.callbackURL).toBeUndefined();
  await expect(
    page.getByText(
      "Google could not be connected. Use the same email as your account and try again.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled();
  expect(await db.globe.findUnique({ where: { userId: owner.id } })).toEqual(
    before,
  );
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(
    page.getByText("Google is connected to this account.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toHaveCount(0);
  expect(await db.globe.findUnique({ where: { userId: owner.id } })).toEqual(
    before,
  );
  await page.goto("/settings?error=unable_to_link_account");
  await expect(
    page.getByRole("alert", { name: "Google authorization notice" }),
  ).toHaveText(
    "Google could not be connected. Use the same email as your account and try again.",
  );
});

test("adds separate photo selections together instead of replacing the first", async ({
  page,
  context,
}) => {
  const owner = await account(context, true);
  const globe = await db.globe.findUniqueOrThrow({
    where: { userId: owner.id },
  });
  const place = await db.place.create({
    data: {
      globeId: globe.id,
      name: "Paris",
      sourceCountry: "FR",
      latitude: 48.85,
      longitude: 2.35,
      visits: { create: {} },
    },
  });
  await page.goto(`/studio?place=${place.id}`);
  await page.getByRole("button", { name: "Add photos", exact: true }).click();
  const buffer = readFileSync("tests/fixtures/tiny.png");
  await page
    .getByLabel("Choose photos")
    .setInputFiles({ name: "first.png", mimeType: "image/png", buffer });
  await expect(page.getByText("first.png", { exact: true })).toBeVisible();
  await page
    .getByLabel("Choose photos")
    .setInputFiles({ name: "second.png", mimeType: "image/png", buffer });
  await expect(page.getByText("first.png", { exact: true })).toBeVisible();
  await expect(page.getByText("second.png", { exact: true })).toBeVisible();
  await expect(
    page.getByText("2 photos selected", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Upload photos", exact: true })
    .click();
  await expect(
    page.getByText("Added to your globe", { exact: true }),
  ).toHaveCount(2);
  await page
    .getByLabel("Choose photos")
    .setInputFiles({ name: "third.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Upload photo", exact: true }).click();
  await expect(
    page.getByText("Added to your globe", { exact: true }),
  ).toHaveCount(3);
  expect(
    await db.photo.count({
      where: { visit: { placeId: place.id }, status: "READY" },
    }),
  ).toBe(3);
});

test("keeps primary button fills stable throughout hover", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  test.skip(
    testInfo.project.name === "mobile",
    "Pointer hover is verified on desktop.",
  );
  async function stable(button: Locator) {
    await expect(button).toBeVisible();
    const normal = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.backgroundColor, image: style.backgroundImage };
    });
    await button.hover();
    const frames = await button.evaluate(async (element) => {
      const frames = [];
      for (let i = 0; i < 18; i++) {
        await new Promise(requestAnimationFrame);
        const style = getComputedStyle(element);
        frames.push({
          color: style.backgroundColor,
          image: style.backgroundImage,
        });
      }
      return frames;
    });
    expect(
      frames.every((frame) => JSON.stringify(frame) === JSON.stringify(normal)),
    ).toBe(true);
  }
  const owner = await account(context, true);
  for (const theme of ["light", "dark"]) {
    await page.goto("/studio");
    if (theme === "dark")
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await stable(page.getByRole("button", { name: "Add your first place" }));
    await stable(page.getByRole("button", { name: "Add place", exact: true }));
    await page.getByRole("button", { name: "Add place", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("City or town").fill("Paris");
    await dialog
      .getByRole("button", { name: "Choose location on a map" })
      .click();
    await dialog.getByLabel("Country or territory").selectOption("FR");
    await dialog.getByRole("button", { name: "Use map center" }).click();
    await stable(
      dialog.getByRole("button", { name: "Add place", exact: true }),
    );
    await dialog
      .getByRole("button", { name: "Add place", exact: true })
      .click();
    await dialog.getByLabel("Choose photos").setInputFiles({
      name: `${theme}.png`,
      mimeType: "image/png",
      buffer: readFileSync("tests/fixtures/tiny.png"),
    });
    await stable(
      dialog.getByRole("button", { name: "Upload photo", exact: true }),
    );
    await dialog.getByLabel("Choose photos").setInputFiles({
      name: `${theme}-more.png`,
      mimeType: "image/png",
      buffer: readFileSync("tests/fixtures/tiny.png"),
    });
    await stable(
      dialog.getByRole("button", { name: "Upload photos", exact: true }),
    );
    await page.screenshot({
      path: `.local/verification/add-place-photos-${theme}.png`,
    });
    await dialog.getByRole("button", { name: "Skip for now" }).click();
    await page.goto("/settings");
    await stable(page.getByRole("button", { name: "Save profile" }));
    // Keep the next iteration's globe empty without changing the session.
    await db.place.deleteMany({ where: { globe: { userId: owner.id } } });
  }
  await context.clearCookies();
  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(path);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        localStorage.setItem("globealbum-theme", value);
      }, theme);
      await page.reload();
      await stable(page.getByRole("button", { name: "Continue with Google" }));
      await stable(
        page.getByRole("button", {
          name: path === "/sign-in" ? "Sign in with email" : "Create account",
          exact: true,
        }),
      );
    }
  }
});

test("scales postcards with zoom while keeping the place pin visible", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demo");
  const marker = page.getByRole("button", { name: "Open Paris gallery" });
  const photo = marker.locator(".marker-paper");
  const pin = marker.locator(".marker-core");
  await expect(photo).toBeVisible();
  await expect(pin).toBeVisible();
  const initial = (await photo.boundingBox())!;
  const pinBounds = (await pin.boundingBox())!;
  expect(initial.y + initial.height).toBeLessThan(pinBounds.y);
  const canvas = page.locator(".globe-stage canvas").first();
  const canvasBounds = await canvas.boundingBox();
  const center = {
    // Wheel over the canvas next to the central pin rather than its button.
    x: canvasBounds!.x + canvasBounds!.width / 2 - 30,
    y: canvasBounds!.y + canvasBounds!.height / 2,
  };
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, -12000);
  await page.mouse.move(5, 80);
  await expect
    .poll(async () => (await photo.boundingBox())?.width ?? 0)
    .toBeGreaterThan(initial.width * 1.3);
  await expect(pin).toHaveCSS("width", "11px");
  await page.screenshot({
    path: `.local/verification/postcards-close-${testInfo.project.name}.png`,
  });
  await page.getByRole("button", { name: "Reset globe view" }).click();
  await expect
    .poll(async () => (await photo.boundingBox())?.width ?? Infinity)
    .toBeLessThan(initial.width * 1.05);
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, 12000);
  await page.mouse.move(5, 80);
  await expect
    .poll(async () => (await photo.boundingBox())?.width ?? Infinity)
    .toBeLessThan(initial.width * 0.85);
  await expect(photo).toBeVisible();
  await expect(pin).toHaveCSS("width", "11px");
  if (testInfo.project.name === "desktop") {
    await page.mouse.move(5, 80);
    const image = marker.locator("img");
    const before = await image.boundingBox();
    await photo.hover();
    await expect
      .poll(async () => (await image.boundingBox())?.width ?? 0)
      .toBeGreaterThan(before!.width * 1.02);
  }
  await page.screenshot({
    path: `.local/verification/postcards-${testInfo.project.name}.png`,
  });
});

test("keeps the landing theme on sign-in and sign-up surfaces", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Create your globe", exact: true })
    .click();
  for (const path of ["/sign-in", "/sign-up"]) {
    if (path === "/sign-up")
      await page
        .getByRole("link", { name: "Create an account", exact: true })
        .click();
    await expect(page).toHaveURL(TEST_ORIGIN + path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const background = await page
      .locator(".auth-page")
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    // Check the painted background, not just the persisted root theme attribute.
    const surfaceRGB = await page
      .locator("input")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(surfaceRGB).toBe("rgb(27, 32, 35)");
    expect(background).toContain("rgb(27, 32, 35)");
    expect(background).not.toContain("rgb(255, 255, 255)");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: `.local/verification/auth-${path.slice(1)}-dark-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "Back home" }).click();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.goto("/sign-in");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("input").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
});

test.describe("visit calendar", () => {
  test.use({ timezoneId: "Pacific/Kiritimati" });
  test("fits on first open after confirming a point on the map", async ({
    page,
    context,
  }) => {
    await account(context, true);
    await page.goto("/studio");
    await page.getByRole("button", { name: "Add place", exact: true }).click();
    const add = page.getByRole("dialog");
    await add.getByLabel("City or town").fill("Frankfurt");
    await add.getByRole("button", { name: "Choose location on a map" }).click();
    await add.getByLabel("Country or territory").selectOption("DE");
    await add.getByRole("button", { name: "Use map center" }).click();
    await add.getByRole("button", { name: /Visit date/ }).click();
    const calendar = page.getByRole("dialog", { name: "Choose visit date" });
    await expect(calendar.getByRole("grid")).toBeVisible();
    await expect
      .poll(() =>
        calendar
          .locator(".rdp-root")
          .evaluate((root) => root.scrollHeight - root.clientHeight),
      )
      .toBeLessThanOrEqual(1);
  });

  test("edits and clears a date without timezone shifts and keeps the parent dialog open on Escape", async ({
    page,
    context,
  }, testInfo) => {
    const owner = await account(context, true);
    const place = await db.place.create({
      data: {
        globe: { connect: { userId: owner.id } },
        name: "Kyoto",
        sourceCountry: "JP",
        latitude: 35.01,
        longitude: 135.76,
        visits: { create: { startDate: new Date("2024-06-01T00:00:00Z") } },
      },
      include: { visits: true },
    });
    await page.goto(`/studio?place=${place.id}`);
    await page.getByRole("button", { name: "2024-06-01 0 photos" }).click();
    const edit = page.getByRole("dialog", { name: "Edit visit", exact: true });
    const trigger = edit.getByRole("button", { name: /Visit date/ });
    await expect(trigger).toContainText("1 June 2024");
    await trigger.click();
    const calendar = page.getByRole("dialog", {
      name: "Choose visit date",
      exact: true,
    });
    await expect(
      calendar.getByRole("button", { name: /June 1st, 2024/ }),
    ).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(trigger).toContainText("2 June 2024");
    await expect(trigger).toBeFocused();
    await edit.getByRole("button", { name: "Save visit" }).click();
    await expect(edit).not.toBeVisible();
    expect(
      (
        await db.visit.findUniqueOrThrow({ where: { id: place.visits[0].id } })
      ).startDate
        ?.toISOString()
        .slice(0, 10),
    ).toBe("2024-06-02");
    await page.getByRole("button", { name: "2024-06-02 0 photos" }).click();
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(calendar).not.toBeVisible();
    await expect(edit).toBeVisible();
    await trigger.click();
    await calendar.getByRole("button", { name: "Today", exact: true }).click();
    await expect(trigger).not.toContainText("June 2024");
    await trigger.click();
    await calendar
      .getByRole("button", { name: "Clear date", exact: true })
      .click();
    await expect(trigger).toContainText("Choose a date");
    await edit.getByRole("button", { name: "Save visit" }).click();
    await expect(edit).not.toBeVisible();
    expect(
      (await db.visit.findUniqueOrThrow({ where: { id: place.visits[0].id } }))
        .startDate,
    ).toBeNull();
    await page.getByRole("button", { name: "Visit 1 0 photos" }).click();
    await trigger.click();
    await expect(calendar.getByRole("grid")).toBeVisible();
    await expect(
      calendar.getByRole("button", { name: "Today", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page.screenshot({
      path: `.local/verification/date-picker-light-${testInfo.project.name}.png`,
    });
    // Theme is the real persisted preference, not a different calendar palette.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await page.goto(`/studio?place=${place.id}`);
    await page.getByRole("button", { name: "Visit 1 0 photos" }).click();
    await trigger.click();
    await expect(calendar).toHaveCSS("background-color", "rgb(27, 32, 35)");
    await expect(calendar.getByRole("grid")).toBeVisible();
    await expect(
      calendar.getByRole("button", { name: "Today", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    const box = await calendar.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({
      path: `.local/verification/date-picker-dark-${testInfo.project.name}.png`,
    });
  });
});

test("centers a public globe on its only place and stacks its postcards", async ({
  page,
  context,
}, testInfo) => {
  const owner = await account(context, true);
  await db.globe.update({
    where: { userId: owner.id },
    data: { published: true },
  });
  const place = await db.place.create({
    data: {
      globe: { connect: { userId: owner.id } },
      name: "Tokyo",
      sourceCountry: "JP",
      latitude: 35.6762,
      longitude: 139.6503,
      visits: {
        create: {
          photos: {
            create: Array.from({ length: 3 }, () => {
              const id = randomUUID();
              return {
                id,
                status: "READY",
                thumbnailKey: `photos/${id}/thumbnail.webp`,
                displayKey: `photos/${id}/display.webp`,
              };
            }),
          },
        },
      },
    },
  });
  await context.clearCookies();
  await page.route("http://127.0.0.1:8787/image?*", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tiny.png"),
    }),
  );
  await page.goto(`/u/${owner.username}`);
  const marker = page.getByRole("button", { name: "Open Tokyo gallery" });
  const canvas = page.locator(".globe-stage canvas").first();
  const stage = await canvas.boundingBox();
  expect(stage).not.toBeNull();
  const centerDistance = async () => {
    const bounds = await marker.boundingBox();
    if (!bounds || (await marker.getAttribute("data-facing")) !== "true")
      return Infinity;
    return Math.hypot(
      bounds.x + bounds.width / 2 - (stage!.x + stage!.width / 2),
      bounds.y + bounds.height / 2 - (stage!.y + stage!.height / 2),
    );
  };
  // The postcard may move slightly between the first render and this sample.
  await expect.poll(centerDistance).toBeLessThan(32);
  const initialDistance = await centerDistance();
  const pause = page.getByRole("button", { name: "Pause rotation" });
  await expect(pause).toBeVisible();
  await expect
    .poll(centerDistance, { timeout: 10_000 })
    .toBeGreaterThan(initialDistance + 15);
  await pause.click();
  const card = marker.locator(".marker-card");
  await expect(card).toHaveAttribute("data-layers", "3");
  await expect(marker.locator("img")).toHaveCount(1);
  expect(
    await card.evaluate((el) =>
      ["::before", "::after"].map(
        (layer) => getComputedStyle(el, layer).content,
      ),
    ),
  ).toEqual(['""', '""']);

  const x = stage!.x + stage!.width * 0.25;
  const y = stage!.y + stage!.height * 0.68;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + stage!.width * 0.35, y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(centerDistance).toBeGreaterThan(30);
  await page.getByRole("button", { name: "Reset globe view" }).click();
  await expect.poll(centerDistance).toBeLessThan(12);
  await page.screenshot({
    path: `.local/verification/globe-stack-${testInfo.project.name}.png`,
  });
  await marker.click();
  await expect(page).toHaveURL(new RegExp(`place=${place.id}`));
  const gallery = page.getByRole("dialog", { name: "Tokyo" });
  await expect(gallery).toContainText("3 photos");
});

test("saves a globe style and shares it across viewer themes", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  const owner = await account(context, true);
  await db.globe.update({
    where: { userId: owner.id },
    data: {
      published: true,
      places: {
        create: [
          {
            name: "London",
            sourceCountry: "GB",
            latitude: 51.5072,
            longitude: -0.1276,
          },
          {
            name: "Košice",
            sourceCountry: "SK",
            latitude: 48.7164,
            longitude: 21.2611,
          },
        ].map((place) => ({
          ...place,
          visits: {
            create: {
              photos: {
                create: {
                  status: "READY",
                  thumbnailKey: `photos/${randomUUID()}/thumbnail.webp`,
                  displayKey: `photos/${randomUUID()}/display.webp`,
                },
              },
            },
          },
        })),
      },
    },
  });
  await page.route("http://127.0.0.1:8787/image?*", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tiny.png"),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/studio");
  const globe = page.locator("[data-globe-style]");
  await expect(globe).toHaveAttribute("data-globe-style", "dotted");
  await expect(
    page.getByRole("button", { name: "Start rotation" }),
  ).toBeVisible();
  const stylePicker = page.getByText("Globe style", { exact: true });
  await stylePicker.click();
  const minimal = page.getByRole("button", { name: /^Minimal/ });
  const classic = page.getByRole("button", { name: /^Classic/ });
  const labels = globe.locator(".globe-country-label[data-label-visible]");
  const tooltip = globe.locator(".float-tooltip-kap");
  async function hoverFrance() {
    const france = labels.filter({ hasText: /^France$/ });
    await expect(france).toBeVisible();
    const bounds = (await france.boundingBox())!;
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
  }
  const geometry = page.waitForResponse(
    (response) =>
      response.url().endsWith("/atlas-countries.geojson") && response.ok(),
  );
  if (testInfo.project.name === "mobile") await minimal.tap();
  else await minimal.press("Enter");
  await expect(minimal).toBeHidden({ timeout: 2_000 });
  await expect(stylePicker).toBeFocused();
  const countries = await (await geometry).json();
  expect(countries).toHaveLength(177);
  expect(countries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "GB", name: "United Kingdom" }),
      expect.objectContaining({ code: "SK", name: "Slovakia" }),
    ]),
  );
  await expect(globe).toHaveAttribute("data-globe-style", "atlas");
  await expect(labels.filter({ hasText: /^Slovakia$/ })).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await hoverFrance();
    await expect(tooltip).toBeHidden();
  }
  expect(
    (await db.globe.findUniqueOrThrow({ where: { userId: owner.id } })).style,
  ).toBe("atlas");
  await page.screenshot({
    path: `.local/verification/globe-atlas-light-${testInfo.project.name}.png`,
  });

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(globe).toHaveAttribute("data-globe-theme", "dark");
  await page.screenshot({
    path: `.local/verification/globe-atlas-dark-${testInfo.project.name}.png`,
  });
  await stylePicker.click();
  await expect(minimal).toHaveAttribute("aria-pressed", "true");
  await classic.click();
  await expect(classic).toBeHidden();
  await stylePicker.click();
  await expect(classic).toHaveAttribute("aria-pressed", "true");
  await expect(classic).toBeEnabled();
  await classic.click();
  await expect(classic).toBeHidden();
  await page.reload();
  await expect(globe).toHaveAttribute("data-globe-style", "orbit");
  await expect(globe).toHaveAttribute("data-globe-theme", "dark");

  await context.clearCookies();
  await page.goto(`/u/${owner.username}`);
  await expect(globe).toHaveAttribute("data-globe-style", "orbit");
  await expect(page.getByText("Globe style", { exact: true })).toHaveCount(0);
  await expect.poll(() => labels.count()).toBeGreaterThan(4);
  await expect(labels.filter({ hasText: /^Slovakia$/ })).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await hoverFrance();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText("France");
  }
  expect(
    await labels.evaluateAll((elements) => {
      const bounds = elements.map((element) => element.getBoundingClientRect());
      return bounds.some((a, i) =>
        bounds
          .slice(i + 1)
          .some(
            (b) =>
              a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top,
          ),
      );
    }),
  ).toBe(false);
  for (const name of ["London", "Košice"]) {
    const marker = page.getByRole("button", { name: `Open ${name} gallery` });
    await expect(marker).toHaveAttribute("data-facing", "true");
    await expect(marker.locator(".marker-core")).toBeVisible();
    if (testInfo.project.name === "desktop")
      await expect(marker.locator(".marker-paper")).toBeVisible();
  }
  await page.screenshot({
    path: `.local/verification/globe-orbit-dark-${testInfo.project.name}.png`,
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(globe).toHaveAttribute("data-globe-theme", "light");
  await expect(globe).toHaveAttribute("data-globe-style", "orbit");
  await page.screenshot({
    path: `.local/verification/globe-orbit-light-${testInfo.project.name}.png`,
  });
});
