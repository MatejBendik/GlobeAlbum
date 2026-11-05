import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
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
  if (!globalDb.database)
    globalDb.database = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 5,
      }),
    });
  return globalDb.database;
}
