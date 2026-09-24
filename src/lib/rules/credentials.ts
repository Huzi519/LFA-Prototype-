import type { Credential, Job, WorkerProfile } from "@/generated/prisma";
import { CredentialStatus } from "@/generated/prisma";
import { requiredCredentialsFor } from "./requiredCredentials";
import { CREDENTIAL_EXPIRY_WARNING_DAYS } from "./config";

/**
 * A credential with a past expiryDate is treated as EXPIRED regardless of
 * its stored status — computed at read time (see CLAUDE.md "Expiry").
 * The nightly `check-expiry` script persists this so notifications fire,
 * but every read path must apply this function rather than trust the
 * stored column, since the script may not have run yet.
 */
export function effectiveCredentialStatus(
  credential: Pick<Credential, "status" | "expiryDate">
): CredentialStatus {
  if (
    credential.expiryDate &&
    credential.expiryDate.getTime() < Date.now()
  ) {
    return CredentialStatus.EXPIRED;
  }
  return credential.status;
}

export function isCredentialApproved(
  credential: Pick<Credential, "status" | "expiryDate">
): boolean {
  return effectiveCredentialStatus(credential) === CredentialStatus.APPROVED;
}

/**
 * True once every credential type required for the worker's trade has at
 * least one APPROVED, unexpired credential on file.
 */
export function hasRequiredCredentials(
  trade: WorkerProfile["primaryTrade"],
  credentials: Pick<Credential, "type" | "status" | "expiryDate">[]
): boolean {
  const required = requiredCredentialsFor(trade);
  return required.every((type) =>
    credentials.some((c) => c.type === type && isCredentialApproved(c))
  );
}

/**
 * Whole days remaining until expiryDate (negative once it's in the past).
 * Used by the `check-expiry` script — kept as a pure function so the
 * expiry-window decision is unit-testable without touching the database.
 */
export function daysUntilExpiry(expiryDate: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((expiryDate.getTime() - now.getTime()) / msPerDay);
}

export function isExpired(expiryDate: Date, now: Date = new Date()): boolean {
  return daysUntilExpiry(expiryDate, now) < 0;
}

/** True once a credential is inside its expiry-warning window but not yet expired. */
export function isNearingExpiry(expiryDate: Date, now: Date = new Date()): boolean {
  const days = daysUntilExpiry(expiryDate, now);
  return days >= 0 && days <= CREDENTIAL_EXPIRY_WARNING_DAYS;
}

export type EligibilityResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Whether a worker can quote on / take a given job. A TRADE_LICENCE only
 * counts in the state that issued it (CLAUDE.md "Licences are state-based").
 */
export function canWorkerTakeJob(
  worker: Pick<WorkerProfile, "primaryTrade" | "otherTrades">,
  job: Pick<Job, "trade" | "state">,
  credentials: Pick<
    Credential,
    "type" | "status" | "expiryDate" | "trade" | "issuingState"
  >[]
): EligibilityResult {
  const otherTrades: string[] = JSON.parse(worker.otherTrades || "[]");
  const worksTrade =
    worker.primaryTrade === job.trade || otherTrades.includes(job.trade);

  if (!worksTrade) {
    return { allowed: false, reason: "Not registered for this trade." };
  }

  const required = requiredCredentialsFor(job.trade);
  if (!required.includes("TRADE_LICENCE")) {
    // Trade doesn't require a licence (e.g. carpenter, labourer) — the
    // general hasRequiredCredentials check below covers it.
    if (!hasRequiredCredentials(job.trade, credentials)) {
      return {
        allowed: false,
        reason: "Missing a required, approved credential for this trade.",
      };
    }
    return { allowed: true };
  }

  const hasStateLicence = credentials.some(
    (c) =>
      c.type === "TRADE_LICENCE" &&
      c.trade === job.trade &&
      c.issuingState === job.state &&
      isCredentialApproved(c)
  );

  if (!hasStateLicence) {
    return {
      allowed: false,
      reason: `No approved, unexpired trade licence for ${job.trade} issued in ${job.state}.`,
    };
  }

  if (!hasRequiredCredentials(job.trade, credentials)) {
    return {
      allowed: false,
      reason: "Missing a required, approved credential for this trade.",
    };
  }

  return { allowed: true };
}
