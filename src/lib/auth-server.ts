import { createNeonAuth } from "@neon/auth/next/server";

export function authConfigured() {
  return [
    "DATABASE_URL",
    "NEON_AUTH_BASE_URL",
    "NEON_AUTH_COOKIE_SECRET",
  ].every((key) => !!process.env[key]);
}

// Keep construction safe during builds without provisioning credentials.
// Requests use authConfigured() before invoking this instance.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://auth.invalid/auth",
  cookies: {
    secret:
      process.env.NEON_AUTH_COOKIE_SECRET ||
      "build-only-placeholder-never-used-for-authentication",
    sessionDataTtl: 60,
  },
});
