import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth-server";

const sessionMiddleware = auth.middleware({
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

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Crawler metadata must remain public even when Auth is unavailable.
  if (path === "/robots.txt" || path === "/sitemap.xml") {
    return NextResponse.next();
  }
  // Public embeds must not depend on third-party session cookies or Auth availability.
  if (path.startsWith("/embed/") || path.startsWith("/api/embed/")) {
    return NextResponse.next();
  }
  return sessionMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|webp|jpg)$).*)",
  ],
};
