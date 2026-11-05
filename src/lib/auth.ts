import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { getDb } from "./db";
import { AppError } from "./errors";

export function authConfigured() {
  return [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ].every((key) => !!process.env[key]);
}
function createAuth() {
  return betterAuth({
    database: prismaAdapter(getDb(), { provider: "postgresql" }),
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    emailAndPassword: { enabled: false },
    session: { cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    user: { deleteUser: { enabled: false } },
    plugins: [nextCookies()],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!authConfigured())
    throw new AppError(
      "Google sign-in is not configured yet. See the setup guide.",
      503,
      "NOT_CONFIGURED",
    );
  return (instance ??= createAuth());
}
export async function currentUser() {
  if (!authConfigured()) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("Sign in to continue.", 401, "UNAUTHORIZED");
  return user;
}
