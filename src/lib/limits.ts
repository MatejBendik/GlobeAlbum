export const LIMITS = {
  places: 100,
  visits: 300,
  photos: 50,
  fileBytes: 20_000_000,
  variantBytes: 4_000_000,
  avatarFileBytes: 4_000_000,
  avatarVariantBytes: 512_000,
  storageBytes: 8_000_000_000,
  monthlyTransformations: 4_000,
  imageUrlSeconds: 60,
  uploadSeconds: 300,
  uploadLifetimeMs: 60 * 60 * 1000,
  processingLeaseMs: 5 * 60 * 1000,
  maxPixels: 50_000_000,
} as const;

export function utcMonth(now = new Date()) {
  return now.toISOString().slice(0, 7);
}
