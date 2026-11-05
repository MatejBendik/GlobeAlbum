import "server-only";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "./errors";
import { LIMITS } from "./limits";

let client: S3Client | undefined;
export function storageConfigured() {
  return [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "IMAGE_WORKER_URL",
    "IMAGE_WORKER_SECRET",
  ].every((key) => !!process.env[key]);
}
function s3() {
  if (!storageConfigured())
    throw new AppError(
      "Photo storage is not configured yet.",
      503,
      "NOT_CONFIGURED",
    );
  return (client ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  }));
}
export async function photoUrl(key: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ResponseCacheControl: "private, no-store, max-age=0",
      ResponseContentType: "image/webp",
    }),
    { expiresIn: LIMITS.imageUrlSeconds },
  );
}
export async function objectSize(key: string) {
  const object = await s3().send(
    new HeadObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
  );
  return object.ContentLength ?? 0;
}
export async function removeObject(key: string) {
  await s3().send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
  );
}
export function workerUrl() {
  if (!storageConfigured())
    throw new AppError(
      "Photo storage is not configured yet.",
      503,
      "NOT_CONFIGURED",
    );
  const url = new URL(process.env.IMAGE_WORKER_URL!);
  if (
    url.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["127.0.0.1", "localhost"].includes(url.hostname)
    )
  )
    throw new AppError("Image worker requires HTTPS.", 503, "NOT_CONFIGURED");
  return url;
}
