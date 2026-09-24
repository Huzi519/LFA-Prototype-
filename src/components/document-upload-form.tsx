"use client";

import { useActionState } from "react";
import { uploadDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CATEGORIES = [
  "CONTRACT",
  "DRAWING",
  "SCOPE",
  "SWMS",
  "INDUCTION",
  "PROOF_OF_COMPLETION",
  "OTHER",
] as const;

export function DocumentUploadForm({ conversationId }: { conversationId: string }) {
  const [state, formAction, pending] = useActionState(uploadDocument, undefined);

  return (
    <form action={formAction} className="space-y-3 rounded-md border p-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="doc-category">Category</Label>
          <select
            id="doc-category"
            name="category"
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-file">File (PDF, JPG or PNG)</Label>
          <Input
            id="doc-file"
            name="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        An admin reviews every document before the other party can see it.
      </p>
    </form>
  );
}
