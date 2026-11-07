import { requireUser } from "@/lib/auth";
import { changeGlobeAvatar, removeGlobeAvatar } from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, handleError, json } from "@/lib/http";
import { readBounded } from "@/lib/image-validation";
import { LIMITS } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (!request.body) throw new AppError("Choose a photo to upload.", 400);
    const bytes = await readBounded(request.body, LIMITS.avatarFileBytes).catch(
      () => {
        throw new AppError("Choose a photo up to 4 MB.", 413);
      },
    );
    if (!bytes.length) throw new AppError("Choose a photo to upload.", 400);
    await changeGlobeAvatar(user.id, bytes);
    return json({ saved: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await removeGlobeAvatar((await requireUser()).id);
    return json({ saved: true });
  } catch (error) {
    return handleError(error);
  }
}
