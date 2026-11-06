import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { PrismaClient } from "@/generated/prisma/client";
import { AppError } from "./errors";

const globalDb = globalThis as unknown as { database?: PrismaClient };
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new AppError(
      "Database is not configured. Follow the setup guide.",
      503,
      "NOT_CONFIGURED",
    );
  if (!globalDb.database) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 15_000,
    });
    if (process.env.VERCEL) attachDatabasePool(pool);
    globalDb.database = new PrismaClient({
      adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    });
  }
  return globalDb.database;
}
