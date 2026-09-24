// Abstraction over the payment backend so a real provider (Stripe Connect
// or Zai — see CLAUDE.md "Open Questions") can replace MockPaymentProvider
// later without touching the escrow state machine or Server Actions.

export type PaymentResult = {
  providerRef: string;
};

export interface PaymentProvider {
  /** Company funds the job; money is held by the platform. */
  createHold(params: {
    jobId: string;
    amountCents: number;
  }): Promise<PaymentResult>;

  /** Converts a hold into a captured charge (called when funding completes). */
  capture(params: { providerRef: string }): Promise<PaymentResult>;

  /** Pays the worker out after approval/auto-release/dispute resolution. */
  release(params: {
    providerRef: string;
    payoutCents: number;
  }): Promise<PaymentResult>;

  /** Returns funds to the company (cancel, or dispute resolved as refund). */
  refund(params: { providerRef: string }): Promise<PaymentResult>;
}
