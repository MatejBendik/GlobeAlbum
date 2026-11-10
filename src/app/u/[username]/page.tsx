import { navigationViewer } from "@/lib/navigation-viewer";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { readGlobe } from "@/lib/domain";
import { Workspace } from "@/components/workspace";
import type { Metadata } from "next";
import { readPublicGlobePreview } from "@/lib/public-globe-preview";
import { globeShareImagePath, shareMetadata } from "@/lib/share-metadata";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const preview = await readPublicGlobePreview(username);
  if (!preview) return { openGraph: null, twitter: null };

  const description = "Explore this personal travel globe on GlobeAlbum.";
  return {
    title: preview.displayName,
    description,
    ...shareMetadata({
      title: `${preview.displayName} · GlobeAlbum`,
      description,
      path: `/u/${encodeURIComponent(username)}`,
      imageUrl: globeShareImagePath(username, preview.revision),
      imageAlt: `Travel globe and places shared by ${preview.displayName}`,
    }),
  };
}

export default async function PublicGlobePage({ params }: Props) {
  const { username } = await params;
  const globe = await readGlobe({ username });
  if (!globe) notFound();
  return (
    <Suspense>
      <Workspace globe={globe} viewer={await navigationViewer()} />
    </Suspense>
  );
}
