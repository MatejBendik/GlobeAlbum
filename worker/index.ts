import { z } from "zod";
import { verifyUploadGrant, verifyMediaGrant } from "../src/lib/upload-grant";
import { LIMITS } from "../src/lib/limits";
import {
  readBounded,
  inspectPhoto,
  byteStream,
} from "../src/lib/image-validation";

// Binding types are generated from wrangler.jsonc into worker-configuration.d.ts.
const processSchema = z
  .object({
    sourceKey: z.string().regex(/^quarantine\/[a-zA-Z0-9-]+$/),
    expectedBytes: z.number().int().positive().max(LIMITS.fileBytes),
    thumbnailKey: z.string().regex(/^photos\/[a-zA-Z0-9-]+\/thumbnail\.webp$/),
    displayKey: z.string().regex(/^photos\/[a-zA-Z0-9-]+\/display\.webp$/),
  })
  .refine((v) => v.thumbnailKey.split("/")[1] === v.displayKey.split("/")[1]);
let processing = false;
function reply(
  body: object,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

async function hasControlAccess(request: Request, secret: string) {
  const encoder = new TextEncoder();
  const [provided, expected] = await Promise.all([
    crypto.subtle.digest(
      "SHA-256",
      encoder.encode(request.headers.get("authorization") ?? ""),
    ),
    crypto.subtle.digest("SHA-256", encoder.encode(`Bearer ${secret}`)),
  ]);
  return crypto.subtle.timingSafeEqual(provided, expected);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!env.IMAGE_WORKER_SECRET || env.IMAGE_WORKER_SECRET.length < 32)
      return reply({ error: "Worker is not configured." }, 503);
    if (url.pathname === "/image" && request.method === "GET") {
      const grant = await verifyMediaGrant(
        url.searchParams.get("grant") ?? "",
        env.IMAGE_WORKER_SECRET,
      );
      if (!grant)
        return reply({ error: "Image link is invalid or expired." }, 403);
      const image = await env.PHOTOS.get(grant.key);
      if (!image) return reply({ error: "Image not found." }, 404);
      return new Response(image.body, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
        },
      });
    }
    if (url.pathname === "/objects" && request.method === "POST") {
      if (!(await hasControlAccess(request, env.IMAGE_WORKER_SECRET)))
        return reply({ error: "Unauthorized" }, 401);
      try {
        const body = await readBounded(request.body!, 2048);
        const input = z
          .object({
            operation: z.enum(["head", "delete"]),
            key: z
              .string()
              .regex(
                /^(quarantine\/[a-zA-Z0-9-]+|photos\/[a-zA-Z0-9-]+\/(thumbnail|display)\.webp)$/,
              ),
          })
          .parse(JSON.parse(new TextDecoder().decode(body)));
        if (input.operation === "delete") {
          await env.PHOTOS.delete(input.key);
          return reply({ deleted: true });
        }
        const object = await env.PHOTOS.head(input.key);
        return reply({ size: object?.size ?? 0 });
      } catch {
        return reply({ error: "Invalid storage operation." }, 400);
      }
    }
    if (url.pathname === "/upload") {
      const cors = {
        "Access-Control-Allow-Origin": env.APP_ORIGIN,
        "Access-Control-Allow-Methods": "PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
      };
      if (request.headers.get("origin") !== env.APP_ORIGIN)
        return reply({ error: "Origin not allowed." }, 403);
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers: cors });
      if (request.method !== "PUT")
        return reply({ error: "Method not allowed." }, 405, cors);
      const grant = await verifyUploadGrant(
        url.searchParams.get("grant") ?? "",
        env.IMAGE_WORKER_SECRET,
      );
      if (!grant || !request.body)
        return reply(
          { error: "Upload link is invalid or expired." },
          403,
          cors,
        );
      const length = request.headers.get("content-length");
      if (length && Number(length) !== grant.bytes)
        return reply(
          { error: "File size does not match its reservation." },
          413,
          cors,
        );
      if (await env.PHOTOS.head(grant.key))
        return reply(
          { error: "This upload has already been used." },
          409,
          cors,
        );
      const fixed = new FixedLengthStream(grant.bytes);
      const deadline = new AbortController();
      const timeout = setTimeout(
        () => deadline.abort(),
        Math.max(1, grant.exp * 1000 - Date.now()),
      );
      const pump = request.body.pipeTo(fixed.writable, {
        signal: deadline.signal,
      });
      const put = env.PHOTOS.put(grant.key, fixed.readable, {
        onlyIf: new Headers({ "If-None-Match": "*" }),
        httpMetadata: {
          contentType: "application/octet-stream",
          cacheControl: "private, no-store",
        },
      });
      const results = await Promise.allSettled([pump, put]);
      clearTimeout(timeout);
      if (results[0].status === "rejected" || results[1].status === "rejected")
        return reply(
          {
            error: "Upload was incomplete or did not match the reserved size.",
          },
          422,
          cors,
        );
      if (results[1].value === null)
        return reply(
          { error: "This upload has already been used." },
          409,
          cors,
        );
      return reply({ uploaded: true }, 201, cors);
    }
    if (url.pathname !== "/process" || request.method !== "POST")
      return reply({ error: "Not found." }, 404);
    if (!(await hasControlAccess(request, env.IMAGE_WORKER_SECRET)))
      return reply({ error: "Unauthorized" }, 401);
    if (processing)
      return reply({ error: "Processor is busy. Retry shortly." }, 503);
    processing = true;
    const processingDeadline = Date.now() + 90_000;
    let phase = "request";
    try {
      if (Number(request.headers.get("content-length") ?? 0) > 4096)
        return reply({ error: "Request too large." }, 413);
      const raw = await readBounded(request.body!, 4096);
      const input = processSchema.parse(
        JSON.parse(new TextDecoder().decode(raw)),
      );
      phase = "source";
      const source = await env.PHOTOS.get(input.sourceKey);
      if (!source || source.size !== input.expectedBytes)
        return reply(
          { error: "Upload is missing or has the wrong size." },
          422,
        );
      const bytes = await readBounded(source.body, LIMITS.fileBytes);
      phase = "validation";
      inspectPhoto(bytes);
      phase = "image-info";
      const info = await env.IMAGES.info(byteStream(bytes));
      if (
        !("width" in info) ||
        info.width * info.height > LIMITS.maxPixels ||
        !info.width ||
        !info.height
      )
        return reply({ error: "Image dimensions are not supported." }, 422);
      let total = 0;
      phase = "transformation";
      for (const [width, key, quality] of [
        [320, input.thumbnailKey, 76],
        [2560, input.displayKey, 84],
      ] as const) {
        const output = await env.IMAGES.input(byteStream(bytes))
          .transform({ width, height: width, fit: "scale-down" })
          .output({ format: "image/webp", quality, anim: false });
        const image = await readBounded(
          output.image(),
          LIMITS.variantBytes - total,
        );
        total += image.length;
        if (Date.now() > processingDeadline)
          return reply({ error: "Processing timed out. Retry shortly." }, 503);
        await env.PHOTOS.put(key, image, {
          httpMetadata: {
            contentType: "image/webp",
            cacheControl: "private, no-store, max-age=0",
          },
        });
      }
      return reply({ processed: true });
    } catch (error) {
      const providerCode =
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : null;
      console.error(
        JSON.stringify({
          event: "photo_processing_failed",
          phase,
          providerCode,
          name: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      const invalid =
        phase === "validation" ||
        [9402, 9412, 9413, 9520].includes(Number(providerCode));
      return reply(
        {
          error: invalid
            ? "The photograph is unsupported, corrupt, animated or too large."
            : "Image processing is temporarily unavailable.",
          phase,
          providerCode,
        },
        invalid ? 422 : 503,
      );
    } finally {
      processing = false;
    }
  },
} satisfies ExportedHandler<Env>;
