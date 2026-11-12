import { readEmbeddedGallery } from "@/lib/domain";
import { handleError, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string; id: string }> },
) {
  try {
    const { username, id } = await context.params;
    return json(await readEmbeddedGallery(username, id));
  } catch (error) {
    return handleError(error);
  }
}
