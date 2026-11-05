import { currentUser } from "@/lib/auth";
import { readGallery } from "@/lib/domain";
import { json, handleError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return json(
      await readGallery((await context.params).id, (await currentUser())?.id),
    );
  } catch (error) {
    return handleError(error);
  }
}
