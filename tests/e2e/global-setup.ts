import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

export default async function setup() {
  const database = process.env.TEST_DATABASE_URL;
  if (
    !database ||
    new URL(database).hostname !== "127.0.0.1" ||
    !new URL(database).pathname.endsWith("_test")
  )
    throw new Error(
      "Browser setup can only reset an isolated local *_test database.",
    );
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL!,
        DIRECT_URL: process.env.TEST_DATABASE_URL!,
      },
      stdio: "pipe",
    },
  );
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: database }),
  });
  try {
    await db.$executeRaw`TRUNCATE TABLE "User", "CleanupJob", "RetiredUsername", "Usage", "MonthlyUsage", "RequestWindow", "RateLimit" CASCADE`;
  } finally {
    await db.$disconnect();
  }
}
