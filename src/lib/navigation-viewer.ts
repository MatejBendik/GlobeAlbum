import "server-only";
import { currentUser } from "./auth";
import { getDb } from "./db";
export type NavigationViewer = {
  displayName: string;
  profileHref: string | null;
};
export async function navigationViewer(): Promise<NavigationViewer | null> {
  const user = await currentUser();
  if (!user) return null;
  const globe = await getDb().globe.findUnique({
    where: { userId: user.id },
    select: { displayName: true, username: true, published: true },
  });
  return {
    displayName: globe?.displayName || user.name,
    profileHref: globe?.published ? `/u/${globe.username}` : null,
  };
}
