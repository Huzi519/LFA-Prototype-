import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatDateTime } from "@/lib/format";
import { ConversationList } from "@/components/lfa/conversation-list";
import { PageHeader } from "@/components/lfa/page-header";

export default async function WorkerMessagesPage() {
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const conversations = await db.conversation.findMany({
    where: { workerId: profile.id },
    include: {
      company: true,
      job: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Messages" lede="Your conversations with companies." />

      {conversations.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
            No conversations yet — companies will reach out once your profile
            is live.
          </div>
      ) : (
        <ConversationList
          rows={conversations.map((conv) => ({
            id: conv.id,
            href: `/worker/messages/${conv.id}`,
            name: conv.company.companyName,
            subtitle: `${conv.company.state} ${conv.company.postcode}`,
            jobStatus: conv.job?.status ?? null,
            lastMessage: conv.messages[0]?.body ?? null,
            lastAt: conv.messages[0] ? formatDateTime(conv.messages[0].createdAt) : null,
          }))}
        />
      )}
    </div>
  );
}
