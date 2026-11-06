import { config } from "dotenv";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { getDb } from "../src/lib/db";
import {
  createGlobe,
  addPlace,
  reserveUpload,
  finishUpload,
  readGallery,
  setPublication,
  deleteAccount,
  deletePhoto,
} from "../src/lib/domain";
import { objectSize } from "../src/lib/storage";
import { signMediaGrant } from "../src/lib/upload-grant";

config({ path: ".env.local", quiet: true });
if (!process.argv.includes("--confirm"))
  throw new Error(
    "This test writes disposable fixtures to the configured Cloudflare bucket. Pass --confirm.",
  );
if (new URL(process.env.DATABASE_URL!).hostname !== "127.0.0.1")
  throw new Error("Use a local metadata database for this smoke test.");
const userId = `cloud-smoke-${randomUUID()}`;
const reports: string[] = [];
const origin = new URL(process.env.APP_ORIGIN!).origin;
const db = getDb();
const skipHeic = process.argv.includes("--skip-heic");
const expectedPhotos = skipHeic ? 1 : 2;
let completed = false;

async function uploadFixture(visitId: string, path: string) {
  const bytes = readFileSync(path);
  const intent = await reserveUpload(userId, { visitId, size: bytes.length });
  const response = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { Origin: origin, "Content-Type": "application/octet-stream" },
    body: bytes,
  });
  assert.equal(response.status, 201, await response.text());
  const replay = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { Origin: origin },
    body: bytes,
  });
  assert.equal(replay.status, 409);
  await finishUpload(userId, intent.uploadId);
  await finishUpload(userId, intent.uploadId);
  reports.push(
    `${path.endsWith("heic") ? "HEIC" : "PNG"}: upload, replay rejection, processing and idempotent completion passed.`,
  );
  return intent;
}

try {
  await db.user.create({
    data: {
      id: userId,
      name: "Disposable cloud smoke test",
      email: `${randomUUID()}@example.test`,
      emailVerified: true,
    },
  });
  await createGlobe(userId, {
    username: `smoke-${randomUUID().slice(0, 12)}`,
    displayName: "Disposable cloud smoke test",
  });
  const place = await addPlace(userId, {
    name: "Paris",
    country: "FR",
    latitude: 48.8566,
    longitude: 2.3522,
  });
  await uploadFixture(place.visitId, "tests/fixtures/tiny.png");
  if (!skipHeic)
    await uploadFixture(place.visitId, "tests/fixtures/static.heic");
  else
    reports.push(
      "HEIC NOT VERIFIED: explicitly skipped; remains a beta release gate.",
    );

  const gallery = await readGallery(place.placeId, userId);
  assert.equal(gallery.photos.length, expectedPhotos);
  for (const photo of gallery.photos) {
    const response = await fetch(photo.displayUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(response.headers.get("content-type"), "image/webp");
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
    assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WEBP");
    const view = new DataView(bytes.buffer);
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = new TextDecoder().decode(bytes.slice(offset, offset + 4));
      assert.notEqual(type, "EXIF");
      assert.notEqual(type, "XMP ");
      const size = view.getUint32(offset + 4, true);
      offset += 8 + size + (size % 2);
    }
  }
  reports.push(
    "Display variants are private, delivered as WebP with no-store headers and no EXIF/XMP chunks.",
  );

  const tiny = readFileSync("tests/fixtures/tiny.png");
  const mismatch = await reserveUpload(userId, {
    visitId: place.visitId,
    size: tiny.length + 1,
  });
  const tooShort = await fetch(mismatch.uploadUrl, {
    method: "PUT",
    headers: { Origin: origin },
    body: tiny,
  });
  assert.equal(tooShort.status, 413);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(tiny);
      controller.close();
    },
  });
  const streaming = await fetch(mismatch.uploadUrl, {
    method: "PUT",
    headers: { Origin: origin },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  assert.ok(
    [413, 422].includes(streaming.status),
    `Unexpected streaming rejection: ${streaming.status}`,
  );
  const source = await db.uploadIntent.findUniqueOrThrow({
    where: { id: mismatch.uploadId },
  });
  assert.equal(await objectSize(source.sourceKey), 0);
  await deletePhoto(userId, mismatch.photoId);
  reports.push(
    "Wrong content-length and short chunked bodies are rejected without a stored source.",
  );

  await setPublication(userId, true);
  assert.equal(
    (await readGallery(place.placeId)).photos.length,
    expectedPhotos,
  );
  await setPublication(userId, false);
  await assert.rejects(readGallery(place.placeId));
  assert.equal((await fetch(gallery.photos[0].displayUrl)).status, 200);
  const readyPhoto = await db.photo.findFirstOrThrow({
    where: { visit: { placeId: place.placeId }, status: "READY" },
  });
  const expired = new URL("/image", process.env.IMAGE_WORKER_URL!);
  expired.searchParams.set(
    "grant",
    await signMediaGrant(
      readyPhoto.displayKey,
      process.env.IMAGE_WORKER_SECRET!,
      Date.now() - 61_000,
    ),
  );
  assert.equal((await fetch(expired)).status, 403);
  reports.push(
    "Hiding denies new gallery authorization; pre-issued links work within their window and expired grants fail.",
  );
  completed = true;
} finally {
  if (await db.user.findUnique({ where: { id: userId } }))
    await deleteAccount(userId);
  await db.$disconnect();
  mkdirSync(".local/verification", { recursive: true });
  writeFileSync(
    ".local/verification/cloud-smoke.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        status: completed
          ? skipHeic
            ? "partial-heic-skipped"
            : "passed"
          : "failed",
        checks: reports,
        cleanup:
          "Durable cleanup jobs queued; quarantine lifetime is at most one day.",
      },
      null,
      2,
    ),
  );
}
for (const report of reports) console.log(report);
