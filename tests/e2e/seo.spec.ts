import { test, expect } from "@playwright/test";
import { TEST_ORIGIN } from "./constants";

test("serves crawl rules and a sitemap without signing in", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt", { maxRedirects: 0 });
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  const rules = await robots.text();
  expect(rules).toContain("User-Agent: *");
  expect(rules).toContain("Allow: /");
  expect(rules).toContain(`Sitemap: ${TEST_ORIGIN}/sitemap.xml`);
  // Public noindex pages must remain crawlable so Google can read that rule.
  expect(rules).not.toMatch(/^Disallow: \/(?:$|u|embed|sign-in|sign-up)/m);

  const sitemap = await request.get("/sitemap.xml", { maxRedirects: 0 });
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("application/xml");
  const xml = await sitemap.text();
  expect(xml).toContain(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  );
  expect(
    [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
  ).toEqual([`${TEST_ORIGIN}/`]);
});

test("allows indexing the landing page with its canonical URL", async ({
  page,
}) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  expect(response?.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    TEST_ORIGIN,
  );
});

test("keeps non-marketing pages excluded from indexing", async ({
  request,
}) => {
  for (const path of ["/sign-in", "/sign-up", "/demo", "/privacy", "/terms"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    expect(await response.text(), path).toContain(
      'name="robots" content="noindex, nofollow"',
    );
  }
});

test("still requires sign-in outside the exact public metadata routes", async ({
  request,
}) => {
  for (const path of [
    "/studio",
    "/settings",
    "/onboarding",
    "/robots.txt/private",
    "/sitemap.xml/private",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    expect(
      new URL(response.headers().location, TEST_ORIGIN).pathname,
      path,
    ).toBe("/sign-in");
  }
});
