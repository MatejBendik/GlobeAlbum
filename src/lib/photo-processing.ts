import "server-only";
import sharp from "sharp";
import { inspectPhoto } from "./image-validation";
import { LIMITS } from "./limits";
import { AppError } from "./errors";
import { readPhotoSource, writePhotoVariant } from "./storage";

export async function createPhotoVariants(bytes: Uint8Array) {
  try {
    const format = inspectPhoto(bytes);
    const options = {
      limitInputPixels: LIMITS.maxPixels,
      failOn: "warning" as const,
    };
    let image = sharp(bytes, options);
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > LIMITS.maxPixels
    )
      throw new Error("Invalid dimensions");
    if (format === "heic") {
      // The portable Sharp build lacks an HEVC decoder. Decode locally using
      // libheif WASM; no photographs are sent to another image service.
      const { default: decode } = await import("heic-decode");
      const decoded = await decode({ buffer: bytes });
      if (
        !decoded.width ||
        !decoded.height ||
        decoded.width * decoded.height > LIMITS.maxPixels ||
        decoded.data.byteLength !== decoded.width * decoded.height * 4
      )
        throw new Error("Invalid decoded dimensions");
      image = sharp(decoded.data, {
        ...options,
        raw: {
          width: decoded.width,
          height: decoded.height,
          channels: 4,
        },
      });
    }
    const variants: Buffer[] = [];
    let total = 0;
    for (const [width, quality] of [
      [320, 76],
      [2560, 84],
    ] as const) {
      // autoOrient applies EXIF orientation; Sharp strips metadata by default.
      const { data, info } = await image
        .clone()
        .autoOrient()
        .toColourspace("srgb")
        .resize({
          width,
          height: width,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality })
        .timeout({ seconds: 30 })
        .toBuffer({ resolveWithObject: true });
      total += data.length;
      if (
        info.format !== "webp" ||
        !data.length ||
        info.width > width ||
        info.height > width ||
        total > LIMITS.variantBytes
      )
        throw new Error("Invalid output");
      variants.push(data);
    }
    return { thumbnail: variants[0], display: variants[1] };
  } catch {
    throw new AppError(
      "This photo could not be decoded, is animated or exceeds image limits.",
      422,
      "PROCESSING",
    );
  }
}

export async function processStoredPhoto(input: {
  sourceKey: string;
  expectedBytes: number;
  thumbnailKey: string;
  displayKey: string;
}) {
  const bytes = await readPhotoSource(input.sourceKey, input.expectedBytes);
  const variants = await createPhotoVariants(bytes);
  await writePhotoVariant(input.thumbnailKey, variants.thumbnail);
  await writePhotoVariant(input.displayKey, variants.display);
}
