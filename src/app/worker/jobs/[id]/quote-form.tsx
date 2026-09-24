"use client";

import { useActionState } from "react";
import { submitQuote } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function QuoteForm({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(submitQuote, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submit a quote</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="jobId" value={jobId} />
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="amountDollars">Your quote (AUD)</Label>
            <Input
              id="amountDollars"
              name="amountDollars"
              type="number"
              min={1}
              step="0.01"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={3} required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit quote"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
