import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma";

// Resets the database to a known, deterministic state before the e2e suite
// runs, so the happy-path test can rely on exact seed data (specific
// emails, trades, states) instead of discovering IDs at runtime. Wipes via
// Prisma rather than deleting the SQLite file directly — the file can be
// locked by an already-running dev server (Playwright's webServer reuses
// one in local dev), and deleteMany doesn't need exclusive access.
export default async function globalSetup() {
  const db = new PrismaClient();
  try {
    // Children before parents, respecting foreign keys. Conversation.jobId
    // points at Job, so conversations must go before jobs; File is
    // referenced by Credential/Document, so it goes after both.
    await db.notification.deleteMany();
    await db.escrowEvent.deleteMany();
    await db.escrowTransaction.deleteMany();
    await db.dispute.deleteMany();
    await db.document.deleteMany();
    await db.message.deleteMany();
    await db.conversation.deleteMany();
    await db.job.deleteMany();
    await db.credential.deleteMany();
    await db.file.deleteMany();
    await db.workerProfile.deleteMany();
    await db.companyProfile.deleteMany();
    await db.user.deleteMany();
  } finally {
    await db.$disconnect();
  }

  execSync("npx prisma db seed", { stdio: "inherit" });
}
