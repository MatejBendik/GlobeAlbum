import { handleError, NO_STORE } from "@/lib/http";
import { readPublicGlobePreview } from "@/lib/public-globe-preview";
import { renderShareImage } from "@/lib/share-image";
import { globeShareImagePath } from "@/lib/share-metadata";
import { photoUrl, storageConfigured } from "@/lib/storage";

export const runtime = "nodejs";

function unavailable() {
  return new Response(null, { status: 404, headers: NO_STORE });
}

function updatedImage(username: string, revision: string) {
  return new Response(null, {
    status: 307,
    headers: { ...NO_STORE, Location: globeShareImagePath(username, revision) },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; revision: string }> },
) {
  try {
    const { username, revision } = await params;
    if (!/^[a-f0-9]{24}$/.test(revision)) return unavailable();

    const preview = await readPublicGlobePreview(username);
    if (!preview) return unavailable();
    if (preview.revision !== revision)
      return updatedImage(username, preview.revision);

    const photos = storageConfigured()
      ? await Promise.all(
          preview.postcards.map(async ({ placeName, thumbnailKey }) => ({
            place: placeName,
            url: await photoUrl(thumbnailKey),
          })),
        )
      : [];
    const counts = [
      [preview.places.length, "place"],
      [preview.countryCount, "country", "countries"],
      [preview.photoCount, "photo"],
    ] as const;
    const image = await renderShareImage({
      title: preview.displayName,
      subtitle: counts
        .map(
          ([count, word, plural = `${word}s`]) =>
            `${count} ${count === 1 ? word : plural}`,
        )
        .join("  ·  "),
      label: "SHARED ON GLOBEALBUM",
      style: preview.style,
      places: preview.places,
      focus: preview.places.find(
        (place) => place.id === preview.postcards[0]?.placeId,
      ),
      photos,
    });
    const bytes = await image.arrayBuffer();

    // A profile may be hidden or a photo removed while the image is rendering.
    const current = await readPublicGlobePreview(username);
    if (!current) return unavailable();
    if (current.revision !== revision)
      return updatedImage(username, current.revision);

    return new Response(bytes, {
      headers: { ...NO_STORE, "Content-Type": "image/png" },
    });
  } catch (error) {
    return handleError(error);
  }
}
