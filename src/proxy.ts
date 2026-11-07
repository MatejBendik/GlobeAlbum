import { auth } from "@/lib/auth-server";

export default auth.middleware({
  loginUrl: "/sign-in",
  // Resource-level authorization remains inside every API and Server Action.
  publicRoutes: [
    "/",
    "/demo",
    "/u",
    "/sign-in",
    "/sign-up",
    "/privacy",
    "/terms",
    "/api",
    "/land-dots.json",
    "/atlas-countries.geojson",
  ],
});
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|webp|jpg)$).*)",
  ],
};
