"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { sendMessage } from "@/lib/actions/conversations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCents, formatDateTime } from "@/lib/format";
import { ProposalComposer } from "./proposal-composer";
import { MarkAsHiredDialog } from "@/app/company/messages/[id]/mark-as-hired-dialog";

export type ChatMessage = {
  id: string;
  senderId: string;
  kind: "TEXT" | "PROPOSAL" | "SYSTEM";
  body: string;
  proposalTitle: string | null;
  proposalDescription: string | null;
  proposalBudget: number | null;
  createdAt: string; // ISO
};

const POLL_INTERVAL_MS = 3000;

export function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
  companyControls,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  /**
   * Only passed by the company's conversation page, and only while the
   * worker hasn't been marked as hired yet. Rendering these controls here
   * (rather than in the server-rendered page) means "Mark as hired"
   * prefills from whichever proposal is newest in this component's own
   * live, polled state — never a stale snapshot from the initial page
   * load. Server → Client props can't carry functions, so this is the
   * only way for the hire dialog to see live data.
   */
  companyControls?: { defaultTrade: string; defaultState: string };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string>(
    initialMessages.at(-1)?.createdAt ?? new Date(0).toISOString()
  );

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages?after=${encodeURIComponent(lastTimestampRef.current)}`
        );
        if (!res.ok) return;
        const data: { messages: ChatMessage[] } = await res.json();
        if (data.messages.length === 0) return;
        setMessages((prev) => [...prev, ...data.messages]);
        lastTimestampRef.current = data.messages.at(-1)!.createdAt;
      } catch {
        // Silently retry on the next tick — this is a demo polling loop,
        // not a critical channel.
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const latestProposal = useMemo(
    () => [...messages].reverse().find((m) => m.kind === "PROPOSAL") ?? null,
    [messages]
  );

  function handleSend() {
    if (!draft.trim()) return;
    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("body", draft);
    setDraft("");
    startTransition(async () => {
      await sendMessage(undefined, formData);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {companyControls && (
        <div className="flex justify-end gap-2">
          <ProposalComposer conversationId={conversationId} />
          <MarkAsHiredDialog
            conversationId={conversationId}
            defaultTrade={companyControls.defaultTrade}
            defaultState={companyControls.defaultState}
            latestProposal={
              latestProposal
                ? {
                    title: latestProposal.proposalTitle,
                    description: latestProposal.proposalDescription,
                    budget: latestProposal.proposalBudget,
                  }
                : null
            }
          />
        </div>
      )}

      <div className="bg-muted/30 max-h-96 min-h-48 space-y-3 overflow-y-auto rounded-md border p-4">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-center text-sm">
            No messages yet — say hello.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message…"
          rows={2}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={pending || !draft.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  if (message.kind === "SYSTEM") {
    return (
      <p className="text-muted-foreground text-center text-xs">{message.body}</p>
    );
  }

  if (message.kind === "PROPOSAL") {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="bg-background max-w-sm rounded-lg border-2 border-primary/30 p-3 shadow-sm">
          <Badge className="mb-1">Proposal</Badge>
          <p className="font-medium">{message.proposalTitle}</p>
          <p className="text-muted-foreground text-sm">{message.proposalDescription}</p>
          {message.proposalBudget != null && (
            <p className="mt-1 font-medium">{formatCents(message.proposalBudget)}</p>
          )}
          <p className="text-muted-foreground mt-1 text-xs">
            {formatDateTime(new Date(message.createdAt))}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-sm rounded-lg px-3 py-2 text-sm ${
          isOwn ? "bg-primary text-primary-foreground" : "bg-background border"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p
          className={`mt-1 text-[10px] ${
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {formatDateTime(new Date(message.createdAt))}
        </p>
      </div>
    </div>
  );
}
