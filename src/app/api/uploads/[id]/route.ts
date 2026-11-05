import { requireUser } from "@/lib/auth";
import { finishUpload } from "@/lib/domain";
import { json, handleError, assertSameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    return json(await finishUpload(user.id, (await context.params).id));
  } catch (error) {
    return handleError(error);
  }
}
