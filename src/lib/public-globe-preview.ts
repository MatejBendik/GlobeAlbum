import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "./db";

export async function readPublicGlobePreview(username: string) {
  const globe = await getDb().globe.findUnique({
    where: { username, published: true },
    select: {
      displayName: true,
      style: true,
      places: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          sourceCountry: true,
          countryOverride: true,
          coverPhotoId: true,
          visits: {
            select: {
              photos: {
                where: { status: "READY" },
                select: { id: true, thumbnailKey: true, createdAt: true },
              },
            },
          },
        },
      },
    },
  });
  if (!globe) return null;

  const places = globe.places.map((place) => ({
    id: place.id,
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    country: place.countryOverride ?? place.sourceCountry,
  }));
  const photos = globe.places
    .flatMap((place) =>
      place.visits.flatMap((visit) =>
        visit.photos.map((photo) => ({
          ...photo,
          placeId: place.id,
          placeName: place.name,
          isCover: photo.id === place.coverPhotoId,
        })),
      ),
    )
    .sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
  const cover = photos.find((photo) => photo.isCover);
  const postcards = cover
    ? [cover, ...photos.filter((photo) => photo !== cover)].slice(0, 3)
    : photos.slice(0, 3);
  const revision = createHash("sha256")
    .update(
      JSON.stringify([
        "share-image-v1",
        globe.displayName,
        globe.style,
        places,
        photos.map(({ id, isCover }) => [id, isCover]),
      ]),
    )
    .digest("hex")
    .slice(0, 24);

  return {
    displayName: globe.displayName,
    style: globe.style,
    places,
    postcards,
    photoCount: photos.length,
    countryCount: new Set(places.map((place) => place.country)).size,
    revision,
  };
}
