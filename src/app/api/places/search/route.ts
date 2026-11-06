import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { locked } from "@/lib/domain";
import { COUNTRY_CODES } from "@/lib/countries";
import { json, handleError } from "@/lib/http";
const resultSchema = z.object({
  geonames: z
    .array(
      z.object({
        geonameId: z.number(),
        name: z.string(),
        countryCode: z.string(),
        lat: z.string(),
        lng: z.string(),
        adminName1: z.string().optional(),
      }),
    )
    .default([]),
});
export async function GET(request: Request) {
  try {
    const user = await requireUser(),
      query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2 || query.length > 100) return json({ places: [] });
    if (!process.env.GEONAMES_USERNAME)
      throw new AppError(
        "Place search is unavailable. Choose the location on the map.",
        503,
      );
    await locked(async (tx) => {
      const id = `search:${user.id}:${Math.floor(Date.now() / 60_000)}`;
      const row = await tx.requestWindow.upsert({
        where: { id },
        create: { id, expiresAt: new Date(Date.now() + 120_000) },
        update: { count: { increment: 1 } },
      });
      if (row.count > 20)
        throw new AppError("Too many searches. Try again in a minute.", 429);
    });
    const url = new URL("https://secure.geonames.org/searchJSON");
    for (const [key, value] of Object.entries({
      name_startsWith: query,
      featureClass: "P",
      featureCode: "PPL",
      maxRows: "8",
      orderby: "relevance",
      username: process.env.GEONAMES_USERNAME,
      lang: "en",
    }))
      url.searchParams.append(key, value);
    // Repeated featureCode values include ordinary and administrative settlements.
    for (const code of ["PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLC"])
      url.searchParams.append("featureCode", code);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new AppError(
        "Place search is unavailable. Choose the location on the map or try again.",
        503,
      );
    const result = resultSchema.parse(await response.json());
    return json({
      places: result.geonames
        .filter((place) => COUNTRY_CODES.has(place.countryCode))
        .map((place) => ({
          providerId: String(place.geonameId),
          name: place.name,
          country: place.countryCode,
          region: place.adminName1 ?? "",
          latitude: Number(place.lat),
          longitude: Number(place.lng),
        })),
    });
  } catch (error) {
    return handleError(error);
  }
}
