import "server-only";
import { currentUser } from "./auth";
import { getDb } from "./db";
import { globeAvatarUrl } from "./storage";
export type NavigationViewer = {
  displayName: string;
  profileHref: string | null;
  avatarUrl: string | null;
};
export function toNavigationViewer(
  user: { name: string; avatarUrl: string | null },
  globe?: {
    displayName: string;
    published: boolean;
    username: string;
    avatarUrl: string | null;
  } | null,
): NavigationViewer {
  return {
    displayName: globe?.displayName || user.name,
    profileHref: globe?.published ? `/u/${globe.username}` : null,
    avatarUrl: globe?.avatarUrl ?? user.avatarUrl,
  };
}

export async function navigationViewer(): Promise<NavigationViewer | null> {
  const user = await currentUser();
  if (!user) return null;
  const globe = await getDb().globe.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true,
      username: true,
      published: true,
      avatarKey: true,
    },
  });
  return toNavigationViewer(
    user,
    globe && { ...globe, avatarUrl: globeAvatarUrl(globe) },
  );
}
