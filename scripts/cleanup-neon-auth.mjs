// Operator-only cleanup: uses the existing Neon CLI login, never a key in the app.
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import pg from "pg";
config({ path: ".env.local", quiet: true });
if (!process.argv.includes("--confirm"))
  throw new Error(
    "Review pending DeletedIdentity rows first; pass --confirm to delete their managed identities.",
  );
const context = JSON.parse(readFileSync(".neon", "utf8"));
if (!context.projectId || !context.branch || !process.env.DATABASE_URL_UNPOOLED)
  throw new Error(
    "A linked Neon project and direct database URL are required.",
  );
function neon(args) {
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  try {
    return execFileSync("neon", args, options);
  } catch (error) {
    if (error.code === "ENOENT")
      return execFileSync("npx", ["--yes", "neon@latest", ...args], options);
    throw new Error(
      "Neon CLI operation failed; check login and the selected project.",
    );
  }
}
const scope = ["--project-id", context.projectId, "--branch", context.branch];
const selected = new URL(neon(["connection-string", ...scope]).trim());
const direct = new URL(process.env.DATABASE_URL_UNPOOLED);
if (
  selected.hostname.replace("-pooler.", ".") !==
    direct.hostname.replace("-pooler.", ".") ||
  selected.pathname !== direct.pathname
)
  throw new Error("CLI branch and database URL do not match; cleanup refused.");
const db = new pg.Client({ connectionString: direct.toString() });
await db.connect();
try {
  const { rows } = await db.query(
    'SELECT "userId" FROM "DeletedIdentity" WHERE "authDeletedAt" IS NULL ORDER BY "createdAt" LIMIT 30',
  );
  console.log(`Pending managed identities: ${rows.length}`);
  for (const { userId } of rows) {
    const exists = async () =>
      (await db.query('SELECT 1 FROM neon_auth."user" WHERE id = $1', [userId]))
        .rowCount > 0;
    if (await exists()) neon(["neon-auth", "user", "delete", userId, ...scope]);
    if (await exists())
      throw new Error(
        "Neon still reports the identity; pending work retained.",
      );
    await db.query(
      'UPDATE "DeletedIdentity" SET "authDeletedAt" = NOW() WHERE "userId" = $1',
      [userId],
    );
    console.log("Managed identity removed; deletion fence retained.");
  }
} finally {
  await db.end();
}
