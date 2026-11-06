// Contract fake for managed Auth session reads. Never imported by application code.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const url = process.env.TEST_DATABASE_URL;
if (
  process.env.GLOBEALBUM_AUTH_TEST_STUB !== "1" ||
  !url ||
  new URL(url).hostname !== "127.0.0.1" ||
  !new URL(url).pathname.endsWith("_test")
)
  throw new Error("Auth fake requires an isolated local test database.");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const sessions = new Map<string, string>();
createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/health") {
    res.end("{}");
    return;
  }
  if (req.url === "/auth/sign-in/email") {
    res.writeHead(401).end(
      JSON.stringify({
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      }),
    );
    return;
  }
  if (req.url === "/test/session" && req.method === "POST") {
    let body = "";
    for await (const part of req) body += part;
    const { userId } = JSON.parse(body);
    if (!(await db.user.findUnique({ where: { id: userId } }))) {
      res.writeHead(404).end("{}");
      return;
    }
    const token = randomUUID();
    sessions.set(token, userId);
    res.end(JSON.stringify({ token }));
    return;
  }
  const token = /(?:^|;\s*)__Secure-neon-auth\.session_token=([^;]+)/.exec(
    req.headers.cookie || "",
  )?.[1];
  const userId = token ? sessions.get(token) : undefined;
  if (req.url?.startsWith("/auth/list-accounts")) {
    if (!userId) {
      res.writeHead(401).end("{}");
      return;
    }
    res.end(JSON.stringify([{ providerId: "credential" }]));
    return;
  }
  if (req.url === "/auth/link-social") {
    res.writeHead(userId ? 503 : 401).end(
      JSON.stringify({
        code: userId ? "PROVIDER_UNAVAILABLE" : "UNAUTHORIZED",
        message: userId
          ? "Provider unavailable in local contract fake."
          : "Sign in first.",
      }),
    );
    return;
  }
  if (req.url?.startsWith("/auth/get-session")) {
    const user = userId
      ? await db.user.findUnique({ where: { id: userId } })
      : null;
    res.end(
      JSON.stringify(
        user
          ? {
              user,
              session: {
                id: token,
                token,
                userId,
                expiresAt: new Date(Date.now() + 3_600_000),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            }
          : null,
      ),
    );
    return;
  }
  if (req.url === "/auth/sign-out") {
    if (token) sessions.delete(token);
    res.setHeader(
      "Set-Cookie",
      "__Secure-neon-auth.session_token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    res.end('{"success":true}');
    return;
  }
  res.writeHead(404).end("{}");
}).listen(8788, "127.0.0.1");
