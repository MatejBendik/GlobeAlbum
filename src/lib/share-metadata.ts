import type { Metadata } from "next";

export const shareImageSize = { width: 1200, height: 630 };

export function shareMetadata({
  title,
  description,
  path,
  imageUrl,
  imageAlt,
}: {
  title: string;
  description: string;
  path: string;
  imageUrl: string;
  imageAlt: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const image = { url: imageUrl, alt: imageAlt, ...shareImageSize };

  return {
    openGraph: {
      type: "website",
      siteName: "GlobeAlbum",
      url: path,
      title,
      description,
      images: [{ ...image, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function globeShareImagePath(username: string, revision: string) {
  return `/api/share-image/${encodeURIComponent(username)}/${revision}`;
}
