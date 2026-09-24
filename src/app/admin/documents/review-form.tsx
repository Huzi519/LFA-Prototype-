"use client";

import { useState, useActionState } from "react";
import { reviewDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ReviewForm({ documentId }: { documentId: string }) {
  const [state, formAction, pending] = useActionState(reviewDocument, undefined);
  const [showRejectNote, setShowRejectNote] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="documentId" value={documentId} />
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {showRejectNote && (
        <Textarea
          name="reviewNote"
          placeholder="Reason for rejection (shown to the uploader only)"
          rows={2}
          required
        />
      )}

      <div className="flex gap-2">
        {!showRejectNote ? (
          <>
            <Button
              type="submit"
              name="decision"
              value="APPROVE"
              size="sm"
              disabled={pending}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRejectNote(true)}
            >
              Reject
            </Button>
          </>
        ) : (
          <>
            <Button
              type="submit"
              name="decision"
              value="REJECT"
              variant="destructive"
              size="sm"
              disabled={pending}
            >
              Confirm rejection
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectNote(false)}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
