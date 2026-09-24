import "dotenv/config";
import { PrismaClient, CredentialStatus, ProfileStatus } from "../src/generated/prisma";
import {
  isExpired,
  isNearingExpiry,
  daysUntilExpiry,
  hasRequiredCredentials,
} from "../src/lib/rules/credentials";
import { notify } from "../src/lib/notifications";
import { CREDENTIAL_EXPIRY_WARNING_DAYS } from "../src/lib/rules/config";

// CLAUDE.md "Expiry": run nightly (or on demand) via `npm run check-expiry`.
// Flips overdue credentials to EXPIRED, warns workers inside the expiry
// window, and hides any LIVE profile that no longer meets its trade's
// required-credential set as a result.

const db = new PrismaClient();

function credentialLabel(type: string): string {
  return type.replace(/_/g, " ").toLowerCase();
}

async function main() {
  const now = new Date();

  const credentials = await db.credential.findMany({
    where: { expiryDate: { not: null } },
    include: { worker: true },
  });

  let expiredCount = 0;
  let warnedCount = 0;
  const affectedWorkerIds = new Set<string>();

  for (const cred of credentials) {
    if (!cred.expiryDate) continue;

    if (isExpired(cred.expiryDate, now)) {
      if (cred.status !== CredentialStatus.EXPIRED) {
        await db.credential.update({
          where: { id: cred.id },
          data: { status: CredentialStatus.EXPIRED },
        });
        expiredCount++;
        affectedWorkerIds.add(cred.workerId);
        await notify(
          cred.worker.userId,
          `Your ${credentialLabel(cred.type)} credential has expired.`,
          "/worker/onboarding"
        );
      }
      continue;
    }

    if (isNearingExpiry(cred.expiryDate, now) && cred.status === CredentialStatus.APPROVED) {
      // Dedup: don't re-warn if we already sent a warning for this exact
      // credential within the warning window (avoids spam on repeat runs).
      const alreadyWarned = await db.notification.findFirst({
        where: {
          userId: cred.worker.userId,
          link: "/worker/onboarding",
          message: { contains: credentialLabel(cred.type) },
          createdAt: {
            gte: new Date(now.getTime() - CREDENTIAL_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      });
      if (!alreadyWarned) {
        const days = daysUntilExpiry(cred.expiryDate, now);
        await notify(
          cred.worker.userId,
          `Your ${credentialLabel(cred.type)} credential expires in ${days} day${days === 1 ? "" : "s"} — renew it soon.`,
          "/worker/onboarding"
        );
        warnedCount++;
      }
    }
  }

  // A required credential expiring can knock a LIVE profile out of
  // eligibility (CLAUDE.md: "the profile is set to HIDDEN").
  let hiddenCount = 0;
  for (const workerId of affectedWorkerIds) {
    const worker = await db.workerProfile.findUnique({
      where: { id: workerId },
      include: { credentials: true },
    });
    if (!worker || worker.profileStatus !== ProfileStatus.LIVE) continue;

    if (!hasRequiredCredentials(worker.primaryTrade, worker.credentials)) {
      await db.workerProfile.update({
        where: { id: worker.id },
        data: { profileStatus: ProfileStatus.HIDDEN },
      });
      hiddenCount++;
      await notify(
        worker.userId,
        "A required credential expired, so your profile is now hidden until it's renewed.",
        "/worker/onboarding"
      );
    }
  }

  console.log(
    `check-expiry: ${expiredCount} credential(s) marked EXPIRED, ${warnedCount} expiry warning(s) sent, ${hiddenCount} profile(s) hidden.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
