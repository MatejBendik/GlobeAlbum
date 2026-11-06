import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { createPhotoVariants } from "../src/lib/photo-processing";

describe("local photo processing", () => {
  it.each(["tiny.jpeg", "tiny.png", "static.heic"])(
    "decodes %s into private album variants without an image service",
    async (name) => {
      const result = await createPhotoVariants(
        readFileSync(`tests/fixtures/${name}`),
      );
      for (const bytes of [result.thumbnail, result.display]) {
        const metadata = await sharp(bytes).metadata();
        expect(metadata.format).toBe("webp");
        expect(metadata.width).toBe(2);
        expect(metadata.height).toBe(2);
        expect(metadata.exif).toBeUndefined();
        expect(metadata.xmp).toBeUndefined();
      }
    },
  );

  it("applies EXIF orientation, bounds dimensions and removes metadata", async () => {
    const input = await sharp({
      create: { width: 1600, height: 800, channels: 3, background: "#62867b" },
    })
      .withMetadata({
        orientation: 6,
        exif: { IFD0: { Artist: "Private traveler" } },
      })
      .jpeg()
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const result = await createPhotoVariants(input);
    const small = await sharp(result.thumbnail).metadata();
    const large = await sharp(result.display).metadata();
    expect([small.width, small.height]).toEqual([160, 320]);
    expect([large.width, large.height]).toEqual([800, 1600]);
    expect(small.exif).toBeUndefined();
    expect(large.exif).toBeUndefined();
    expect(large.orientation).toBeUndefined();
    expect(large.icc).toBeUndefined();
  });

  it("processes a phone-sized JPEG without upscaling or changing its aspect ratio", async () => {
    const input = await sharp({
      create: { width: 4032, height: 3024, channels: 3, background: "#62867b" },
    })
      .jpeg()
      .toBuffer();
    const result = await createPhotoVariants(input);
    expect(await sharp(result.display).metadata()).toMatchObject({
      width: 2560,
      height: 1920,
      format: "webp",
    });
    expect(await sharp(result.thumbnail).metadata()).toMatchObject({
      width: 320,
      height: 240,
      format: "webp",
    });
  });

  it("rejects corrupt input and pixels above the decode limit", async () => {
    await expect(
      createPhotoVariants(Buffer.from([255, 216, 255, ...Array(20).fill(0)])),
    ).rejects.toMatchObject({ status: 422 });
    const input = await sharp({
      create: { width: 7100, height: 7100, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    await expect(createPhotoVariants(input)).rejects.toMatchObject({
      status: 422,
    });
  });
});
