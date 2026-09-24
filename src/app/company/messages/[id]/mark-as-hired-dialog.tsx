"use client";

import { useState, useActionState } from "react";
import { markAsHired } from "@/lib/actions/conversations";
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

const TRADES = ["PLUMBER", "ELECTRICIAN", "CARPENTER", "LABOURER"] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

export function MarkAsHiredDialog({
  conversationId,
  defaultTrade,
  defaultState,
  latestProposal,
}: {
  conversationId: string;
  defaultTrade: string;
  defaultState: string;
  latestProposal: {
    title: string | null;
    description: string | null;
    budget: number | null;
  } | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(markAsHired, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        Mark as hired
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm hire</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="conversationId" value={conversationId} />
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="hire-title">Job title</Label>
            <Input
              id="hire-title"
              name="title"
              defaultValue={latestProposal?.title ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire-description">Description</Label>
            <Textarea
              id="hire-description"
              name="description"
              rows={4}
              defaultValue={latestProposal?.description ?? ""}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hire-trade">Trade</Label>
              <select
                id="hire-trade"
                name="trade"
                defaultValue={defaultTrade}
                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {TRADES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hire-state">State</Label>
              <select
                id="hire-state"
                name="state"
                defaultValue={defaultState}
                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hire-postcode">Postcode</Label>
              <Input id="hire-postcode" name="postcode" maxLength={4} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hire-startDate">Start date</Label>
              <Input id="hire-startDate" name="startDate" type="date" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire-budget">Budget (AUD)</Label>
            <Input
              id="hire-budget"
              name="budgetDollars"
              type="number"
              min={1}
              step="0.01"
              defaultValue={
                latestProposal?.budget != null ? latestProposal.budget / 100 : undefined
              }
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Confirming…" : "Confirm hire"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
