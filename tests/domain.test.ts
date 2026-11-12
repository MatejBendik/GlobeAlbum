import {
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { getDb } from "../src/lib/db";
import * as domain from "../src/lib/domain";
import { LIMITS, utcMonth } from "../src/lib/limits";
import { runMaintenance } from "../src/lib/maintenance";
import { completeIdentityDeletion } from "../src/lib/identity-cleanup";

config({ path: ".local/database.env", quiet: true });
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  new URL(url).hostname !== "127.0.0.1" ||
  !new URL(url).pathname.endsWith("_test")
) {
  throw new Error(
    "Integration tests require an isolated local *_test database. Run node scripts/local-db.mjs start.",
  );
}
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
// Never inherit live control-plane credentials into local integration tests.
process.env.NEON_AUTH_ADMIN_API_KEY = "";
// Only reservation/signature behavior is exercised; no requests leave the test process.
process.env.IMAGE_WORKER_URL = "http://127.0.0.1:8787";
process.env.IMAGE_WORKER_SECRET = "test-secret-at-least-32-characters-long";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeAll(async () => {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  // A minimal managed-identity contract fixture, only in the guarded local DB.
  // Application migrations never create or modify Neon's actual auth schema.
  await getDb().$executeRaw`CREATE SCHEMA IF NOT EXISTS neon_auth`;
  await getDb()
    .$executeRaw`CREATE TABLE IF NOT EXISTS neon_auth."user" (id text PRIMARY KEY)`;
});

beforeEach(async () => {
  await getDb().$executeRaw`TRUNCATE TABLE neon_auth."user"`;
  await getDb()
    .$executeRaw`TRUNCATE TABLE "User", "CleanupJob", "RetiredUsername", "DeletedIdentity", "Usage", "MonthlyUsage", "RequestWindow" CASCADE`;
  for (const id of ["alice", "bob"]) {
    await getDb().user.create({
      data: { id, name: id, email: `${id}@example.test`, emailVerified: true },
    });
    await domain.createGlobe(id, {
      username: `${id}-travels`,
      displayName: `${id}'s globe`,
    });
  }
});

it("keeps the previous avatar and accounts for a failed replacement until cleanup", async () => {
  const image = readFileSync("tests/fixtures/tiny.png");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce(new Response(null, { status: 201 })),
  );
  await domain.changeGlobeAvatar("alice", image);
  const globe = await getDb().globe.findUniqueOrThrow({
    where: { userId: "alice" },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
  );
  await expect(domain.changeGlobeAvatar("alice", image)).rejects.toMatchObject({
    status: 503,
  });
  const current = await getDb().globe.findUniqueOrThrow({
    where: { userId: "alice" },
  });
  expect(current.avatarKey).toBe(globe.avatarKey);
  const pending = await getDb().cleanupJob.findFirstOrThrow();
  expect(pending.keys[0]).toMatch(/^avatars\/.+\.webp$/);
  expect(pending.keys[0]).not.toBe(globe.avatarKey);
  expect(pending.notBefore.getTime()).toBeGreaterThan(Date.now());
  const usage = await getDb().usage.findUniqueOrThrow({
    where: { id: "global" },
  });
  expect(usage.accountedBytes).toBe(
    BigInt(globe.avatarBytes) + pending.releaseBytes,
  );
});
afterAll(async () => {
  await getDb().$disconnect();
});
const paris = {
  name: "Paris",
  country: "FR",
  latitude: 48.85,
  longitude: 2.35,
  providerId: "2988507",
};

describe("owned travel collections", () => {
  it("enforces the place cap across concurrent mutations", async () => {
    const globe = await getDb().globe.findUniqueOrThrow({
      where: { userId: "alice" },
    });
    const places = Array.from({ length: 99 }, (_, i) => ({
      id: `seed-${i}`,
      globeId: globe.id,
      name: `City ${i}`,
      sourceCountry: "FR",
      latitude: 0,
      longitude: i / 10,
    }));
    await getDb().place.createMany({ data: places });
    await getDb().visit.createMany({
      data: places.map((place) => ({ placeId: place.id })),
    });
    const result = await Promise.allSettled([
      domain.addPlace("alice", paris),
      domain.addPlace("alice", {
        ...paris,
        name: "Lyon",
        providerId: "2996944",
        latitude: 45.76,
        longitude: 4.83,
      }),
    ]);
    expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(await getDb().place.count({ where: { globeId: globe.id } })).toBe(
      100,
    );
  });

  it("enforces the visit cap across concurrent mutations", async () => {
    const place = await domain.addPlace("alice", paris);
    await getDb().visit.createMany({
      data: Array.from({ length: 298 }, () => ({ placeId: place.placeId })),
    });
    const result = await Promise.allSettled([
      domain.addVisit("alice", { placeId: place.placeId }),
      domain.addVisit("alice", { placeId: place.placeId }),
    ]);
    expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(
      await getDb().visit.count({ where: { placeId: place.placeId } }),
    ).toBe(300);
  });

  it("keeps one globe and an immutable unique address", async () => {
    const existing = await domain.createGlobe("alice", {
      username: "changed-name",
      displayName: "Changed",
    });
    expect(existing.username).toBe("alice-travels");
    expect(await getDb().globe.count({ where: { userId: "alice" } })).toBe(1);
  });

  it("combines repeat visits and counts countries without requiring photos", async () => {
    const first = await domain.addPlace("alice", paris);
    const second = await domain.addPlace("alice", {
      ...paris,
      startDate: "2024-06-01",
    });
    expect(second.placeId).toBe(first.placeId);
    const globe = await domain.readGlobe({ userId: "alice" });
    expect(globe).toMatchObject({
      countryCount: 1,
      visitCount: 2,
      photoCount: 0,
    });
    expect(globe?.places).toHaveLength(1);
  });

  it("keeps source country separate from a manual correction", async () => {
    const place = await domain.addPlace("alice", paris);
    await domain.correctCountry("alice", place.placeId, "HK");
    const stored = await getDb().place.findUniqueOrThrow({
      where: { id: place.placeId },
    });
    expect(stored.sourceCountry).toBe("FR");
    expect(stored.countryOverride).toBe("HK");
    expect(
      (await domain.readGlobe({ userId: "alice" }))?.places[0].country,
    ).toBe("HK");
  });

  it("denies cross-owner mutations and private gallery reads", async () => {
    const place = await domain.addPlace("alice", paris);
    await expect(
      domain.correctCountry("bob", place.placeId, "GB"),
    ).rejects.toThrow("not found");
    await expect(domain.deleteVisit("bob", place.visitId)).rejects.toThrow(
      "not found",
    );
    await expect(domain.readGallery(place.placeId, "bob")).rejects.toThrow(
      "not found",
    );
    await expect(
      domain.reserveUpload("bob", { visitId: place.visitId, size: 100 }),
    ).rejects.toThrow("not found");
  });

  it("publishes a narrow DTO and revokes new reads on hiding", async () => {
    const place = await domain.addPlace("alice", {
      ...paris,
      startDate: "2024-06-01",
    });
    expect(await domain.readGlobe({ username: "alice-travels" })).toBeNull();
    await domain.setPublication("alice", true);
    const publicGlobe = await domain.readGlobe({ username: "alice-travels" });
    expect(publicGlobe?.places).toHaveLength(1);
    expect(publicGlobe).not.toHaveProperty("photoSlotsUsed");
    expect(JSON.stringify(publicGlobe)).not.toMatch(
      /email|startDate|2024-06-01|userId/,
    );
    expect(await domain.readGallery(place.placeId)).not.toHaveProperty(
      "visits",
    );
    await domain.setPublication("alice", false);
    expect(await domain.readGlobe({ username: "alice-travels" })).toBeNull();
    await expect(domain.readGallery(place.placeId)).rejects.toThrow(
      "not found",
    );
  });

  it("embeds only the requested published globe and revokes new gallery reads on hiding", async () => {
    const place = await domain.addPlace("alice", {
      ...paris,
      startDate: "2024-06-01",
    });
    await expect(
      domain.readEmbeddedGallery("alice-travels", place.placeId),
    ).rejects.toMatchObject({ status: 404 });
    await domain.setPublication("alice", true);
    expect(
      await domain.readEmbeddedGallery("alice-travels", place.placeId),
    ).toEqual({ photos: [] });
    await domain.setPublication("bob", true);
    await expect(
      domain.readEmbeddedGallery("bob-travels", place.placeId),
    ).rejects.toMatchObject({ status: 404 });
    await domain.setPublication("alice", false);
    await expect(
      domain.readEmbeddedGallery("alice-travels", place.placeId),
    ).rejects.toMatchObject({ status: 404 });
    await domain.setPublication("alice", true);
    expect(
      await domain.readEmbeddedGallery("alice-travels", place.placeId),
    ).toEqual({ photos: [] });
    await domain.deleteVisit("alice", place.visitId);
    await expect(
      domain.readEmbeddedGallery("alice-travels", place.placeId),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("removes a place when its last visit is deleted", async () => {
    const place = await domain.addPlace("alice", paris);
    await domain.deleteVisit("alice", place.visitId);
    expect((await domain.readGlobe({ userId: "alice" }))?.places).toEqual([]);
  });
});

describe("atomic upload reservations", () => {
  it("does not resurrect a photo deleted during processing", async () => {
    const image = readFileSync("tests/fixtures/tiny.png");
    const place = await domain.addPlace("alice", paris);
    const upload = await domain.reserveUpload("alice", {
      visitId: place.visitId,
      size: image.length,
    });
    let signalStarted!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const response = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) => {
        if (url.pathname === "/source") {
          signalStarted();
          await response;
          return new Response(image);
        }
        if (url.pathname === "/variant")
          return Response.json({ stored: true }, { status: 201 });
        return Response.json({ size: 100 });
      }),
    );
    const completion = domain.finishUpload("alice", upload.uploadId);
    const rejected = expect(completion).rejects.toThrow(
      "removed or superseded",
    );
    await started;
    await domain.deletePhoto("alice", upload.photoId);
    release();
    await rejected;
    expect(await getDb().photo.count()).toBe(0);
    const cleanup = await getDb().cleanupJob.findFirstOrThrow();
    expect(cleanup.notBefore.getTime()).toBeGreaterThan(Date.now());
    expect(cleanup.keys).toHaveLength(3);
  });

  it("retains storage on cleanup failure and releases it once after a retry", async () => {
    await getDb().usage.create({
      data: { id: "global", accountedBytes: 100n },
    });
    const job = await getDb().cleanupJob.create({
      data: { keys: ["quarantine/test"], releaseBytes: 100n },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    expect((await runMaintenance()).cleaned).toBe(0);
    expect(
      (await getDb().cleanupJob.findUniqueOrThrow({ where: { id: job.id } }))
        .attempts,
    ).toBe(1);
    expect(
      (await getDb().usage.findUniqueOrThrow({ where: { id: "global" } }))
        .accountedBytes,
    ).toBe(100n);
    await getDb().cleanupJob.update({
      where: { id: job.id },
      data: { notBefore: new Date(0) },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ deleted: true })),
    );
    expect((await runMaintenance()).cleaned).toBe(1);
    expect((await runMaintenance()).cleaned).toBe(0);
    expect(
      (await getDb().usage.findUniqueOrThrow({ where: { id: "global" } }))
        .accountedBytes,
    ).toBe(0n);
  });

  it("reserves pending slots so concurrent requests cannot exceed fifty", async () => {
    const place = await domain.addPlace("alice", paris);
    const outcomes = await Promise.allSettled(
      Array.from({ length: 51 }, () =>
        domain.reserveUpload("alice", { visitId: place.visitId, size: 100 }),
      ),
    );
    expect(
      outcomes.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(50);
    expect(
      outcomes.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(await getDb().photo.count()).toBe(50);
    expect(
      (await getDb().usage.findUniqueOrThrow({ where: { id: "global" } }))
        .accountedBytes,
    ).toBe(BigInt(50 * (100 + LIMITS.variantBytes)));
  });

  it("rolls back a reservation beyond the shared storage cap", async () => {
    const place = await domain.addPlace("alice", paris);
    await getDb().usage.create({
      data: { id: "global", accountedBytes: BigInt(LIMITS.storageBytes) },
    });
    await expect(
      domain.reserveUpload("alice", { visitId: place.visitId, size: 100 }),
    ).rejects.toThrow("storage allowance");
    expect(await getDb().photo.count()).toBe(0);
  });

  it("rolls back a reservation beyond the monthly processing cap", async () => {
    const place = await domain.addPlace("alice", paris);
    await getDb().monthlyUsage.create({
      data: {
        id: utcMonth(),
        transformations: LIMITS.monthlyTransformations - 1,
      },
    });
    await expect(
      domain.reserveUpload("alice", { visitId: place.visitId, size: 100 }),
    ).rejects.toThrow("processing allowance");
    expect(await getDb().photo.count()).toBe(0);
    expect(await getDb().uploadIntent.count()).toBe(0);
  });

  it("retains durable cleanup and rejects late completion after account deletion", async () => {
    const place = await domain.addPlace("alice", paris);
    const upload = await domain.reserveUpload("alice", {
      visitId: place.visitId,
      size: 100,
    });
    await domain.deleteAccount("alice");
    expect(
      await getDb().user.findUnique({ where: { id: "alice" } }),
    ).toBeNull();
    expect(
      await domain.syncIdentity({
        id: "alice",
        name: "Alice",
        email: "alice@example.test",
        emailVerified: true,
      }),
    ).toBeNull();
    expect(
      await getDb().deletedIdentity.findUnique({ where: { userId: "alice" } }),
    ).toMatchObject({ authDeletedAt: null });
    expect(await getDb().cleanupJob.count()).toBe(1);
    expect((await getDb().cleanupJob.findFirstOrThrow()).keys).toHaveLength(3);
    await expect(domain.finishUpload("alice", upload.uploadId)).rejects.toThrow(
      "not found",
    );
    expect(
      await getDb().retiredUsername.findUnique({
        where: { username: "alice-travels" },
      }),
    ).not.toBeNull();
  });
});

describe("managed identity deletion", () => {
  function configureCleanup() {
    vi.stubEnv("NEON_AUTH_ADMIN_API_KEY", "test-project-scoped-key");
    vi.stubEnv("NEON_AUTH_PROJECT_ID", "test-project");
    vi.stubEnv("NEON_AUTH_BRANCH_ID", "test-branch");
    vi.stubEnv(
      "NEON_AUTH_BASE_URL",
      "https://test.neonauth.example/neondb/auth",
    );
  }
  const details = () =>
    Response.json({ base_url: "https://test.neonauth.example/neondb/auth" });

  it("never deletes an active account or an identity without a deletion fence", async () => {
    configureCleanup();
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    expect(await completeIdentityDeletion("alice")).toBe(false);
    await getDb().deletedIdentity.create({ data: { userId: "alice" } });
    expect(await completeIdentityDeletion("alice")).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(
      await getDb().user.findUnique({ where: { id: "alice" } }),
    ).not.toBeNull();
  });

  it("retries failed provider deletion and allows a new identity without restoring the old globe", async () => {
    configureCleanup();
    await domain.deleteAccount("alice");
    await getDb()
      .$executeRaw`INSERT INTO neon_auth."user" (id) VALUES ('alice')`;
    const request = vi
      .fn()
      .mockResolvedValueOnce(details())
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", request);
    expect(await completeIdentityDeletion("alice")).toBe(false);
    expect(
      await getDb().deletedIdentity.findUnique({ where: { userId: "alice" } }),
    ).toMatchObject({ authDeletedAt: null });
    request
      .mockResolvedValueOnce(details())
      .mockImplementationOnce(async (url, options) => {
        expect(url).toBe(
          "https://console.neon.tech/api/v2/projects/test-project/branches/test-branch/auth/users/alice",
        );
        expect(options.method).toBe("DELETE");
        await getDb()
          .$executeRaw`DELETE FROM neon_auth."user" WHERE id = 'alice'`;
        return new Response(null, { status: 204 });
      });
    expect(await completeIdentityDeletion("alice")).toBe(true);
    expect(
      (
        await getDb().deletedIdentity.findUniqueOrThrow({
          where: { userId: "alice" },
        })
      ).authDeletedAt,
    ).toBeInstanceOf(Date);
    expect(
      await domain.syncIdentity({
        id: "alice",
        name: "Alice",
        email: "alice@example.test",
        emailVerified: true,
      }),
    ).toBeNull();
    expect(
      await domain.syncIdentity({
        id: "new-google-alice",
        name: "Alice",
        email: "alice@example.test",
        emailVerified: true,
      }),
    ).toMatchObject({ id: "new-google-alice" });
    await domain.createGlobe("new-google-alice", {
      username: "alice-new-globe",
      displayName: "Alice",
    });
    const fresh = await domain.readGlobe({ userId: "new-google-alice" });
    expect(fresh?.places).toHaveLength(0);
    expect(fresh?.published).toBe(false);
  });

  it("rejects a mismatched branch before issuing any destructive request", async () => {
    configureCleanup();
    await domain.deleteAccount("alice");
    await getDb()
      .$executeRaw`INSERT INTO neon_auth."user" (id) VALUES ('alice')`;
    const request = vi
      .fn()
      .mockResolvedValue(
        Response.json({ base_url: "https://other-branch.example/auth" }),
      );
    vi.stubGlobal("fetch", request);
    expect(await completeIdentityDeletion("alice")).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    expect(
      await getDb().deletedIdentity.findUnique({ where: { userId: "alice" } }),
    ).toMatchObject({ authDeletedAt: null });
  });

  it("finishes an interrupted cleanup idempotently after the provider identity is gone", async () => {
    configureCleanup();
    await domain.deleteAccount("alice");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    expect(await completeIdentityDeletion("alice")).toBe(true);
    expect(await completeIdentityDeletion("alice")).toBe(true);
    expect(request).not.toHaveBeenCalled();
    expect(
      await domain.syncIdentity({
        id: "alice",
        name: "Alice",
        email: "alice@example.test",
        emailVerified: true,
      }),
    ).toBeNull();
  });

  it("retries identity work even when photo storage is not configured", async () => {
    configureCleanup();
    vi.stubEnv("IMAGE_WORKER_URL", "");
    await domain.deleteAccount("alice");
    const result = await runMaintenance();
    expect(result.storageConfigured).toBe(false);
    expect(result.identities).toEqual({ attempted: 1, completed: 1 });
  });
});
