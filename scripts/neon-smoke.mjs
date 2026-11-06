import { chromium } from "@playwright/test";
import { config } from "dotenv";
import pg from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync, readFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
config({ path: ".env.local", quiet: true });
if (!process.argv.includes("--confirm"))
  throw Error(
    "This creates and deletes a disposable real Neon user and globe. Pass --confirm.",
  );
const origin = process.env.APP_ORIGIN;
if (
  !origin ||
  new URL(origin).hostname !== "127.0.0.1" ||
  !new URL(process.env.DATABASE_URL_UNPOOLED).hostname.endsWith(".neon.tech")
)
  throw Error("Use a local app server wired to Neon for this smoke test.");
const linked = JSON.parse(readFileSync(".neon", "utf8"));
if (!linked.projectId || !linked.branch)
  throw Error("Link the existing Neon project first.");
mkdirSync(".local/neon-setup", { recursive: true, mode: 0o700 });
const i = {
  email: `globealbum-${randomUUID()}@example.com`,
  password: randomBytes(24).toString("base64url"),
  name: "Neon test traveler",
};
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.route("https://tile.openstreetmap.org/**", (route) =>
  route.fulfill({
    contentType: "image/png",
    body: readFileSync("tests/fixtures/tiny.png"),
  }),
);
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
});
await db.connect();
try {
  await page.goto(`${origin}/studio`);
  if (!page.url().includes("/sign-in"))
    throw Error("Unauthenticated studio was not denied");
  console.log("PASS protected studio redirects while signed out");
  await page.goto(`${origin}/sign-up`);
  await page.getByLabel("Name", { exact: true }).fill(i.name);
  await page.getByLabel("Email", { exact: true }).fill(i.email);
  await page.getByLabel("Password", { exact: true }).fill(i.password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.waitForURL("**/onboarding", { timeout: 30000 });
  const s = await page.evaluate(async () => {
    const r = await fetch("/api/auth/get-session");
    return r.json();
  });
  if (!s?.user || s.user.email !== i.email)
    throw Error("No matching current user");
  i.id = s.user.id;
  writeFileSync(".local/neon-setup/app-test-identity.json", JSON.stringify(i), {
    mode: 0o600,
  });
  console.log("PASS real Neon email signup and same-origin current-user read");
  await page.reload();
  await page.waitForURL("**/onboarding");
  console.log("PASS managed session survives reload");
  let slug = "";
  i.slug = slug;
  await page.getByLabel("What should we call you?").fill("Neon test globe");
  await page.waitForFunction(
    () => document.querySelector('input[name="username"]')?.value,
  );
  slug = await page.getByLabel("Your globe address").inputValue();
  await page
    .getByRole("button", { name: "Create my globe", exact: true })
    .click();
  await page.waitForURL("**/studio");
  const row = await db.query(
    'select "published" from "Globe" where "userId"=$1',
    [i.id],
  );
  if (row.rows.length !== 1 || row.rows[0].published)
    throw Error("Private globe did not persist");
  console.log(
    "PASS onboarding creates a private globe in actual Neon Postgres",
  );
  await page.getByRole("button", { name: "Add place", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("City or town").fill("Paris");
  await dialog
    .getByRole("button", { name: "Choose location on a map" })
    .click();
  await dialog.getByLabel("Country or territory").selectOption("FR");
  await dialog
    .getByRole("button", { name: "Use map center", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Add place", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const places = await db.query(
    'select count(*)::int as total from "Place" p join "Globe" g on p."globeId"=g.id where g."userId"=$1',
    [i.id],
  );
  if (places.rows[0].total !== 1) throw Error("Place did not persist");
  console.log("PASS browser mutation persists place in actual Neon Postgres");
  await page.screenshot({
    path: ".local/neon-setup/verified-studio.png",
    fullPage: true,
  });
  const signedOut = await page.evaluate(async () => {
    const r = await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return r.ok;
  });
  if (!signedOut) throw Error("Sign-out failed");
  await page.goto(`${origin}/studio`);
  if (!page.url().includes("sign-in")) throw Error("Session not revoked");
  console.log("PASS sign-out denies protected studio");
  await page.getByLabel("Email", { exact: true }).fill(i.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("intentionally-wrong-password");
  await page.getByRole("button", { name: "Sign in with email" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Email or password is incorrect." })
    .waitFor();
  console.log("PASS wrong password displays invalid-credentials error");
  await page.getByLabel("Password", { exact: true }).fill(i.password);
  await page.getByRole("button", { name: "Sign in with email" }).click();
  await page.waitForURL("**/studio");
  await page.reload();
  await page.getByRole("heading", { name: "Neon test globe" }).waitFor();
  console.log("PASS email sign-in restores persisted globe after reload");
  await page.getByRole("button", { name: "Share globe", exact: true }).click();
  await page.getByRole("button", { name: "Publish my globe" }).click();
  await page.getByRole("button", { name: "Make globe private" }).waitFor();
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(`${origin}/u/${slug}`);
  await publicPage.getByRole("heading", { name: "Neon test globe" }).waitFor();
  console.log("PASS real Neon publication is visible to anonymous visitor");
  await page.getByRole("button", { name: "Make globe private" }).click();
  await page.getByRole("button", { name: "Publish my globe" }).waitFor();
  await publicPage.goto(`${origin}/u/${slug}`);
  await publicPage
    .getByRole("heading", { name: "This globe is not available." })
    .waitFor();
  if (
    await publicPage.getByRole("heading", { name: "Neon test globe" }).count()
  )
    throw Error("Private content still rendered");
  const place = await db.query(
    'SELECT p.id FROM "Place" p JOIN "Globe" g ON p."globeId"=g.id WHERE g."userId"=$1',
    [i.id],
  );
  const gallery = await visitor.request.get(
    `${origin}/api/places/${place.rows[0].id}/gallery`,
  );
  if (gallery.status() !== 404) throw Error("Private gallery readable");
  console.log("PASS hiding denies new anonymous profile and gallery reads");
  await visitor.close();
  await page.keyboard.press("Escape");
  const savedCookies = await context.cookies();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Profile settings" }).click();
  await page.getByLabel(`Type ${slug} to confirm`).fill(slug);
  await page
    .getByRole("button", { name: "Delete account permanently" })
    .click();
  await page.waitForURL(origin + "/");
  const gone = await db.query('SELECT 1 FROM "User" WHERE id=$1', [i.id]);
  const fence = await db.query(
    'SELECT 1 FROM "DeletedIdentity" WHERE "userId"=$1',
    [i.id],
  );
  if (gone.rowCount || fence.rowCount !== 1)
    throw Error("Deletion fence missing");
  console.log(
    "PASS account deletion removes application data and queues provider cleanup",
  );
  const stale = await browser.newContext();
  await stale.addCookies(
    savedCookies.map(({ name, value, httpOnly, sameSite, expires }) => ({
      name,
      value,
      httpOnly,
      sameSite,
      expires,
      secure: true,
      url: origin.replace("http:", "https:"),
    })),
  );
  const stalePage = await stale.newPage();
  await stalePage.goto(`${origin}/studio`);
  // App Router may deliver a redirect after the streamed document begins.
  await stalePage.waitForURL("**/sign-in");
  if ((await db.query('SELECT 1 FROM "User" WHERE id=$1', [i.id])).rowCount)
    throw Error("Deleted user recreated");
  await stale.close();
  console.log(
    "PASS stale managed cookies cannot recreate a deleted application account",
  );
} catch (error) {
  console.error(
    "Verification failure:",
    error.name,
    String(error.message)
      .replace(/[a-zA-Z0-9_.=-]{20,}/g, "[redacted]")
      .slice(0, 200),
  );
  if (error.message?.includes("Invalid cookie fields"))
    console.error("Browser fixture rejected secure cookie restoration.");
  console.error(
    "Neon browser verification failed. Inspect the local app logs; no credential values are printed.",
  );
  process.exitCode = 1;
} finally {
  // Only this generated identity is eligible for smoke cleanup. Never reset a remote DB.
  try {
    const found = await db.query(
      'SELECT id FROM neon_auth."user" WHERE email=$1',
      [i.email],
    );
    if (found.rows.length) {
      const userId = found.rows[0].id;
      await db.query("BEGIN");
      try {
        await db.query("SELECT pg_advisory_xact_lock(71934512)");
        await db.query(
          'INSERT INTO "DeletedIdentity" ("userId") VALUES ($1) ON CONFLICT DO NOTHING',
          [userId],
        );
        await db.query(
          'INSERT INTO "RetiredUsername" (username) SELECT username FROM "Globe" WHERE "userId"=$1 ON CONFLICT DO NOTHING',
          [userId],
        );
        await db.query('DELETE FROM "User" WHERE id=$1', [userId]);
        await db.query("COMMIT");
      } catch {
        await db.query("ROLLBACK");
        throw Error("Fixture cleanup failed");
      }
      execFileSync(
        "neon",
        [
          "neon-auth",
          "user",
          "delete",
          userId,
          "--project-id",
          linked.projectId,
          "--branch",
          linked.branch,
        ],
        { stdio: "pipe" },
      );
      if (
        (await db.query('SELECT 1 FROM neon_auth."user" WHERE id=$1', [userId]))
          .rowCount
      )
        throw Error("Provider cleanup incomplete");
      await db.query(
        'UPDATE "DeletedIdentity" SET "authDeletedAt"=NOW() WHERE "userId"=$1',
        [userId],
      );
      console.log(
        "PASS disposable identity physically removed through Neon CLI",
      );
    }
    try {
      unlinkSync(".local/neon-setup/app-test-identity.json");
    } catch {}
  } catch {
    console.error(
      "Provider cleanup remains pending; use the documented auth:cleanup command.",
    );
    process.exitCode = 1;
  }
  await db.end();
  await browser.close();
}
