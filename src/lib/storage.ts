import "server-only";
import { z } from "zod";
import { AppError } from "./errors";
import { signMediaGrant } from "./upload-grant";

export function storageConfigured() {
  return (
    !!process.env.IMAGE_WORKER_URL &&
    (process.env.IMAGE_WORKER_SECRET?.length ?? 0) >= 32
  );
}

export function workerUrl() {
  if (!storageConfigured()) {
    throw new AppError(
      "Photo storage is not configured yet.",
      503,
      "NOT_CONFIGURED",
    );
  }
  const url = new URL(process.env.IMAGE_WORKER_URL!);
  if (
    url.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["127.0.0.1", "localhost"].includes(url.hostname)
    )
  ) {
    throw new AppError("Image worker requires HTTPS.", 503, "NOT_CONFIGURED");
  }
  return url;
}

export async function photoUrl(key: string) {
  const url = new URL("/image", workerUrl());
  url.searchParams.set(
    "grant",
    await signMediaGrant(key, process.env.IMAGE_WORKER_SECRET!),
  );
  return url.toString();
}

async function objectRequest(operation: "head" | "delete", key: string) {
  const response = await fetch(new URL("/objects", workerUrl()), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.IMAGE_WORKER_SECRET!}`,
    },
    body: JSON.stringify({ operation, key }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new AppError("Photo storage is temporarily unavailable.", 503);
  return response;
}

export async function objectSize(key: string) {
  const response = await objectRequest("head", key);
  const value = z
    .object({ size: z.number().int().nonnegative() })
    .parse(await response.json());
  return value.size;
}

export async function removeObject(key: string) {
  await objectRequest("delete", key);
}
