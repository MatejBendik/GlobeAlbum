import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.APP_ORIGIN ?? "https://globealbum.com";

  return {
    // Allow crawlers to read noindex on public profiles and other excluded pages.
    // Authentication and resource authorization protect private content.
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: new URL("/sitemap.xml", origin).href,
  };
}
