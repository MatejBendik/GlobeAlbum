import type { GlobeDto, GalleryDto } from "./types";
const image = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
const entries = [
  [
    "paris",
    "Paris",
    "FR",
    48.8566,
    2.3522,
    "photo-1502602898657-3e91760cbb34",
    "A morning with nowhere to be.",
  ],
  [
    "kyoto",
    "Kyoto",
    "JP",
    35.0116,
    135.7681,
    "photo-1493976040374-85c8e12f0c0e",
    "Taking the quiet way through the city.",
  ],
  [
    "cinque-terre",
    "Cinque Terre",
    "IT",
    44.119,
    9.709,
    "photo-1516483638261-f4dbaf036963",
    "The view was worth the long walk.",
  ],
  [
    "santorini",
    "Oia",
    "GR",
    36.4618,
    25.3753,
    "photo-1533105079780-92b9be482077",
    "One last evening by the sea.",
  ],
  [
    "venice",
    "Venice",
    "IT",
    45.4408,
    12.3155,
    "photo-1523906834658-6e24ef2386f9",
    "Getting a little lost on purpose.",
  ],
  [
    "bangkok",
    "Bangkok",
    "TH",
    13.7563,
    100.5018,
    "photo-1508009603885-50cf7c579365",
    "A city that never stops surprising you.",
  ],
] as const;
export const demoGlobe: GlobeDto = {
  avatarUrl: null,
  username: "the-long-way-home",
  displayName: "The long way home",
  published: true,
  style: "dotted",
  countryCount: 5,
  photoCount: 6,
  visitCount: 8,
  places: entries.map(([id, name, country, latitude, longitude, photo]) => ({
    id,
    name,
    country,
    latitude,
    longitude,
    photoCount: 1,
    visitCount: id === "paris" ? 3 : 1,
    coverPhotoId: id,
    coverUrl: image(photo, 320),
  })),
};
export function demoGallery(id: string): GalleryDto {
  return {
    photos: entries
      .filter((e) => e[0] === id)
      .map(([id, , , , , photo, caption]) => ({
        id,
        caption,
        thumbnailUrl: image(photo, 320),
        displayUrl: image(photo, 1600),
      })),
  };
}
