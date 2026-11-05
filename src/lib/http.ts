import "server-only";
import { ZodError } from "zod";
import { AppError } from "./errors";

export const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}
export function handleError(error: unknown) {
  if (error instanceof ZodError)
    return json({ error: error.issues[0]?.message ?? "Invalid input." }, 400);
  if (error instanceof AppError)
    return json({ error: error.message, code: error.code }, error.status);
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json({ error: "Something went wrong. Please try again." }, 500);
}
export function assertSameOrigin(request: Request) {
  const configured = process.env.BETTER_AUTH_URL;
  if (
    !configured ||
    request.headers.get("origin") !== new URL(configured).origin
  )
    throw new AppError("This request origin is not allowed.", 403, "ORIGIN");
}
export async function smallJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("A request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.length;
    if (length > 16_384) {
      await reader.cancel();
      throw new AppError("Request is too large.", 413);
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AppError("Invalid JSON.");
  }
}
