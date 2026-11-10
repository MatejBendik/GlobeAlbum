import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  geoGraticule10,
  geoOrthographic,
  geoPath,
  type GeoGeometryObjects,
} from "d3-geo";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { GlobeStyle } from "./globe-style";
import { readBounded } from "./image-validation";
import { LIMITS } from "./limits";
import { shareImageSize } from "./share-metadata";

type Position = { latitude: number; longitude: number };

const palettes = {
  dotted: { ocean: "#f4f3ee", land: "#858b88", border: "#d9d6cb" },
  atlas: { ocean: "#f2f2f2", land: "#e6e6e6", border: "#767676" },
  orbit: { ocean: "#d4e9e9", land: "#a5c3a0", border: "#718f76" },
};
const artworkSize = 510;
const center = artworkSize / 2;
const radius = 226;

let dots: Promise<{ lat: number; lng: number }[]> | undefined;
let atlas: Promise<{ geometry: GeoGeometryObjects }[]> | undefined;

async function globeArtwork(
  style: GlobeStyle,
  places: Position[],
  focus: Position,
) {
  const colors = palettes[style];
  const projection = geoOrthographic()
    .translate([center, center])
    .scale(radius)
    .rotate([-focus.longitude, -focus.latitude])
    .clipAngle(90);
  const path = geoPath(projection).digits(1);
  let land: string;

  if (style === "dotted") {
    dots ??= readFile(
      join(process.cwd(), "public", "land-dots.json"),
      "utf8",
    ).then(JSON.parse);
    const landDots = path.pointRadius(1.25)({
      type: "MultiPoint",
      coordinates: (await dots).map(({ lng, lat }) => [lng, lat]),
    });
    land = `<path d="${landDots ?? ""}" fill="${colors.land}" />`;
  } else {
    atlas ??= readFile(
      join(process.cwd(), "public", "atlas-countries.geojson"),
      "utf8",
    ).then(JSON.parse);
    land = (await atlas)
      .map(({ geometry }) => path(geometry))
      .filter(Boolean)
      .map(
        (outline) =>
          `<path d="${outline}" fill="${colors.land}" stroke="${colors.border}" stroke-width=".65" />`,
      )
      .join("");
  }

  const pins = path.pointRadius(4.5)({
    type: "MultiPoint",
    coordinates: places.map(({ longitude, latitude }) => [longitude, latitude]),
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${artworkSize}" height="${artworkSize}">
    <defs>
      <radialGradient id="ocean" cx="36%" cy="28%" r="80%">
        <stop stop-color="#fff" />
        <stop offset="1" stop-color="${colors.ocean}" />
      </radialGradient>
    </defs>
    <circle cx="${center}" cy="${center}" r="${radius + 24}" fill="none" stroke="#dce0d5" stroke-dasharray="3 7" />
    <circle cx="${center}" cy="${center}" r="${radius + 12}" fill="#fff" fill-opacity=".38" />
    <circle cx="${center}" cy="${center}" r="${radius}" fill="url(#ocean)" stroke="${colors.border}" stroke-width="1.2" />
    <path d="${path(geoGraticule10())}" fill="none" stroke="#697b6a" stroke-opacity=".12" stroke-width=".55" />
    ${land}
    <path d="${pins ?? ""}" fill="#344b38" stroke="#fff" stroke-width="2" />
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function postcardImage(url: string) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok || !response.body) return null;

    const bytes = await readBounded(response.body, LIMITS.variantBytes);
    const png = await sharp(bytes, { limitInputPixels: 1_000_000 })
      .resize(290, 180, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderShareImage({
  title,
  subtitle,
  label,
  style,
  places,
  focus = places[0] ?? { latitude: 30, longitude: 16 },
  photos,
}: {
  title: string;
  subtitle: string;
  label: string;
  style: GlobeStyle;
  places: Position[];
  focus?: Position;
  photos: { url: string; place: string }[];
}) {
  const [globe, postcards] = await Promise.all([
    globeArtwork(style, places, focus),
    Promise.all(
      photos.map(async ({ url, place }) => ({
        place,
        image: await postcardImage(url),
      })),
    ),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#f4f5ee",
        color: "#222e25",
        padding: 34,
      }}
    >
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          border: "1px solid #d8ded1",
          borderRadius: 30,
          background: "linear-gradient(120deg, #fcfcf8, #eff2e8)",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 49,
            left: 49,
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: "#698769",
            }}
          />
          GlobeAlbum
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 130,
            left: 49,
            width: 490,
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: title.length > 36 ? 45 : 62,
              fontWeight: 700,
              letterSpacing: -2.5,
              lineHeight: 1.08,
              overflowWrap: "break-word",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 24, color: "#536357", marginTop: 22 }}>
            {subtitle}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 48,
            left: 49,
            fontSize: 17,
            color: "#536357",
            letterSpacing: 1.5,
          }}
        >
          {label}
        </div>
        <img
          src={globe}
          alt=""
          width={artworkSize}
          height={artworkSize}
          style={{ position: "absolute", top: 12, right: 35 }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 48,
            bottom: 40,
            gap: 13,
          }}
        >
          {postcards
            .filter(({ image }) => image)
            .map(({ image, place }, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  width: 147,
                  padding: 6,
                  flexDirection: "column",
                  background: "#fffefb",
                  border: "1px solid #d5dacc",
                  borderRadius: 8,
                  boxShadow: "0 6px 14px #26332928",
                  transform: `rotate(${[-5, 2, 6][index]}deg)`,
                }}
              >
                <img src={image!} alt="" width={133} height={83} />
                <div
                  style={{
                    margin: "5px 4px 2px",
                    fontSize: 13,
                    color: "#3d5240",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {place}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>,
    shareImageSize,
  );
}
