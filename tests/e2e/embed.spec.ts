import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { TEST_ORIGIN, TEST_SESSION_SECRET } from "./constants";
import { readFileSync } from "node:fs";
import sharp from "sharp";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }),
});

test.afterAll(async () => {
  await db.$disconnect();
});

async function owner(context: BrowserContext, published = false) {
  const id = randomUUID();
  const username = `embed-${id.slice(0, 8)}`;
  await db.user.create({
    data: {
      id,
      name: "Jamie",
      email: `${id}@example.test`,
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
  const globe = await db.globe.create({
    data: { userId: id, username, displayName: "Jamie's globe", published },
  });
  return { id, username, globe };
}

test("configures an embed in Share and requires publication before preview or copying", async ({
  page,
  context,
}) => {
  const user = await owner(context);
  await page.goto("/studio");
  await page.getByRole("button", { name: "Share globe" }).click();
  await page.getByRole("tab", { name: "Embed", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Make your globe public first",
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy HTML" })).toBeDisabled();
  await page.getByRole("button", { name: "Publish my globe" }).click();
  const preview = page.frameLocator('iframe[title="Your globe embed preview"]');
  await expect(preview.getByRole("main")).toHaveAttribute(
    "aria-label",
    "Jamie's globe travel globe",
  );
  await expect(page.getByRole("textbox", { name: "Embed HTML" })).toHaveValue(
    new RegExp(`/embed/${user.username}\\?theme=light`),
  );
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(preview.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Square", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Embed HTML" })).toHaveValue(
    /aspect-ratio: 1 \/ 1/,
  );
  await page.getByRole("button", { name: "Mobile preview" }).click();
  await expect(page.locator(".embed-preview-site")).toHaveAttribute(
    "data-device",
    "mobile",
  );
  await expect(preview.locator("canvas").first()).toBeVisible();
  await page.screenshot({
    path: `.local/verification/embed-builder-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Share link", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Make globe private" }).click();
  await page.getByRole("tab", { name: "Embed", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Make your globe public first",
  );
});

async function placeWithPhotos(globeId: string) {
  const bytes = await sharp(readFileSync("tests/fixtures/tiny.png"))
    .webp()
    .toBuffer();
  const photos = Array.from({ length: 2 }, (_, i) => {
    const id = randomUUID();
    return {
      id,
      status: "READY" as const,
      caption: `Paris memory ${i + 1}`,
      createdAt: new Date(Date.UTC(2024, 5, 1, 0, 0, i)),
      thumbnailKey: `photos/${id}/thumbnail.webp`,
      displayKey: `photos/${id}/display.webp`,
    };
  });
  for (const photo of photos) {
    for (const key of [photo.thumbnailKey, photo.displayKey]) {
      const result = await fetch("http://127.0.0.1:8787/variant", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${TEST_SESSION_SECRET}`,
          "X-Object-Key": key,
        },
        body: bytes,
      });
      expect(result.ok).toBe(true);
    }
  }
  return db.place.create({
    data: {
      globeId,
      name: "Paris",
      sourceCountry: "FR",
      latitude: 48.85,
      longitude: 2.35,
      visits: {
        create: {
          startDate: new Date("2024-06-01"),
          photos: { create: photos },
        },
      },
    },
  });
}

test("serves a public gallery even to its owner, checks the globe and revokes reads", async ({
  context,
  request,
}) => {
  const user = await owner(context, true);
  const place = await placeWithPhotos(user.globe.id);
  const path = `/api/embed/${user.username}/places/${place.id}/gallery`;
  const response = await context.request.get(path);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const gallery = await response.json();
  expect(gallery.photos).toHaveLength(2);
  expect(JSON.stringify(gallery)).not.toMatch(
    /startDate|2024-06-01|visitId|pendingPhotos|visits|email/,
  );
  expect((await request.get(gallery.photos[0].displayUrl)).status()).toBe(200);
  expect(
    (
      await request.get(`/api/embed/someone-else/places/${place.id}/gallery`)
    ).status(),
  ).toBe(404);
  await db.globe.update({
    where: { id: user.globe.id },
    data: { published: false },
  });
  expect((await context.request.get(path)).status()).toBe(404);
  await db.globe.update({
    where: { id: user.globe.id },
    data: { published: true },
  });
  expect((await request.get(path)).status()).toBe(200);
  await db.globe.delete({ where: { id: user.globe.id } });
  expect((await request.get(path)).status()).toBe(404);
});

test("copied HTML embeds on a second site without cookies or storage and preserves gallery interaction", async ({
  page,
  context,
  browser,
}, testInfo) => {
  // Includes cold compilation, owner UI, a second site, media and publication reloads.
  test.setTimeout(75_000);
  const user = await owner(context, true);
  await placeWithPhotos(user.globe.id);
  await page.goto("/studio");
  await page.getByRole("button", { name: "Share globe" }).click();
  await page.getByRole("tab", { name: "Embed", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  // Exercise the copy action itself, not just the code generator.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copiedEmbed: string }).copiedEmbed = value;
        },
      },
    });
  });
  await page.getByRole("button", { name: "Copy HTML" }).click();
  await expect(page.getByRole("status")).toContainText("Copied to clipboard");
  const html = await page.evaluate(
    () => (window as unknown as { copiedEmbed: string }).copiedEmbed,
  );
  expect(html).toContain("aspect-ratio: 16 / 10");
  const visitor = await browser.newContext({
    viewport:
      testInfo.project.name === "mobile"
        ? { width: 390, height: 844 }
        : { width: 1100, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    await visitor.addInitScript(() => {
      const state = window as unknown as { globeDraws: number };
      state.globeDraws = 0;
      const draw = WebGL2RenderingContext.prototype.drawElements;
      WebGL2RenderingContext.prototype.drawElements = function (...args) {
        state.globeDraws++;
        return draw.apply(this, args);
      };
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
    });
    const host = await visitor.newPage();
    const errors: string[] = [];
    host.on("pageerror", (error) => errors.push(error.message));
    const galleryRequests: string[] = [];
    host.on("request", (req) => {
      if (req.url().includes("/api/embed/")) galleryRequests.push(req.url());
    });
    await host.goto(`http://localhost:8790/?embed=${encodeURIComponent(html)}`);
    const frame = host.frameLocator("iframe");
    await expect(frame.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(frame.locator(".site-footer, .site-header")).toHaveCount(0);
    await expect(
      frame.getByRole("button", { name: "Places", exact: true }),
    ).toHaveCount(0);
    await expect(
      frame.getByRole("button", {
        name: /Pause rotation|Start rotation|Reset globe view/,
      }),
    ).toHaveCount(0);
    const marker = frame.getByRole("button", { name: "Open Paris gallery" });
    await expect(marker).toBeVisible();
    expect(galleryRequests).toHaveLength(0);
    const image = marker.locator("img");
    await expect(image).toBeVisible();
    const pin = marker.locator(".marker-core");
    const canvas = frame.locator(".globe-stage canvas").first();
    await expect
      .poll(async () => {
        const p = await pin.boundingBox();
        const c = await canvas.boundingBox();
        return p && c
          ? Math.hypot(
              p.x + p.width / 2 - c.x - c.width / 2,
              p.y + p.height / 2 - c.y - c.height / 2,
            )
          : Infinity;
      })
      .toBeLessThan(2);
    const postcard = await marker.locator(".marker-paper").boundingBox();
    const frameBounds = await host.locator("iframe").boundingBox();
    expect(postcard!.y).toBeGreaterThanOrEqual(frameBounds!.y);
    expect(postcard!.y + postcard!.height).toBeLessThanOrEqual(
      frameBounds!.y + frameBounds!.height,
    );
    const bounds = await pin.boundingBox();
    await marker.click();
    const gallery = frame.getByRole("dialog", { name: "Paris", exact: true });
    await expect(gallery).toBeVisible();
    await expect(
      gallery.getByText("Paris memory 1", { exact: true }),
    ).toBeVisible();
    await gallery.getByRole("button", { name: "Next photo" }).click();
    await expect(
      gallery.getByText("Paris memory 2", { exact: true }),
    ).toBeVisible();
    await host.keyboard.press("ArrowLeft");
    await expect(
      gallery.getByText("Paris memory 1", { exact: true }),
    ).toBeVisible();
    if (testInfo.project.name === "mobile") {
      await gallery.locator(".gallery-image").dispatchEvent("touchstart", {
        touches: [{ identifier: 0, clientX: 200 }],
        changedTouches: [{ identifier: 0, clientX: 200 }],
      });
      await gallery.locator(".gallery-image").dispatchEvent("touchend", {
        changedTouches: [{ identifier: 0, clientX: 80 }],
      });
      await expect(
        gallery.getByText("Paris memory 2", { exact: true }),
      ).toBeVisible();
    }
    await host.keyboard.press("Escape");
    await expect(gallery).toBeHidden();
    const after = await pin.boundingBox();
    expect(after!.x).toBeCloseTo(bounds!.x, 0);
    expect(after!.y).toBeCloseTo(bounds!.y, 0);
    const popupPromise = host.waitForEvent("popup");
    await frame
      .getByRole("link", { name: "GlobeAlbum — open full globe in a new tab" })
      .click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(new RegExp(`/u/${user.username}$`));
    await popup.close();
    await host.bringToFront();
    const draws = () =>
      frame
        .locator("canvas")
        .first()
        .evaluate(
          () => (window as unknown as { globeDraws: number }).globeDraws,
        );
    await expect.poll(draws).toBeGreaterThan(0);
    await host.evaluate(() => {
      document.body.style.minHeight = "2400px";
      window.scrollTo(0, document.body.scrollHeight);
    });
    await expect
      .poll(async () => {
        const before = await draws();
        await host.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
            ),
        );
        return (await draws()) - before;
      })
      .toBe(0);
    const paused = await draws();
    await host.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(draws).toBeGreaterThan(paused);
    await host.evaluate(() => {
      document.body.style.minHeight = "";
    });
    await host.screenshot({
      path: `.local/verification/embed-host-${testInfo.project.name}.png`,
      fullPage: true,
    });
    expect(await visitor.cookies()).toEqual([]);
    expect(errors).toEqual([]);
    const iframeResponse = await visitor.request.get(
      `${TEST_ORIGIN}/embed/${user.username}?theme=dark`,
    );
    expect(iframeResponse.headers()["x-frame-options"]).toBeUndefined();
    expect(iframeResponse.headers()["content-security-policy"]).toBe(
      "frame-ancestors *",
    );
    expect(iframeResponse.headers()["cache-control"]).toContain("no-store");
    for (const path of ["/", "/studio", "/sign-in", `/u/${user.username}`]) {
      const response = await context.request.get(path);
      expect(response.headers()["x-frame-options"]).toBe("DENY");
      expect(response.headers()["content-security-policy"]).toBe(
        "frame-ancestors 'none'",
      );
    }
    await db.globe.update({
      where: { id: user.globe.id },
      data: { published: false },
    });
    await host.reload();
    await expect(
      frame.getByRole("heading", { name: "This globe is not available." }),
    ).toBeVisible();
    await expect(frame.locator(".site-footer, .site-header")).toHaveCount(0);
    await db.globe.update({
      where: { id: user.globe.id },
      data: { published: true },
    });
    await host.reload();
    await expect(marker).toBeVisible();
  } finally {
    await visitor.close();
  }
});

test("offers the complete place list without WebGL, handles empty globes and invalid themes", async ({
  page,
  context,
}) => {
  const user = await owner(context, true);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      kind: string,
      ...args: unknown[]
    ) {
      if (kind === "webgl2") return null;
      return original.apply(this, [kind, ...args] as never);
    } as typeof original;
  });
  await page.goto(`/embed/${user.username}?theme=invalid`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByText("No places here yet.")).toBeVisible();
  await placeWithPhotos(user.globe.id);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Visited places" })
    .getByRole("button", { name: /Paris/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Paris", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/embed/missing-profile");
  await expect(
    page.getByRole("heading", { name: "This globe is not available." }),
  ).toBeVisible();
  await expect(page.locator(".site-footer, .site-header")).toHaveCount(0);
  for (const path of ["/u/missing-profile", "/missing-route"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: /This globe/ }),
    ).toBeVisible();
    await expect(page.locator(".site-footer")).toHaveCount(1);
    await expect(page.locator(".site-header")).toHaveCount(1);
  }
});

test("falls back to selectable HTML and releases preview across tab changes and reopening", async ({
  page,
  context,
}) => {
  await owner(context, true);
  await page.goto("/studio");
  await page.getByRole("button", { name: "Share globe" }).click();
  await page.getByRole("tab", { name: "Share link", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Embed", exact: true }),
  ).toBeFocused();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard unavailable");
        },
      },
    });
  });
  await page.getByRole("button", { name: "Copy HTML" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Select and copy the HTML code below instead.",
  );
  const code = page.getByRole("textbox", { name: "Embed HTML" });
  await expect(code).toBeFocused();
  expect(
    await code.evaluate(
      (element: HTMLTextAreaElement) =>
        element.selectionEnd - element.selectionStart,
    ),
  ).toBe((await code.inputValue()).length);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Share globe" }).click();
  await page.getByRole("tab", { name: "Embed", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
});

test("renews an expired photo through the public gallery without exposing owner fields", async ({
  page,
  context,
}) => {
  const user = await owner(context, true);
  await placeWithPhotos(user.globe.id);
  let reads = 0;
  await page.route(
    `**/api/embed/${user.username}/places/*/gallery`,
    async (route) => {
      const response = await route.fetch();
      const gallery = await response.json();
      expect(gallery).not.toHaveProperty("visits");
      if (++reads === 1)
        gallery.photos[0].displayUrl =
          "http://127.0.0.1:8787/image?grant=expired";
      await route.fulfill({ response, json: gallery });
    },
  );
  await page.goto(`/embed/${user.username}`);
  const place = page
    .getByRole("navigation", { name: "Visited places" })
    .getByRole("button", { name: /Paris/ });
  await place.focus();
  await place.click();
  const photo = page
    .getByRole("dialog", { name: "Paris", exact: true })
    .getByRole("img", { name: "Paris memory 1", exact: true });
  await expect.poll(() => reads).toBe(2);
  await expect
    .poll(() =>
      photo.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
});

test("keeps a clean embedded globe rotating without visible navigation", async ({
  page,
  context,
}, testInfo) => {
  const user = await owner(context, true);
  await placeWithPhotos(user.globe.id);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto(`/embed/${user.username}`);
  const marker = page.getByRole("button", { name: "Open Paris gallery" });
  await expect(marker).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Places", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /Pause rotation|Start rotation|Reset globe view/,
    }),
  ).toHaveCount(0);
  const link = page.getByRole("link", {
    name: "GlobeAlbum — open full globe in a new tab",
  });
  await expect(link).toBeVisible();
  const bounds = await link.boundingBox();
  expect(bounds!.y).toBeGreaterThan(540);
  const pin = marker.locator(".marker-core");
  const before = await pin.boundingBox();
  await expect
    .poll(async () => {
      const after = await pin.boundingBox();
      return after && before ? Math.abs(after.x - before.x) : 0;
    })
    .toBeGreaterThan(3);
  await page.screenshot({
    path: `.local/verification/embed-clean-${testInfo.project.name}.png`,
  });
});
