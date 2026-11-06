import "server-only";
import { getDb } from "./db";

function cleanupConfiguration() {
  const key = process.env.NEON_AUTH_ADMIN_API_KEY;
  const project = process.env.NEON_AUTH_PROJECT_ID;
  const branch = process.env.NEON_AUTH_BRANCH_ID;
  const authUrl = process.env.NEON_AUTH_BASE_URL;
  return key && project && branch && authUrl
    ? { key, project, branch, authUrl }
    : null;
}

async function providerIdentityExists(userId: string) {
  // Read-only verification. Neon alone writes its managed authentication schema.
  const [result] = await getDb().$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM neon_auth."user" WHERE id = ${userId}) AS exists
  `;
  return result.exists;
}

export async function completeIdentityDeletion(
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const fence = await db.deletedIdentity.findUnique({ where: { userId } });
  if (!fence || (await db.user.findUnique({ where: { id: userId } })))
    return false;
  if (fence.authDeletedAt) return true;
  const configuration = cleanupConfiguration();
  if (!configuration) return false;
  try {
    if (await providerIdentityExists(userId)) {
      const { key, project, branch, authUrl } = configuration;
      const endpoint = `https://console.neon.tech/api/v2/projects/${encodeURIComponent(project)}/branches/${encodeURIComponent(branch)}/auth`;
      const options = {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store" as const,
        redirect: "error" as const,
        signal: AbortSignal.timeout(8_000),
      };
      const details = await fetch(endpoint, options);
      if (!details.ok) return false;
      const auth = await details.json();
      // Refuse a misconfigured branch before making a destructive API request.
      if (auth.base_url?.replace(/\/$/, "") !== authUrl.replace(/\/$/, ""))
        return false;
      const response = await fetch(
        `${endpoint}/users/${encodeURIComponent(userId)}`,
        {
          ...options,
          method: "DELETE",
        },
      );
      if (!response.ok && response.status !== 404) return false;
      if (await providerIdentityExists(userId)) return false;
    }
    await db.deletedIdentity.update({
      where: { userId },
      data: { authDeletedAt: new Date() },
    });
    return true;
  } catch {
    // Keep durable retry work and the deletion fence. Never log credentials or
    // provider response bodies, and never restore the deleted application user.
    return false;
  }
}

export async function retryIdentityDeletions() {
  if (!cleanupConfiguration()) return { attempted: 0, completed: 0 };
  const pending = await getDb().deletedIdentity.findMany({
    where: { authDeletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 3,
    select: { userId: true },
  });
  let completed = 0;
  for (const { userId } of pending)
    if (await completeIdentityDeletion(userId)) completed++;
  return { attempted: pending.length, completed };
}
