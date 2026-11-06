import { test, expect, type BrowserContext } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { TEST_ORIGIN, TEST_SESSION_SECRET } from "./constants";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }),
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
  const token = randomUUID();
  await db.session.create({
    data: {
      id: randomUUID(),
      token,
      userId: id,
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });
  const signature = createHmac("sha256", TEST_SESSION_SECRET)
    .update(token)
    .digest("base64");
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: encodeURIComponent(`${token}.${signature}`),
      url: TEST_ORIGIN,
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
  await page.getByLabel("Your globe address").fill(owner.username);
  await page.getByRole("button", { name: "Create my globe" }).click();
  await expect(page).toHaveURL(/studio/);
  await expect(
    page.getByRole("heading", { name: "Jamie's globe" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add place", exact: true }).click();
  const add = page.getByRole("dialog");
  await add.getByLabel("City or town").fill("Paris");
  await add.getByRole("button", { name: "Enter a place manually" }).click();
  await add.getByLabel("Country or territory").selectOption("FR");
  await add.getByLabel("Latitude").fill("48.8566");
  await add.getByLabel("Longitude").fill("2.3522");
  await add.getByRole("button", { name: "Add place", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".collection-stats")).toHaveText(
    "1 place in 1 country",
  );
  await page.getByRole("button", { name: /Paris France/ }).click();
  await expect(
    page.getByRole("heading", { name: "Paris", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const visit = page.getByRole("dialog").last();
  await visit.getByLabel(/Visit date/).fill("2024-06-01");
  await visit.getByRole("button", { name: "Add visit", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "2024-06-01 0 photographs" }),
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
  await page
    .getByRole("button", { name: "Add photographs", exact: true })
    .click();
  let uploadRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/uploads") uploadRequests++;
  });
  await page.getByLabel("Choose photographs").setInputFiles({
    name: "too-large.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(20_000_001),
  });
  await expect(page.getByRole("alert")).toContainText("20 MB");
  await page
    .getByRole("button", { name: "Upload photographs", exact: true })
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
  await page
    .getByRole("button", { name: "Add photographs", exact: true })
    .click();
  const buffer = readFileSync("tests/fixtures/tiny.png");
  await page.getByLabel("Choose photographs").setInputFiles(
    ["retry.png", "cancel.png", "keep.png"].map((name) => ({
      name,
      mimeType: "image/png",
      buffer,
    })),
  );
  await page
    .getByRole("button", { name: "Upload photographs", exact: true })
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
  await page.getByRole("button", { name: "Next photograph" }).click();
  await expect(page.getByLabel("A little context")).toHaveValue("Second visit");
  await page.getByRole("button", { name: "Previous photograph" }).focus();
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
  await page.getByRole("button", { name: "Previous photograph" }).click();
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
  await page.getByRole("button", { name: "Profile settings" }).click();
  await page
    .getByLabel(`Type ${owner.username} to confirm`)
    .fill(owner.username);
  await page
    .getByRole("button", { name: "Delete account permanently" })
    .click();
  await expect(page).toHaveURL(TEST_ORIGIN + "/");
  expect(await db.user.findUnique({ where: { id: owner.id } })).toBeNull();
  expect(await db.session.count({ where: { userId: owner.id } })).toBe(0);
  await page.goto("/studio");
  await expect(page).toHaveURL(/sign-in/);
  expect(browserErrors).toEqual([]);
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
