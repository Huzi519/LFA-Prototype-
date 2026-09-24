import { describe, it, expect } from "vitest";
import {
  effectiveCredentialStatus,
  hasRequiredCredentials,
  canWorkerTakeJob,
  daysUntilExpiry,
  isExpired,
  isNearingExpiry,
} from "./credentials";
import { CredentialStatus, Trade, AustralianState } from "@/generated/prisma";

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

describe("effectiveCredentialStatus", () => {
  it("returns the stored status when unexpired", () => {
    expect(
      effectiveCredentialStatus({
        status: CredentialStatus.APPROVED,
        expiryDate: future,
      })
    ).toBe(CredentialStatus.APPROVED);
  });

  it("returns EXPIRED once expiryDate has passed, regardless of stored status", () => {
    expect(
      effectiveCredentialStatus({
        status: CredentialStatus.APPROVED,
        expiryDate: past,
      })
    ).toBe(CredentialStatus.EXPIRED);
  });

  it("returns the stored status when there is no expiryDate", () => {
    expect(
      effectiveCredentialStatus({
        status: CredentialStatus.PENDING,
        expiryDate: null,
      })
    ).toBe(CredentialStatus.PENDING);
  });
});

describe("hasRequiredCredentials", () => {
  it("is false when a required credential type is missing", () => {
    expect(hasRequiredCredentials(Trade.LABOURER, [])).toBe(false);
  });

  it("is true once every required type has an approved, unexpired credential", () => {
    expect(
      hasRequiredCredentials(Trade.LABOURER, [
        { type: "WHITE_CARD", status: CredentialStatus.APPROVED, expiryDate: future },
      ])
    ).toBe(true);
  });

  it("ignores an expired credential even if stored as APPROVED", () => {
    expect(
      hasRequiredCredentials(Trade.LABOURER, [
        { type: "WHITE_CARD", status: CredentialStatus.APPROVED, expiryDate: past },
      ])
    ).toBe(false);
  });
});

describe("canWorkerTakeJob", () => {
  const plumberInNsw = { primaryTrade: Trade.PLUMBER, otherTrades: "[]" };
  const job = { trade: Trade.PLUMBER, state: AustralianState.NSW };

  it("rejects a worker who doesn't do the job's trade", () => {
    const result = canWorkerTakeJob(
      { primaryTrade: Trade.CARPENTER, otherTrades: "[]" },
      job,
      []
    );
    expect(result.allowed).toBe(false);
  });

  it("rejects when the trade licence is issued in a different state", () => {
    const result = canWorkerTakeJob(plumberInNsw, job, [
      {
        type: "TRADE_LICENCE",
        status: CredentialStatus.APPROVED,
        expiryDate: future,
        trade: Trade.PLUMBER,
        issuingState: AustralianState.VIC,
      },
      { type: "WHITE_CARD", status: CredentialStatus.APPROVED, expiryDate: future, trade: null, issuingState: null },
      { type: "PUBLIC_LIABILITY", status: CredentialStatus.APPROVED, expiryDate: future, trade: null, issuingState: null },
    ]);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/licence/);
  });

  it("allows when the trade licence matches the job's state and other credentials are approved", () => {
    const result = canWorkerTakeJob(plumberInNsw, job, [
      {
        type: "TRADE_LICENCE",
        status: CredentialStatus.APPROVED,
        expiryDate: future,
        trade: Trade.PLUMBER,
        issuingState: AustralianState.NSW,
      },
      { type: "WHITE_CARD", status: CredentialStatus.APPROVED, expiryDate: future, trade: null, issuingState: null },
      { type: "PUBLIC_LIABILITY", status: CredentialStatus.APPROVED, expiryDate: future, trade: null, issuingState: null },
    ]);
    expect(result.allowed).toBe(true);
  });

  it("rejects once the state-matched licence has expired", () => {
    const result = canWorkerTakeJob(plumberInNsw, job, [
      {
        type: "TRADE_LICENCE",
        status: CredentialStatus.APPROVED,
        expiryDate: past,
        trade: Trade.PLUMBER,
        issuingState: AustralianState.NSW,
      },
      { type: "WHITE_CARD", status: CredentialStatus.APPROVED, expiryDate: future, trade: null, issuingState: null },
      { type: "PUBLIC_LIABILITY", status: CredentialStatus.APPROVED, expiryDate: future, trade: null, issuingState: null },
    ]);
    expect(result.allowed).toBe(false);
  });
});

describe("daysUntilExpiry / isExpired / isNearingExpiry", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("counts whole days remaining", () => {
    expect(daysUntilExpiry(new Date("2026-01-15T00:00:00Z"), now)).toBe(14);
  });

  it("is negative once the date has passed", () => {
    expect(daysUntilExpiry(new Date("2025-12-20T00:00:00Z"), now)).toBe(-12);
  });

  it("isExpired matches a negative day count", () => {
    expect(isExpired(new Date("2025-12-31T00:00:00Z"), now)).toBe(true);
    expect(isExpired(new Date("2026-01-02T00:00:00Z"), now)).toBe(false);
  });

  it("isNearingExpiry is true inside the warning window, false outside it", () => {
    // CREDENTIAL_EXPIRY_WARNING_DAYS defaults to 30 (src/lib/rules/config.ts)
    expect(isNearingExpiry(new Date("2026-01-20T00:00:00Z"), now)).toBe(true);
    expect(isNearingExpiry(new Date("2026-03-01T00:00:00Z"), now)).toBe(false);
  });

  it("isNearingExpiry is false once already expired", () => {
    expect(isNearingExpiry(new Date("2025-12-01T00:00:00Z"), now)).toBe(false);
  });
});
