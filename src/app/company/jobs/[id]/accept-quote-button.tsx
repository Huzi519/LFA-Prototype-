"use client";

import { useActionState } from "react";
import { acceptQuote } from "./actions";
import { Button } from "@/components/ui/button";

export function AcceptQuoteButton({
  jobId,
  quoteId,
}: {
  jobId: string;
  quoteId: string;
}) {
  const [state, formAction, pending] = useActionState(acceptQuote, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Hiring…" : "Accept & hire"}
      </Button>
      {state?.error && (
        <p className="text-destructive mt-1 text-xs">{state.error}</p>
      )}
    </form>
  );
}
