"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/actions/conversations";
import { Button } from "@/components/ui/button";

export function MessageButton({ workerId }: { workerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="hivis"
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await getOrCreateConversation(workerId);
          if (result.conversationId) {
            router.push(`/company/messages/${result.conversationId}`);
          }
        })
      }
    >
      {pending ? "Opening…" : "Message this worker"}
    </Button>
  );
}
