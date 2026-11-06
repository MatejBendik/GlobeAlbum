import { describe, expect, it } from "vitest";
import {
  photoUploadSchemaFor,
  photoFileSchema,
  placeSchema,
  visitSchema,
} from "../src/lib/validation";
import { LIMITS } from "../src/lib/limits";
import {
  inspectPhoto,
  readBounded,
  byteStream,
} from "../src/lib/image-validation";
import {
  signUploadGrant,
  verifyUploadGrant,
  signMediaGrant,
  verifyMediaGrant,
} from "../src/lib/upload-grant";

describe("upload form validation", () => {
  it("rejects a file above 20 MB before an upload is created", () => {
    const file = new File(
      [new Uint8Array(LIMITS.fileBytes + 1)],
      "holiday.jpg",
      { type: "image/jpeg" },
    );
    const parsed = photoFileSchema.safeParse(file);
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues[0].message).toContain("20 MB");
  });

  it("accepts HEIC with an empty browser MIME type", () => {
    expect(
      photoFileSchema.safeParse(new File(["example"], "IMG_1000.HEIC")).success,
    ).toBe(true);
  });

  it("rejects empty files, unsupported extensions and excess selected files", () => {
    expect(photoFileSchema.safeParse(new File([], "empty.png")).success).toBe(
      false,
    );
    expect(
      photoFileSchema.safeParse(new File(["video"], "movie.mov")).success,
    ).toBe(false);
    const file = new File(["image"], "photo.jpg");
    expect(
      photoUploadSchemaFor(1).safeParse({ files: [file, file] }).success,
    ).toBe(false);
    expect(photoUploadSchemaFor(0).safeParse({ files: [file] }).success).toBe(
      false,
    );
    expect(photoUploadSchemaFor(50).safeParse({ files: [] }).success).toBe(
      false,
    );
  });
});

describe("visit and location validation", () => {
  it("allows unknown dates but rejects impossible or reversed dates", () => {
    expect(visitSchema.parse({ placeId: "paris" }).startDate).toBe("");
    expect(
      visitSchema.safeParse({ placeId: "paris", startDate: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      visitSchema.safeParse({ placeId: "paris", endDate: "2026-03-01" })
        .success,
    ).toBe(false);
    expect(
      visitSchema.safeParse({
        placeId: "paris",
        startDate: "2026-03-02",
        endDate: "2026-03-01",
      }).success,
    ).toBe(false);
  });

  it("requires real country codes and bounded coordinates", () => {
    const input = {
      name: "Paris",
      country: "FR",
      latitude: 48.85,
      longitude: 2.35,
    };
    expect(placeSchema.safeParse(input).success).toBe(true);
    expect(placeSchema.safeParse({ ...input, country: "ZZ" }).success).toBe(
      false,
    );
    expect(placeSchema.safeParse({ ...input, latitude: 91 }).success).toBe(
      false,
    );
  });
});

describe("untrusted image containers", () => {
  function box(type: string, payload = new Uint8Array()) {
    const bytes = new Uint8Array(8 + payload.length);
    new DataView(bytes.buffer).setUint32(0, bytes.length);
    bytes.set(new TextEncoder().encode(type), 4);
    bytes.set(payload, 8);
    return bytes;
  }

  function heic(extra = new Uint8Array()) {
    const brands = new TextEncoder().encode("mif1\0\0\0\0mif1heichevc");
    const primary = box("pitm", new Uint8Array(6));
    const metadata = new Uint8Array(4 + primary.length);
    metadata.set(primary, 4);
    const parts = [box("ftyp", brands), box("meta", metadata), extra];
    const bytes = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    return bytes;
  }

  it("allows still HEIC collections with a compatible hevc brand", () => {
    expect(inspectPhoto(heic())).toBe("heic");
    expect(
      inspectPhoto(heic(box("mdat", new TextEncoder().encode("moov")))),
    ).toBe("heic");
  });

  it("rejects HEIC timed tracks and truncated boxes", () => {
    expect(() => inspectPhoto(heic(box("moov")))).toThrow("sequences");
    expect(() => inspectPhoto(heic(box("moof")))).toThrow("sequences");
    expect(() => inspectPhoto(heic(new Uint8Array([0, 0, 0])))).toThrow();
  });

  it("does not accept a renamed SVG", () => {
    expect(() =>
      inspectPhoto(
        new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      ),
    ).toThrow();
  });

  it("detects APNG animation from chunks, not a substring search", () => {
    const bytes = new Uint8Array(8 + 12 + 12);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    bytes.set(new TextEncoder().encode("acTL"), 12);
    bytes.set(new TextEncoder().encode("IEND"), 24);
    expect(() => inspectPhoto(bytes)).toThrow("Animated");
  });

  it("bounds streamed bodies without trusting content-length", async () => {
    await expect(
      readBounded(byteStream(new Uint8Array(101)), 100),
    ).rejects.toThrow("size");
    expect(
      (await readBounded(byteStream(new Uint8Array(100)), 100)).length,
    ).toBe(100);
  });
});

describe("upload capabilities", () => {
  const secret = "a-test-only-secret-with-at-least-32-characters";
  it("rejects expired and tampered upload grants", async () => {
    const grant = {
      key: "quarantine/abc-123",
      bytes: 100,
      exp: Math.floor(Date.now() / 1000) + 60,
    };
    const token = await signUploadGrant(grant, secret);
    expect(await verifyUploadGrant(token, secret)).toEqual(grant);
    expect(await verifyUploadGrant(token, "another-secret")).toBeNull();
    expect(await verifyUploadGrant(`${token}x`, secret)).toBeNull();
    expect(
      await verifyUploadGrant(token, secret, Date.now() + 120_000),
    ).toBeNull();
  });

  it("limits private media links to 60 seconds and separates read/write authority", async () => {
    const now = Date.now();
    const media = await signMediaGrant(
      "photos/abc-123/display.webp",
      secret,
      now,
    );
    expect(await verifyMediaGrant(media, secret, now)).toMatchObject({
      key: "photos/abc-123/display.webp",
    });
    expect(await verifyMediaGrant(media, secret, now + 61_000)).toBeNull();
    expect(await verifyUploadGrant(media, secret, now)).toBeNull();
    const upload = await signUploadGrant(
      {
        key: "quarantine/abc-123",
        bytes: 100,
        exp: Math.floor(now / 1000) + 60,
      },
      secret,
    );
    expect(await verifyMediaGrant(upload, secret, now)).toBeNull();
  });
});
