import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { handleError, NO_STORE } from "@/lib/http";
import { photoUrl, storageConfigured } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const revision = new URL(request.url).searchParams.get("v");
    const globe = await getDb().globe.findUnique({
      where: { username },
      select: { avatarKey: true, published: true, userId: true },
    });
    if (
      !globe?.avatarKey ||
      globe.avatarKey !== `avatars/${revision}.webp` ||
      !storageConfigured() ||
      (!globe.published && (await currentUser())?.id !== globe.userId)
    )
      throw new AppError("Profile photo not found.", 404);
    return new Response(null, {
      status: 307,
      headers: { ...NO_STORE, Location: await photoUrl(globe.avatarKey) },
    });
  } catch (error) {
    return handleError(error);
  }
}
