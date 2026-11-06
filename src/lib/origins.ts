// Share the exact allowlist between the Next API and image Worker.
export function isAllowedAppOrigin(
  origin: string | null,
  configured: string | undefined,
) {
  if (!origin || !configured) return false;
  try {
    const app = new URL(configured);
    if (origin === app.origin) return true;
    const incoming = new URL(origin);
    const loopback = new Set(["localhost", "127.0.0.1"]);
    return (
      app.protocol === "http:" &&
      incoming.protocol === app.protocol &&
      loopback.has(app.hostname) &&
      loopback.has(incoming.hostname) &&
      incoming.port === app.port &&
      origin === incoming.origin
    );
  } catch {
    return false;
  }
}
