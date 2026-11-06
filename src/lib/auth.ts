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

export async function currentUser() {
  if (!authConfigured()) return null;
  const { data: session, error } = await getAuth().getSession();
  if (error)
    throw new AppError(
      "Could not check your session. Please try again.",
      503,
      "AUTH_UNAVAILABLE",
    );
  if (!session?.user) return null;
  return syncIdentity(session.user);
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("Sign in to continue.", 401, "UNAUTHORIZED");
  return user;
}
