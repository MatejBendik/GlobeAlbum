import { timingSafeEqual } from "node:crypto";
import { runMaintenance } from "@/lib/maintenance";
import { json, handleError } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") ?? "";
  const comparison = `Bearer ${expected ?? ""}`;
  if (
    !expected ||
    Buffer.byteLength(received) !== Buffer.byteLength(comparison) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(comparison))
  )
    return json({ error: "Unauthorized" }, 401);
  try {
    return json(await runMaintenance());
  } catch (error) {
    return handleError(error);
  }
}
