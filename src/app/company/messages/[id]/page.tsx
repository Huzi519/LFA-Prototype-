import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { ChatThread } from "@/components/chat/chat-thread";
import { ConversationDocuments } from "@/components/conversation-documents";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{conversation.worker.fullName}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {conversation.worker.primaryTrade} · {conversation.worker.homeState}
            </p>
          </div>
          {conversation.job && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{conversation.job.status}</Badge>
              <Link
                href={`/company/jobs/${conversation.job.id}`}
                className="text-sm underline underline-offset-4"
              >
                View job
              </Link>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {conversation.job
              ? "This worker has been hired for the job above."
              : "Not hired yet — negotiate the work below, then mark as hired when you're ready."}
          </p>
        </CardContent>
      </Card>

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
