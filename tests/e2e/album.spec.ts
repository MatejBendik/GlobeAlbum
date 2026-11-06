import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
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

async function account(context: BrowserContext, onboarded = false) {
  const id = randomUUID();
  const username = `tester-${id.slice(0, 8)}`;
  await db.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      name: "Jamie",
      emailVerified: true,
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
  await expect(add.locator('input[type="date"]')).toHaveCount(1);
  await add
    .getByRole("button", { name: "Use map center", exact: true })
    .click();
  await add.getByRole("button", { name: "Add place", exact: true }).click();
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
  await visit.getByLabel(/Visit date/).fill("2024-06-01");
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
    .getByRole("button", { name: "Upload photos", exact: true })
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
    .getByRole("button", { name: "Upload photos", exact: true })
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
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "GlobeAlbum." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/verification/landing-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "The long way home" }),
  ).toBeVisible();
  await expect(page.locator(".globe-stage canvas")).toBeVisible();
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
    .getByRole("button", { name: "Upload photos", exact: true })
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
    .getByRole("button", { name: "Upload photos", exact: true })
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
  await dialog.getByRole("button", { name: /Krompachy.*Košice/ }).click();
  await expect(dialog.locator('input[type="number"]')).toHaveCount(0);
  await expect(dialog.locator('input[type="date"]')).toHaveCount(1);
  await expect(dialog.getByLabel("Visit date", { exact: false })).toHaveValue(
    "",
  );
  await dialog.getByRole("button", { name: "Add place", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const place = await db.place.findFirstOrThrow({
    where: { name: "Krompachy", globe: { userId: owner.id } },
    include: { visits: true },
  });
  expect(place.latitude).toBe(48.9145);
  expect(place.longitude).toBe(20.8751);
  expect(place.visits[0].startDate).toBeNull();
  expect(place.visits[0].endDate).toBeNull();
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
  await marker.click({ position: { x: 25, y: 20 } });
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
  await expect(
    page.getByRole("link", { name: "Make it yours" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore an example" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "My globe" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Profile settings" }).click();
  await expect(
    page.getByRole("dialog", { name: "Profile settings" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(TEST_ORIGIN + "/");
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Make it yours" })).toBeVisible();
});
