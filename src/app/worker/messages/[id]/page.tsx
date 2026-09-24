import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { ChatThread } from "@/components/chat/chat-thread";
import { ConversationDocuments } from "@/components/conversation-documents";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function WorkerConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      company: true,
      job: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation || conversation.workerId !== profile.id) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{conversation.company.companyName}</CardTitle>
          {conversation.job && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{conversation.job.status}</Badge>
              <Link
                href={`/worker/jobs/${conversation.job.id}`}
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
              ? "You've been hired for the job above."
              : "Negotiate the work here — the company will mark you as hired once you agree on the details."}
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
      />

      <ConversationDocuments conversationId={conversation.id} viewerUserId={user.id} />
    </div>
  );
}
