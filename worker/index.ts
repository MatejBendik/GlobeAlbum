import { isAllowedAppOrigin } from "../src/lib/origins";
import { z } from "zod";
import {
  mediaObjectKey,
  quarantineObjectKey,
  storedObjectKey,
  verifyUploadGrant,
  verifyMediaGrant,
} from "../src/lib/upload-grant";
import { LIMITS } from "../src/lib/limits";
import { readBounded, inspectPhoto } from "../src/lib/image-validation";

// Binding types are generated from wrangler.jsonc. This Worker only stores files.
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
            key: storedObjectKey,
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
      const origin = request.headers.get("origin");
      if (
        !origin ||
        (!isAllowedAppOrigin(origin, env.APP_ORIGIN) &&
          !isAllowedAppOrigin(origin, env.LOCAL_APP_ORIGIN))
      )
        return reply({ error: "Origin not allowed." }, 403);
      const cors = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
      };
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
    if (url.pathname === "/source" && request.method === "POST") {
      if (!(await hasControlAccess(request, env.IMAGE_WORKER_SECRET)))
        return reply({ error: "Unauthorized" }, 401);
      try {
        const input = z
          .object({
            key: quarantineObjectKey,
            expectedBytes: z.number().int().positive().max(LIMITS.fileBytes),
          })
          .parse(
            JSON.parse(
              new TextDecoder().decode(await readBounded(request.body!, 1024)),
            ),
          );
        const source = await env.PHOTOS.get(input.key);
        if (!source || source.size !== input.expectedBytes)
          return reply(
            { error: "Upload is missing or has the wrong size." },
            422,
          );
        return new Response(source.body, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": String(source.size),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
          },
        });
      } catch {
        return reply({ error: "Invalid source request." }, 400);
      }
    }
    if (url.pathname === "/variant" && request.method === "PUT") {
      if (!(await hasControlAccess(request, env.IMAGE_WORKER_SECRET)))
        return reply({ error: "Unauthorized" }, 401);
      try {
        const key = mediaObjectKey.parse(request.headers.get("X-Object-Key"));
        const limit = key.startsWith("avatars/")
          ? LIMITS.avatarVariantBytes
          : LIMITS.variantBytes;
        const expected = Number(request.headers.get("content-length"));
        if (!Number.isInteger(expected) || expected <= 0 || expected > limit)
          return reply({ error: "Invalid variant size." }, 413);
        const bytes = await readBounded(request.body!, limit);
        if (bytes.length !== expected || inspectPhoto(bytes) !== "webp")
          return reply({ error: "Invalid variant." }, 422);
        await env.PHOTOS.put(key, bytes, {
          httpMetadata: {
            contentType: "image/webp",
            cacheControl: "private, no-store, max-age=0",
          },
        });
        return reply({ stored: true }, 201);
      } catch {
        return reply({ error: "Invalid variant." }, 422);
      }
    }
    return reply({ error: "Not found." }, 404);
  },
} satisfies ExportedHandler<Env>;
