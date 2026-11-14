import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.APP_ORIGIN ?? "https://globealbum.com";

  // Only the landing page opts into indexing; never enumerate user globes.
  return [{ url: new URL("/", origin).href }];
}
