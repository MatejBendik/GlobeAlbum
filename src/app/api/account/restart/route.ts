import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { completeIdentityDeletion } from "@/lib/identity-cleanup";
import { assertSameOrigin, handleError, json } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { data: session, error } = await getAuth().getSession();
    if (error)
      return json(
        { error: "Could not check your session. Please try again." },
        503,
      );
    if (!session?.user) return json({ ready: true });
    // Never accept a user ID or email from the client. A signed session may only
    // finish its own already-confirmed deletion; it cannot delete an active user.
    const fence = await getDb().deletedIdentity.findUnique({
      where: { userId: session.user.id },
    });
    if (!fence) return json({ ready: true });
    if (!(await completeIdentityDeletion(session.user.id)))
      return json(
        {
          error:
            "Your previous account is still being removed. Please try again shortly.",
        },
        503,
      );
    return json({ ready: true });
  } catch (error) {
    return handleError(error);
  }
}
