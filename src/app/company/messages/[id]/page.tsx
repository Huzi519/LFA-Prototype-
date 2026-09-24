import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { ChatThread } from "@/components/chat/chat-thread";
import { ConversationDocuments } from "@/components/conversation-documents";
import { StatusBadge } from "@/components/lfa/status-badge";
import { TradeChip } from "@/components/lfa/trade-chip";

export default async function CompanyConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(Role.COMPANY);
  const company = await db.companyProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      worker: true,
      job: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation || conversation.companyId !== company.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center gap-4 rounded-lg bg-card p-5 ring-1 ring-foreground/10">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-bluestone font-heading text-base font-bold text-primary-foreground">
          {conversation.worker.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="display-md text-2xl">{conversation.worker.fullName}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TradeChip trade={conversation.worker.primaryTrade} />
            <span className="text-muted-foreground text-sm">{conversation.worker.homeState}</span>
            {conversation.job && <StatusBadge status={conversation.job.status} />}
          </div>
        </div>
        {conversation.job ? (
          <Link
            href={`/company/jobs/${conversation.job.id}`}
            className="text-sm font-medium underline underline-offset-4"
          >
            View job
          </Link>
        ) : (
          <p className="text-muted-foreground w-full text-sm sm:w-auto sm:max-w-56 sm:text-right">
            Not hired yet. Agree the work below, then mark as hired.
          </p>
        )}
      </header>

      <ChatThread
        conversationId={conversation.id}
        currentUserId={user.id}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          kind: m.kind,
          body: m.body,
          proposalTitle: m.proposalTitle,
          proposalDescription: m.proposalDescription,
          proposalBudget: m.proposalBudget,
          createdAt: m.createdAt.toISOString(),
        }))}
        companyControls={
          conversation.job
            ? undefined
            : {
                defaultTrade: conversation.worker.primaryTrade,
                defaultState: conversation.worker.homeState,
              }
        }
      />

      <ConversationDocuments conversationId={conversation.id} viewerUserId={user.id} />
    </div>
  );
}
