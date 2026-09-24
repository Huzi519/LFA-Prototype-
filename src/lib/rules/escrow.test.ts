import { describe, it, expect } from "vitest";
import {
  transition,
  calculateFeeAndPayout,
  EscrowTransitionError,
  type Actor,
} from "./escrow";
import { EscrowStatus, Role } from "@/generated/prisma";

const company: Actor = { id: "c1", role: Role.COMPANY };
const worker: Actor = { id: "w1", role: Role.WORKER };
const admin: Actor = { id: "a1", role: Role.ADMIN };

describe("escrow transition — happy path", () => {
  it("fund: AWAITING_FUNDING -> FUNDED by company", () => {
    const result = transition(
      { status: EscrowStatus.AWAITING_FUNDING },
      "fund",
      company
    );
    expect(result.toStatus).toBe(EscrowStatus.FUNDED);
    expect(result.timestampField).toBe("fundedAt");
  });

  it("start: FUNDED -> IN_PROGRESS by worker", () => {
    const result = transition(
      { status: EscrowStatus.FUNDED },
      "start",
      worker
    );
    expect(result.toStatus).toBe(EscrowStatus.IN_PROGRESS);
    expect(result.timestampField).toBe("startedAt");
  });

  it("submitProof: IN_PROGRESS -> PROOF_SUBMITTED by worker", () => {
    const result = transition(
      { status: EscrowStatus.IN_PROGRESS },
      "submitProof",
      worker
    );
    expect(result.toStatus).toBe(EscrowStatus.PROOF_SUBMITTED);
  });

  it("approve: PROOF_SUBMITTED -> RELEASED by company", () => {
    const result = transition(
      { status: EscrowStatus.PROOF_SUBMITTED },
      "approve",
      company
    );
    expect(result.toStatus).toBe(EscrowStatus.RELEASED);
  });

  it("autoRelease: PROOF_SUBMITTED -> RELEASED (system/admin)", () => {
    const result = transition(
      { status: EscrowStatus.PROOF_SUBMITTED },
      "autoRelease",
      admin
    );
    expect(result.toStatus).toBe(EscrowStatus.RELEASED);
  });

  it("reject: PROOF_SUBMITTED -> IN_PROGRESS by company", () => {
    const result = transition(
      { status: EscrowStatus.PROOF_SUBMITTED },
      "reject",
      company
    );
    expect(result.toStatus).toBe(EscrowStatus.IN_PROGRESS);
  });

  it.each([EscrowStatus.FUNDED, EscrowStatus.IN_PROGRESS, EscrowStatus.PROOF_SUBMITTED])(
    "raiseDispute: %s -> DISPUTED by company or worker",
    (from) => {
      expect(transition({ status: from }, "raiseDispute", company).toStatus).toBe(
        EscrowStatus.DISPUTED
      );
      expect(transition({ status: from }, "raiseDispute", worker).toStatus).toBe(
        EscrowStatus.DISPUTED
      );
    }
  );

  it("resolveRelease: DISPUTED -> RELEASED by admin", () => {
    const result = transition(
      { status: EscrowStatus.DISPUTED },
      "resolveRelease",
      admin
    );
    expect(result.toStatus).toBe(EscrowStatus.RELEASED);
  });

  it("resolveRefund: DISPUTED -> REFUNDED by admin", () => {
    const result = transition(
      { status: EscrowStatus.DISPUTED },
      "resolveRefund",
      admin
    );
    expect(result.toStatus).toBe(EscrowStatus.REFUNDED);
  });

  it.each([EscrowStatus.AWAITING_FUNDING, EscrowStatus.FUNDED])(
    "cancel: %s -> REFUNDED by company",
    (from) => {
      expect(transition({ status: from }, "cancel", company).toStatus).toBe(
        EscrowStatus.REFUNDED
      );
    }
  );
});

describe("escrow transition — disallowed", () => {
  it("throws for a transition not valid from the current status", () => {
    expect(() =>
      transition({ status: EscrowStatus.AWAITING_FUNDING }, "start", worker)
    ).toThrow(EscrowTransitionError);
  });

  it("throws when the wrong role attempts an action", () => {
    expect(() =>
      transition({ status: EscrowStatus.AWAITING_FUNDING }, "fund", worker)
    ).toThrow(EscrowTransitionError);
    expect(() =>
      transition({ status: EscrowStatus.FUNDED }, "start", company)
    ).toThrow(EscrowTransitionError);
    expect(() =>
      transition({ status: EscrowStatus.DISPUTED }, "resolveRelease", company)
    ).toThrow(EscrowTransitionError);
  });

  it("throws for terminal statuses", () => {
    expect(() =>
      transition({ status: EscrowStatus.RELEASED }, "fund", company)
    ).toThrow(EscrowTransitionError);
    expect(() =>
      transition({ status: EscrowStatus.REFUNDED }, "raiseDispute", worker)
    ).toThrow(EscrowTransitionError);
  });

  it("cancel is not allowed once work has started", () => {
    expect(() =>
      transition({ status: EscrowStatus.IN_PROGRESS }, "cancel", company)
    ).toThrow(EscrowTransitionError);
  });

  it("throws for an unknown action", () => {
    expect(() =>
      transition(
        { status: EscrowStatus.FUNDED },
        // @ts-expect-error — deliberately invalid action for the test
        "notAnAction",
        company
      )
    ).toThrow(EscrowTransitionError);
  });
});

describe("calculateFeeAndPayout", () => {
  it("takes the configured platform fee percentage in cents", () => {
    // PLATFORM_FEE_PERCENT defaults to 10 (see src/lib/rules/config.ts)
    expect(calculateFeeAndPayout(100000)).toEqual({
      platformFee: 10000,
      workerPayout: 90000,
    });
  });

  it("rounds the fee rather than producing fractional cents", () => {
    const { platformFee, workerPayout } = calculateFeeAndPayout(9999);
    expect(Number.isInteger(platformFee)).toBe(true);
    expect(Number.isInteger(workerPayout)).toBe(true);
    expect(platformFee + workerPayout).toBe(9999);
  });

  it("rejects non-integer or negative amounts", () => {
    expect(() => calculateFeeAndPayout(100.5)).toThrow();
    expect(() => calculateFeeAndPayout(-100)).toThrow();
  });
});
