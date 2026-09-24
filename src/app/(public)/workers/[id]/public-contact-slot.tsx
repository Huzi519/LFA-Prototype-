"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrCreateConversation } from "@/lib/actions/conversations";
import { Button } from "@/components/ui/button";

export function PublicContactSlot({
  workerId,
  isCompany,
}: {
  workerId: string;
  isCompany: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!isCompany) {
    return (
      <Button
        nativeButton={false}
        render={<Link href="/register?tab=company" />}
      >
        Contact this worker
      </Button>
    );
  }

  return (
    <Button
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
      {pending ? "Opening…" : "Contact this worker"}
    </Button>
  );
}
