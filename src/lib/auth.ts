import "server-only";
import { auth, authConfigured } from "./auth-server";
import { syncIdentity } from "./domain";
import { AppError } from "./errors";

export { authConfigured };
export function getAuth() {
  if (!authConfigured())
    throw new AppError(
      "Sign-in is not configured yet. See the setup guide.",
      503,
      "NOT_CONFIGURED",
    );
  return auth;
}

export async function currentIdentity() {
  if (!authConfigured()) return { user: null, deleted: false };
  const { data: session, error } = await getAuth().getSession();
  if (error)
    throw new AppError(
      "Could not check your session. Please try again.",
      503,
      "AUTH_UNAVAILABLE",
    );
  if (!session?.user) return { user: null, deleted: false };
  const user = await syncIdentity(session.user);
  return {
    user: user && { ...user, avatarUrl: googleAvatarUrl(session.user.image) },
    deleted: user === null,
  };
}

function googleAvatarUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.origin === "https://lh3.googleusercontent.com" &&
      !url.username &&
      !url.password
    ) {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}
export async function currentUser() {
  return (await currentIdentity()).user;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("Sign in to continue.", 401, "UNAUTHORIZED");
  return user;
}
