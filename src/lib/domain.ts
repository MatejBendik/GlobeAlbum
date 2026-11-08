import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "./db";
import { AppError } from "./errors";
import { LIMITS, utcMonth } from "./limits";
import {
  profileSchema,
  placeSchema,
  visitSchema,
  uploadSchema,
  captionSchema,
  countrySchema,
  displayNameSchema,
  globeStyleSchema,
} from "./validation";
import {
  globeAvatarUrl,
  photoUrl,
  storageConfigured,
  workerUrl,
  objectSize,
  writePhotoVariant,
} from "./storage";
import { signUploadGrant } from "./upload-grant";
import { createAvatarVariant, processStoredPhoto } from "./photo-processing";
import type { GlobeDto, GalleryDto } from "./types";

export type Transaction = Prisma.TransactionClient;
export async function locked<T>(
  operation: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return getDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(71934512)`;
      return operation(tx);
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}
// Only call with an identity obtained from the managed Auth SDK.
export async function syncIdentity(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}) {
  return locked(async (tx) => {
    if (await tx.deletedIdentity.findUnique({ where: { userId: user.id } }))
      return null;
    const data = {
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    };
    return tx.user.upsert({
      where: { id: user.id },
      create: { id: user.id, ...data },
      update: data,
    });
  });
}
function dates(startDate: string, endDate: string) {
  return {
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  };
}
async function ownerGlobe(tx: Transaction, userId: string) {
  const globe = await tx.globe.findUnique({ where: { userId } });
  if (!globe) throw new AppError("Create your globe first.", 404, "NOT_FOUND");
  return globe;
}
async function ownerPlace(tx: Transaction, userId: string, id: string) {
  const place = await tx.place.findFirst({ where: { id, globe: { userId } } });
  if (!place) throw new AppError("Place not found.", 404, "NOT_FOUND");
  return place;
}
async function rateLimit(
  tx: Transaction,
  userId: string,
  kind: string,
  maximum: number,
) {
  const hour = new Date().toISOString().slice(0, 13);
  const row = await tx.requestWindow.upsert({
    where: { id: `${kind}:${userId}:${hour}` },
    create: {
      id: `${kind}:${userId}:${hour}`,
      expiresAt: new Date(Date.now() + 7_200_000),
    },
    update: { count: { increment: 1 } },
  });
  if (row.count > maximum)
    throw new AppError(
      "Too many requests. Please try again later.",
      429,
      "RATE_LIMIT",
    );
}

async function reserveStorage(tx: Transaction, bytes: number) {
  const usage = await tx.usage.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {},
  });
  if (usage.accountedBytes + BigInt(bytes) > BigInt(LIMITS.storageBytes))
    throw new AppError(
      "The beta storage allowance is full. New uploads are paused.",
      409,
      "QUOTA",
    );
  await tx.usage.update({
    where: { id: "global" },
    data: { accountedBytes: { increment: bytes } },
  });
}

async function reserveProcessing(
  tx: Transaction,
  month: string,
  count: number,
) {
  const processing = await tx.monthlyUsage.upsert({
    where: { id: month },
    create: { id: month },
    update: {},
  });
  if (processing.transformations + count > LIMITS.monthlyTransformations)
    throw new AppError(
      "The monthly processing allowance is full. New uploads are paused.",
      409,
      "QUOTA",
    );
  await tx.monthlyUsage.update({
    where: { id: month },
    data: { transformations: { increment: count } },
  });
}

async function enqueueAvatar(
  tx: Transaction,
  globe: { avatarKey: string | null; avatarBytes: number },
) {
  if (globe.avatarKey)
    await tx.cleanupJob.create({
      data: {
        keys: [globe.avatarKey],
        releaseBytes: BigInt(globe.avatarBytes),
      },
    });
}

export async function changeGlobeAvatar(
  userId: string,
  photo: Uint8Array | (() => Promise<Uint8Array>),
) {
  workerUrl();
  await locked(async (tx) => {
    await ownerGlobe(tx, userId);
    await rateLimit(tx, userId, "avatar", 10);
    await reserveProcessing(tx, utcMonth(), 1);
  });
  const avatar = await createAvatarVariant(
    typeof photo === "function" ? await photo() : photo,
  );
  const key = `avatars/${randomUUID()}.webp`;
  const pending = await locked(async (tx) => {
    await ownerGlobe(tx, userId);
    await reserveStorage(tx, avatar.length);
    // Record cleanup before the Worker write so a crash leaves recoverable work.
    return tx.cleanupJob.create({
      data: {
        keys: [key],
        releaseBytes: BigInt(avatar.length),
        notBefore: new Date(Date.now() + LIMITS.processingLeaseMs),
      },
    });
  });
  await writePhotoVariant(key, avatar);
  await locked(async (tx) => {
    const globe = await ownerGlobe(tx, userId);
    if (pending.notBefore.getTime() <= Date.now())
      throw new AppError("This upload expired. Choose the photo again.", 409);
    await enqueueAvatar(tx, globe);
    await tx.globe.update({
      where: { id: globe.id },
      data: { avatarKey: key, avatarBytes: avatar.length },
    });
    await tx.cleanupJob.delete({ where: { id: pending.id } });
  });
}

export async function removeGlobeAvatar(userId: string) {
  await locked(async (tx) => {
    const globe = await ownerGlobe(tx, userId);
    if (!globe.avatarKey) return;
    await enqueueAvatar(tx, globe);
    await tx.globe.update({
      where: { id: globe.id },
      data: { avatarKey: null, avatarBytes: 0 },
    });
  });
}

export async function createGlobe(userId: string, input: unknown) {
  const value = profileSchema.parse(input);
  return locked(async (tx) => {
    const existing = await tx.globe.findUnique({ where: { userId } });
    if (existing) return existing;
    if (
      (await tx.globe.findUnique({ where: { username: value.username } })) ||
      (await tx.retiredUsername.findUnique({
        where: { username: value.username },
      }))
    )
      throw new AppError("This profile address is already taken.", 409);
    return tx.globe.create({ data: { userId, ...value } });
  });
}
export async function addPlace(userId: string, input: unknown) {
  const value = placeSchema.parse(input);
  return locked(async (tx) => {
    const globe = await ownerGlobe(tx, userId);
    await rateLimit(tx, userId, "edit", 120);
    if (
      (await tx.visit.count({ where: { place: { globeId: globe.id } } })) >=
      LIMITS.visits
    )
      throw new AppError(
        "Your globe has reached its 300-visit limit.",
        409,
        "QUOTA",
      );
    let place = value.providerId
      ? await tx.place.findUnique({
          where: {
            globeId_providerId: {
              globeId: globe.id,
              providerId: value.providerId,
            },
          },
        })
      : null;
    if (!place)
      place = await tx.place.findFirst({
        where: {
          globeId: globe.id,
          name: { equals: value.name, mode: "insensitive" },
          sourceCountry: value.country,
          latitude: {
            gte: value.latitude - 0.005,
            lte: value.latitude + 0.005,
          },
          longitude: {
            gte: value.longitude - 0.005,
            lte: value.longitude + 0.005,
          },
        },
      });
    if (!place) {
      if (
        (await tx.place.count({ where: { globeId: globe.id } })) >=
        LIMITS.places
      )
        throw new AppError(
          "Your globe has reached its 100-place limit.",
          409,
          "QUOTA",
        );
      place = await tx.place.create({
        data: {
          globeId: globe.id,
          name: value.name,
          sourceCountry: value.country,
          latitude: value.latitude,
          longitude: value.longitude,
          providerId: value.providerId,
        },
      });
    }
    const visit = await tx.visit.create({
      data: { placeId: place.id, ...dates(value.startDate, value.endDate) },
    });
    return { placeId: place.id, visitId: visit.id };
  });
}
export async function addVisit(userId: string, input: unknown) {
  const value = visitSchema.parse(input);
  return locked(async (tx) => {
    const place = await ownerPlace(tx, userId, value.placeId);
    if (
      (await tx.visit.count({
        where: { place: { globeId: place.globeId } },
      })) >= LIMITS.visits
    )
      throw new AppError(
        "Your globe has reached its 300-visit limit.",
        409,
        "QUOTA",
      );
    return tx.visit.create({
      data: { placeId: place.id, ...dates(value.startDate, value.endDate) },
    });
  });
}
export async function editVisit(userId: string, id: string, input: unknown) {
  const value = visitSchema.parse(input);
  return locked(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: { id, place: { globe: { userId } } },
    });
    if (!visit) throw new AppError("Visit not found.", 404);
    return tx.visit.update({
      where: { id },
      data: dates(value.startDate, value.endDate),
    });
  });
}
export async function setPublication(userId: string, published: boolean) {
  return locked(async (tx) => {
    const globe = await ownerGlobe(tx, userId);
    return tx.globe.update({ where: { id: globe.id }, data: { published } });
  });
}
export async function setGlobeStyle(userId: string, value: unknown) {
  const style = globeStyleSchema.parse(value);
  return locked(async (tx) => {
    const globe = await ownerGlobe(tx, userId);
    return tx.globe.update({
      where: { id: globe.id },
      data: { style },
      select: { username: true },
    });
  });
}
export async function renameGlobe(userId: string, name: unknown) {
  const displayName = displayNameSchema.parse(name);
  return locked(async (tx) => {
    const globe = await ownerGlobe(tx, userId);
    return tx.globe.update({ where: { id: globe.id }, data: { displayName } });
  });
}
export async function correctCountry(
  userId: string,
  id: string,
  value: unknown,
) {
  const country = countrySchema.parse(value);
  return locked(async (tx) => {
    const place = await ownerPlace(tx, userId, id);
    return tx.place.update({
      where: { id },
      data: {
        countryOverride: country === place.sourceCountry ? null : country,
      },
    });
  });
}
export async function editCaption(
  userId: string,
  photoId: string,
  input: unknown,
) {
  const caption = captionSchema.parse(input);
  return locked(async (tx) => {
    const photo = await tx.photo.findFirst({
      where: {
        id: photoId,
        status: "READY",
        visit: { place: { globe: { userId } } },
      },
    });
    if (!photo) throw new AppError("Photo not found.", 404);
    return tx.photo.update({ where: { id: photoId }, data: { caption } });
  });
}
export async function selectCover(
  userId: string,
  placeId: string,
  photoId: string,
) {
  return locked(async (tx) => {
    await ownerPlace(tx, userId, placeId);
    if (
      !(await tx.photo.findFirst({
        where: { id: photoId, status: "READY", visit: { placeId } },
      }))
    )
      throw new AppError("Choose a ready photo from this place.", 404);
    return tx.place.update({
      where: { id: placeId },
      data: { coverPhotoId: photoId },
    });
  });
}

export async function readGlobe(
  options: { userId: string } | { username: string },
): Promise<GlobeDto | null> {
  const where =
    "userId" in options
      ? { userId: options.userId }
      : { username: options.username, published: true };
  const globe = await getDb().globe.findFirst({
    where,
    include: {
      places: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          visits: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              photos: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: { id: true, status: true, thumbnailKey: true },
              },
            },
          },
        },
      },
    },
  });
  if (!globe) return null;
  const places = await Promise.all(
    globe.places.map(async (place) => {
      const photos = place.visits
        .flatMap((visit) => visit.photos)
        .filter((photo) => photo.status === "READY");
      const cover =
        photos.find((photo) => photo.id === place.coverPhotoId) ?? photos[0];
      return {
        id: place.id,
        name: place.name,
        country: place.countryOverride ?? place.sourceCountry,
        latitude: place.latitude,
        longitude: place.longitude,
        visitCount: place.visits.length,
        photoCount: photos.length,
        coverPhotoId: cover?.id ?? null,
        coverUrl:
          cover && storageConfigured()
            ? await photoUrl(cover.thumbnailKey)
            : null,
      };
    }),
  );
  return {
    username: globe.username,
    displayName: globe.displayName,
    avatarUrl: globeAvatarUrl(globe),
    published: globe.published,
    style: globe.style,
    places,
    countryCount: new Set(places.map((p) => p.country)).size,
    photoCount: places.reduce((n, p) => n + p.photoCount, 0),
    visitCount: places.reduce((n, p) => n + p.visitCount, 0),
    ...("userId" in options
      ? {
          photoSlotsUsed: globe.places
            .flatMap((p) => p.visits.flatMap((v) => v.photos))
            .filter((p) => p.status !== "FAILED").length,
        }
      : {}),
  };
}
export async function readGallery(
  placeId: string,
  userId?: string,
): Promise<GalleryDto> {
  const place = await getDb().place.findFirst({
    where: {
      id: placeId,
      OR: [
        { globe: { published: true } },
        ...(userId ? [{ globe: { userId } }] : []),
      ],
    },
    include: {
      globe: { select: { userId: true } },
      visits: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          photos: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });
  if (!place) throw new AppError("Place not found.", 404, "NOT_FOUND");
  const owner = place.globe.userId === userId;
  const photos = await Promise.all(
    place.visits
      .flatMap((visit) => visit.photos)
      .filter((photo) => photo.status === "READY")
      .map(async (photo) => ({
        id: photo.id,
        caption: photo.caption,
        thumbnailUrl: await photoUrl(photo.thumbnailKey),
        displayUrl: await photoUrl(photo.displayKey),
        ...(owner ? { visitId: photo.visitId } : {}),
      })),
  );
  return {
    photos,
    ...(owner
      ? {
          pendingPhotos: place.visits
            .flatMap((visit) => visit.photos)
            .filter((photo) => photo.status !== "READY")
            .map((photo) => ({ id: photo.id, status: photo.status })),
          visits: place.visits.map((visit) => ({
            id: visit.id,
            startDate: visit.startDate?.toISOString().slice(0, 10) ?? "",
            endDate: visit.endDate?.toISOString().slice(0, 10) ?? "",
            photoCount: visit.photos.filter((photo) => photo.status === "READY")
              .length,
          })),
        }
      : {}),
  };
}

export async function reserveUpload(userId: string, input: unknown) {
  if (!storageConfigured())
    throw new AppError(
      "Photo storage is not configured yet.",
      503,
      "NOT_CONFIGURED",
    );
  const value = uploadSchema.parse(input),
    now = new Date(),
    month = utcMonth(now);
  const upload = await locked(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: { id: value.visitId, place: { globe: { userId } } },
    });
    if (!visit) throw new AppError("Visit not found.", 404);
    await rateLimit(tx, userId, "upload", 60);
    if (
      (await tx.photo.count({
        where: {
          status: { not: "FAILED" },
          visit: { place: { globe: { userId } } },
        },
      })) >= LIMITS.photos
    )
      throw new AppError(
        "Your globe has reached its 50-photo limit.",
        409,
        "QUOTA",
      );
    const reservedBytes = value.size + LIMITS.variantBytes;
    await reserveStorage(tx, reservedBytes);
    await reserveProcessing(tx, month, 2);
    const sourceKey = `quarantine/${randomUUID()}`,
      photoKey = randomUUID();
    const photo = await tx.photo.create({
      data: {
        visitId: visit.id,
        thumbnailKey: `photos/${photoKey}/thumbnail.webp`,
        displayKey: `photos/${photoKey}/display.webp`,
      },
    });
    return tx.uploadIntent.create({
      data: {
        photoId: photo.id,
        sourceKey,
        expectedBytes: value.size,
        reservedBytes,
        processingMonth: month,
        expiresAt: new Date(now.getTime() + LIMITS.uploadLifetimeMs),
      },
    });
  });
  const grant = await signUploadGrant(
    {
      key: upload.sourceKey,
      bytes: upload.expectedBytes,
      exp: Math.floor(upload.createdAt.getTime() / 1000) + LIMITS.uploadSeconds,
    },
    process.env.IMAGE_WORKER_SECRET!,
  );
  const url = new URL("/upload", workerUrl());
  url.searchParams.set("grant", grant);
  return {
    uploadId: upload.id,
    photoId: upload.photoId,
    uploadUrl: url.toString(),
  };
}

export async function finishUpload(userId: string, id: string) {
  const claim = await locked(async (tx) => {
    const upload = await tx.uploadIntent.findFirst({
      where: { id, photo: { visit: { place: { globe: { userId } } } } },
      include: { photo: true },
    });
    if (!upload) throw new AppError("Upload not found.", 404);
    if (upload.photo.status === "READY")
      return { ready: true as const, upload };
    if (upload.expiresAt.getTime() < Date.now())
      throw new AppError(
        "This upload expired. Remove it and choose the file again.",
        410,
      );
    if (upload.leaseExpiresAt && upload.leaseExpiresAt.getTime() > Date.now())
      throw new AppError(
        "This photo is already being processed. Try again shortly.",
        409,
      );
    const month = utcMonth();
    if (upload.processingMonth !== month) {
      const usage = await tx.monthlyUsage.upsert({
        where: { id: month },
        create: { id: month },
        update: {},
      });
      if (usage.transformations + 2 > LIMITS.monthlyTransformations)
        throw new AppError(
          "Monthly processing allowance reached.",
          409,
          "QUOTA",
        );
      await tx.monthlyUsage.update({
        where: { id: month },
        data: { transformations: { increment: 2 } },
      });
    }
    const leaseToken = randomUUID();
    await tx.uploadIntent.update({
      where: { id },
      data: {
        leaseToken,
        leaseExpiresAt: new Date(Date.now() + LIMITS.processingLeaseMs),
        processingMonth: month,
      },
    });
    await tx.photo.update({
      where: { id: upload.photoId },
      data: { status: "PROCESSING" },
    });
    return { ready: false as const, upload, leaseToken };
  });
  if (claim.ready) return { photoId: claim.upload.photoId };
  const { upload, leaseToken } = claim;
  try {
    await processStoredPhoto({
      sourceKey: upload.sourceKey,
      expectedBytes: upload.expectedBytes,
      thumbnailKey: upload.photo.thumbnailKey,
      displayKey: upload.photo.displayKey,
    });
    const [thumbnailBytes, displayBytes] = await Promise.all([
      objectSize(upload.photo.thumbnailKey),
      objectSize(upload.photo.displayKey),
    ]);
    const totalBytes = thumbnailBytes + displayBytes;
    if (!thumbnailBytes || !displayBytes || totalBytes > LIMITS.variantBytes)
      throw new AppError("Processed photo exceeds the size allowance.", 422);
    await locked(async (tx) => {
      const current = await tx.uploadIntent.findFirst({
        where: { id, leaseToken, photo: { status: "PROCESSING" } },
      });
      if (!current)
        throw new AppError("This upload was removed or superseded.", 409);
      // Account for variants now; keep the source reservation until physical cleanup.
      await tx.usage.update({
        where: { id: "global" },
        data: {
          accountedBytes: {
            decrement:
              current.reservedBytes - upload.expectedBytes - totalBytes,
          },
        },
      });
      await tx.uploadIntent.update({
        where: { id },
        data: {
          reservedBytes: upload.expectedBytes,
          retainedBytes: totalBytes,
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
      await tx.photo.update({
        where: { id: upload.photoId },
        data: { status: "READY", totalBytes },
      });
      await tx.cleanupJob.create({
        data: {
          keys: [upload.sourceKey],
          releaseBytes: BigInt(upload.expectedBytes),
          notBefore: new Date(
            Math.max(
              Date.now(),
              upload.createdAt.getTime() + (LIMITS.uploadSeconds + 30) * 1000,
            ),
          ),
        },
      });
      // Source ownership transfers to the cleanup job, so deletion cannot release it twice.
      await tx.uploadIntent.update({
        where: { id },
        data: { reservedBytes: 0 },
      });
    });
    return { photoId: upload.photoId };
  } catch (error) {
    await locked(async (tx) => {
      const current = await tx.uploadIntent.findFirst({
        where: { id, leaseToken },
      });
      if (current) {
        await tx.uploadIntent.update({
          where: { id },
          data: { leaseToken: null, leaseExpiresAt: null },
        });
        await tx.photo.update({
          where: { id: current.photoId },
          data: { status: "PENDING" },
        });
      }
    });
    throw error;
  }
}

async function enqueuePhotos(
  tx: Transaction,
  photos: Prisma.PhotoGetPayload<{ include: { upload: true } }>[],
) {
  for (const photo of photos) {
    const upload = photo.upload;
    const keys = [
      photo.thumbnailKey,
      photo.displayKey,
      ...(upload?.reservedBytes ? [upload.sourceKey] : []),
    ];
    const release =
      photo.status === "READY"
        ? photo.totalBytes + (upload?.reservedBytes ?? 0)
        : (upload?.reservedBytes ?? 0);
    const notBefore = new Date(
      Math.max(
        Date.now(),
        (upload?.leaseExpiresAt?.getTime() ?? 0) + 30_000,
        upload
          ? upload.createdAt.getTime() + (LIMITS.uploadSeconds + 30) * 1000
          : 0,
      ),
    );
    await tx.cleanupJob.create({
      data: { keys, releaseBytes: BigInt(release), notBefore },
    });
    await tx.place.updateMany({
      where: { coverPhotoId: photo.id },
      data: { coverPhotoId: null },
    });
  }
}
export async function deletePhoto(userId: string, id: string) {
  return locked(async (tx) => {
    const photo = await tx.photo.findFirst({
      where: { id, visit: { place: { globe: { userId } } } },
      include: { upload: true },
    });
    if (!photo) throw new AppError("Photo not found.", 404);
    await enqueuePhotos(tx, [photo]);
    await tx.photo.delete({ where: { id } });
  });
}
export async function deleteVisit(userId: string, id: string) {
  return locked(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: { id, place: { globe: { userId } } },
      include: { photos: { include: { upload: true } } },
    });
    if (!visit) throw new AppError("Visit not found.", 404);
    await enqueuePhotos(tx, visit.photos);
    await tx.visit.delete({ where: { id } });
    if (!(await tx.visit.count({ where: { placeId: visit.placeId } })))
      await tx.place.delete({ where: { id: visit.placeId } });
  });
}
export async function deleteAccount(userId: string) {
  return locked(async (tx) => {
    await tx.deletedIdentity.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const globe = await tx.globe.findUnique({ where: { userId } });
    const photos = await tx.photo.findMany({
      where: { visit: { place: { globe: { userId } } } },
      include: { upload: true },
    });
    await enqueuePhotos(tx, photos);
    if (globe) {
      await enqueueAvatar(tx, globe);
      await tx.retiredUsername.upsert({
        where: { username: globe.username },
        create: { username: globe.username },
        update: {},
      });
    }
    await tx.user.delete({ where: { id: userId } });
  });
}
