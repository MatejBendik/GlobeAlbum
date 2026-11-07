import { z } from "zod";
import { COUNTRY_CODES } from "./countries";
import { LIMITS } from "./limits";
import { GLOBE_STYLES } from "./globe-style";

export const globeStyleSchema = z.enum(GLOBE_STYLES);

const country = z
  .string()
  .length(2)
  .refine(
    (value) => COUNTRY_CODES.has(value),
    "Choose a country or territory.",
  );
const date = z
  .string()
  .refine(
    (value) =>
      !value ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    "Enter a valid date.",
  );
const dates = {
  startDate: date.default(""),
  endDate: z.literal("").default(""),
};
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and single hyphens.",
    )
    .refine(
      (s) =>
        ![
          "admin",
          "api",
          "demo",
          "settings",
          "support",
          "globealbum",
          "onboarding",
          "login",
        ].includes(s),
      "This address is reserved.",
    ),
  displayName: z.string().trim().min(1).max(60),
});
export const placeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  country,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  providerId: z.string().regex(/^\d+$/).max(20).optional(),
  ...dates,
});
export const visitSchema = z.object({ placeId: z.string().min(1), ...dates });
export const uploadSchema = z.object({
  visitId: z.string().min(1),
  size: z.number().int().positive().max(LIMITS.fileBytes),
});
export const PHOTO_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif";
export const photoFileSchema = z
  .file()
  .min(1, "This file is empty.")
  .max(LIMITS.fileBytes, "Each photo must be 20 MB or smaller.")
  .refine(
    (file) =>
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) ||
      [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ].includes(file.type),
    "Choose a JPEG, PNG, WebP or HEIC photo.",
  );
export const photoUploadFormSchema = z.object({
  files: z
    .array(photoFileSchema)
    .min(1, "Choose at least one photo.")
    .max(LIMITS.photos, "Choose no more than 50 photos."),
});
export function photoUploadSchemaFor(remaining: number) {
  return photoUploadFormSchema.refine(
    (value) => value.files.length <= remaining,
    {
      path: ["files"],
      message: `You can add ${remaining} more photo${remaining === 1 ? "" : "s"}.`,
    },
  );
}
export const captionSchema = z.string().trim().max(500);
export const countrySchema = country;
export const displayNameSchema = z.string().trim().min(1).max(60);
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  return schema.parse(input);
}
