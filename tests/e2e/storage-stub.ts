// Local R2 transport double. The app performs actual Sharp/HEIC decoding.
// Real R2 storage and byte enforcement are verified separately.
import { createServer, type IncomingMessage } from "node:http";
import {
  verifyUploadGrant,
  verifyMediaGrant,
} from "../../src/lib/upload-grant";
import { TEST_ORIGIN, TEST_SESSION_SECRET } from "./constants";

if (process.env.GLOBEALBUM_STORAGE_TEST_STUB !== "1")
  throw new Error("This server is only for the isolated local browser tests.");

const objects = new Map<string, Buffer>();
async function body(request: IncomingMessage, limit: number) {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw new Error("Test body too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

createServer(async (request, response) => {
  const url = new URL(request.url!, "http://127.0.0.1:8787");
  const reply = (value: object, status = 200) => {
    response.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(value));
  };
  try {
    if (url.pathname === "/health") return reply({ testStub: true });
    if (url.pathname === "/upload") {
      response.setHeader("Access-Control-Allow-Origin", TEST_ORIGIN);
      response.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }
      const grant = await verifyUploadGrant(
        url.searchParams.get("grant") ?? "",
        TEST_SESSION_SECRET,
      );
      if (
        !grant ||
        request.method !== "PUT" ||
        request.headers.origin !== TEST_ORIGIN
      )
        return reply({ error: "Invalid test upload." }, 403);
      const bytes = await body(request, grant.bytes);
      if (bytes.length !== grant.bytes)
        return reply({ error: "Wrong size." }, 413);
      if (objects.has(grant.key))
        return reply({ error: "Already uploaded." }, 409);
      objects.set(grant.key, bytes);
      return reply({ uploaded: true }, 201);
    }
    if (url.pathname === "/image") {
      const grant = await verifyMediaGrant(
        url.searchParams.get("grant") ?? "",
        TEST_SESSION_SECRET,
      );
      const bytes = grant && objects.get(grant.key);
      if (!bytes) return reply({ error: "Missing test image." }, 404);
      response.writeHead(200, {
        "Content-Type": "image/webp",
        "Cache-Control": "no-store",
      });
      response.end(bytes);
      return;
    }
    if (request.headers.authorization !== `Bearer ${TEST_SESSION_SECRET}`)
      return reply({ error: "Unauthorized." }, 401);
    if (url.pathname === "/variant" && request.method === "PUT") {
      const key = request.headers["x-object-key"];
      if (typeof key !== "string") return reply({ error: "Invalid key" }, 400);
      objects.set(key, await body(request, 4_000_000));
      return reply({ stored: true }, 201);
    }
    const input = JSON.parse((await body(request, 4096)).toString());
    if (url.pathname === "/source") {
      const source = objects.get(input.key);
      if (!source || source.length !== input.expectedBytes)
        return reply({ error: "Missing source." }, 422);
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, no-store",
      });
      response.end(source);
      return;
    }
    if (url.pathname === "/objects") {
      if (input.operation === "delete") {
        objects.delete(input.key);
        return reply({ deleted: true });
      }
      return reply({ size: objects.get(input.key)?.length ?? 0 });
    }
    reply({ error: "Not found." }, 404);
  } catch {
    if (!response.headersSent) reply({ error: "Invalid test request." }, 400);
    else response.end();
  }
}).listen(8787, "127.0.0.1");
