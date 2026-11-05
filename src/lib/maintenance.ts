import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { deletePhoto, locked } from "./domain";
import { removeObject, storageConfigured } from "./storage";

export async function runMaintenance() {
  if (!storageConfigured())
    return { expired: 0, cleaned: 0, storageConfigured: false };
  const expired = await getDb().uploadIntent.findMany({
    where: {
      expiresAt: { lt: new Date() },
      photo: { status: { not: "READY" } },
      OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: new Date() } }],
    },
    include: {
      photo: {
        include: {
          visit: { include: { place: { include: { globe: true } } } },
        },
      },
    },
    take: 30,
  });
  for (const upload of expired) {
    try {
      await deletePhoto(upload.photo.visit.place.globe.userId, upload.photoId);
    } catch {
      /* A concurrent owner deletion already queued cleanup. */
    }
  }
  let cleaned = 0;
  for (let i = 0; i < 20; i++) {
    const token = randomUUID();
    const job = await locked(async (tx) => {
      const found = await tx.cleanupJob.findFirst({
        where: {
          notBefore: { lte: new Date() },
          OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
        },
        orderBy: { createdAt: "asc" },
      });
      if (!found) return null;
      return tx.cleanupJob.update({
        where: { id: found.id },
        data: { leaseToken: token, leaseUntil: new Date(Date.now() + 180_000) },
      });
    });
    if (!job) break;
    try {
      for (const key of job.keys) await removeObject(key);
      await locked(async (tx) => {
        if (
          !(await tx.cleanupJob.findFirst({
            where: { id: job.id, leaseToken: token },
          }))
        )
          return;
        const usage = await tx.usage.findUnique({ where: { id: "global" } });
        if (!usage || usage.accountedBytes < job.releaseBytes)
          throw new Error("Storage accounting requires reconciliation.");
        await tx.usage.update({
          where: { id: "global" },
          data: { accountedBytes: { decrement: job.releaseBytes } },
        });
        await tx.cleanupJob.delete({ where: { id: job.id } });
      });
      cleaned++;
    } catch {
      await getDb().cleanupJob.updateMany({
        where: { id: job.id, leaseToken: token },
        data: {
          attempts: { increment: 1 },
          lastError: "Object cleanup failed; retry scheduled.",
          leaseToken: null,
          leaseUntil: null,
          notBefore: new Date(
            Date.now() +
              Math.min(3600, 30 * 2 ** Math.min(job.attempts, 6)) * 1000,
          ),
        },
      });
    }
  }
  await getDb().requestWindow.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return { expired: expired.length, cleaned, storageConfigured: true };
}
