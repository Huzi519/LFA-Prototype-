"use client";

import { useState, useActionState } from "react";
import { sendProposal } from "@/lib/actions/conversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProposalComposer({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(sendProposal, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        Send a proposal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a proposal</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await formAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="conversationId" value={conversationId} />
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="proposal-title">Title</Label>
            <Input id="proposal-title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proposal-description">Description</Label>
            <Textarea id="proposal-description" name="description" rows={4} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proposal-budget">Budget (AUD)</Label>
            <Input
              id="proposal-budget"
              name="budgetDollars"
              type="number"
              min={1}
              step="0.01"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send proposal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
