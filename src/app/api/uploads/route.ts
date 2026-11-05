import { requireUser } from "@/lib/auth";
import { reserveUpload } from "@/lib/domain";
import { json, handleError, assertSameOrigin, smallJson } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    return json(await reserveUpload(user.id, await smallJson(request)), 201);
  } catch (error) {
    return handleError(error);
  }
}
