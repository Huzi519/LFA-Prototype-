import type { Prisma, PrismaClient } from "@/generated/prisma";
import { db } from "@/lib/db";

// In-app notifications only (CLAUDE.md "Out of scope": no SMS/push/email
// delivery). `tx` lets callers create a notification inside the same
// Prisma transaction as the state change that triggered it.

export async function notify(
  userId: string,
  message: string,
  link?: string,
  tx: PrismaClient | Prisma.TransactionClient = db
): Promise<void> {
  await tx.notification.create({
    data: { userId, message, link },
  });
}
