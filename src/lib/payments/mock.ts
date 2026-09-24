import { randomUUID } from "node:crypto";
import type { PaymentProvider, PaymentResult } from "./provider";

// Fake provider for the prototype. The UI's "Pay now" card form is clearly
// labelled TEST MODE (CLAUDE.md "Payment provider") — no real charge ever
// happens here, it just logs and returns a fake reference.
export class MockPaymentProvider implements PaymentProvider {
  private ref(prefix: string): PaymentResult {
    const providerRef = `${prefix}_${randomUUID()}`;
    return { providerRef };
  }

  async createHold(params: {
    jobId: string;
    amountCents: number;
  }): Promise<PaymentResult> {
    console.log("[MockPaymentProvider] createHold", params);
    return this.ref("hold");
  }

  async capture(params: { providerRef: string }): Promise<PaymentResult> {
    console.log("[MockPaymentProvider] capture", params);
    return this.ref("cap");
  }

  async release(params: {
    providerRef: string;
    payoutCents: number;
  }): Promise<PaymentResult> {
    console.log("[MockPaymentProvider] release", params);
    return this.ref("rel");
  }

  async refund(params: { providerRef: string }): Promise<PaymentResult> {
    console.log("[MockPaymentProvider] refund", params);
    return this.ref("ref");
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
