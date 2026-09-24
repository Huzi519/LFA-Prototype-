import type { EscrowTransaction } from "@/generated/prisma";
import { EscrowStatus, Role } from "@/generated/prisma";
import { PLATFORM_FEE_PERCENT } from "./config";

// See CLAUDE.md "Escrow State Machine" for the diagram this implements.
// Any transition not listed here throws — this is the single place escrow
// status can change, so the whole app's escrow logic stays auditable.

export type EscrowAction =
  | "fund"
  | "start"
  | "submitProof"
  | "approve"
  | "autoRelease"
  | "reject"
  | "raiseDispute"
  | "resolveRelease"
  | "resolveRefund"
  | "cancel";

export type Actor = { id: string; role: Role };

export class EscrowTransitionError extends Error {}

type TransitionRule = {
  from: EscrowStatus[];
  to: EscrowStatus;
  allowedRoles: Role[];
};

const RULES: Record<EscrowAction, TransitionRule> = {
  fund: {
    from: [EscrowStatus.AWAITING_FUNDING],
    to: EscrowStatus.FUNDED,
    allowedRoles: [Role.COMPANY],
  },
  start: {
    from: [EscrowStatus.FUNDED],
    to: EscrowStatus.IN_PROGRESS,
    allowedRoles: [Role.WORKER],
  },
  submitProof: {
    from: [EscrowStatus.IN_PROGRESS],
    to: EscrowStatus.PROOF_SUBMITTED,
    allowedRoles: [Role.WORKER],
  },
  approve: {
    from: [EscrowStatus.PROOF_SUBMITTED],
    to: EscrowStatus.RELEASED,
    allowedRoles: [Role.COMPANY],
  },
  autoRelease: {
    from: [EscrowStatus.PROOF_SUBMITTED],
    to: EscrowStatus.RELEASED,
    allowedRoles: [Role.ADMIN], // run by the auto-release script acting as system/admin
  },
  reject: {
    from: [EscrowStatus.PROOF_SUBMITTED],
    to: EscrowStatus.IN_PROGRESS,
    allowedRoles: [Role.COMPANY],
  },
  raiseDispute: {
    from: [
      EscrowStatus.FUNDED,
      EscrowStatus.IN_PROGRESS,
      EscrowStatus.PROOF_SUBMITTED,
    ],
    to: EscrowStatus.DISPUTED,
    allowedRoles: [Role.COMPANY, Role.WORKER],
  },
  resolveRelease: {
    from: [EscrowStatus.DISPUTED],
    to: EscrowStatus.RELEASED,
    allowedRoles: [Role.ADMIN],
  },
  resolveRefund: {
    from: [EscrowStatus.DISPUTED],
    to: EscrowStatus.REFUNDED,
    allowedRoles: [Role.ADMIN],
  },
  cancel: {
    from: [EscrowStatus.AWAITING_FUNDING, EscrowStatus.FUNDED],
    to: EscrowStatus.REFUNDED,
    allowedRoles: [Role.COMPANY],
  },
};

export type TransitionResult = {
  toStatus: EscrowStatus;
  timestampField:
    | "fundedAt"
    | "startedAt"
    | "proofSubmittedAt"
    | "releasedAt"
    | "refundedAt"
    | null;
};

/**
 * Validates and returns the outcome of applying `action` to `escrow` as
 * `actor`. Throws EscrowTransitionError for any disallowed transition or
 * role. Callers persist the new status, the matching timestamp, and an
 * append-only EscrowEvent row inside the same DB transaction.
 */
export function transition(
  escrow: Pick<EscrowTransaction, "status">,
  action: EscrowAction,
  actor: Actor
): TransitionResult {
  const rule = RULES[action];
  if (!rule) {
    throw new EscrowTransitionError(`Unknown escrow action "${action}".`);
  }

  if (!rule.allowedRoles.includes(actor.role)) {
    throw new EscrowTransitionError(
      `Role ${actor.role} is not permitted to perform "${action}".`
    );
  }

  if (!rule.from.includes(escrow.status)) {
    throw new EscrowTransitionError(
      `Cannot "${action}" an escrow in status ${escrow.status}.`
    );
  }

  const timestampField: TransitionResult["timestampField"] =
    rule.to === EscrowStatus.FUNDED
      ? "fundedAt"
      : rule.to === EscrowStatus.IN_PROGRESS && action === "start"
        ? "startedAt"
        : rule.to === EscrowStatus.PROOF_SUBMITTED
          ? "proofSubmittedAt"
          : rule.to === EscrowStatus.RELEASED
            ? "releasedAt"
            : rule.to === EscrowStatus.REFUNDED
              ? "refundedAt"
              : null;

  return { toStatus: rule.to, timestampField };
}

/** Cents in, cents out — never floats (CLAUDE.md "Money is stored as integer cents"). */
export function calculateFeeAndPayout(amountCents: number): {
  platformFee: number;
  workerPayout: number;
} {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error("amountCents must be a non-negative integer.");
  }
  const platformFee = Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
  const workerPayout = amountCents - platformFee;
  return { platformFee, workerPayout };
}
