import { PrismaClient } from "@/generated/prisma";

// Standard Next.js dev-mode singleton so hot reload doesn't spawn a new
// PrismaClient (and a new SQLite connection) on every edit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
