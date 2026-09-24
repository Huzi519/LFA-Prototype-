import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatDateTime } from "@/lib/format";
import { ConversationList } from "@/components/lfa/conversation-list";
import { PageHeader } from "@/components/lfa/page-header";

export default async function CompanyMessagesPage() {
  const user = await requireRole(Role.COMPANY);
  const company = await db.companyProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const conversations = await db.conversation.findMany({
    where: { companyId: company.id },
    include: {
      worker: true,
      job: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Messages" lede="Your conversations with tradespeople." />

      {conversations.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
            No conversations yet,{" "}
            <Link href="/company/workers" className="underline underline-offset-4">
              search for a worker
            </Link>{" "}
            to get started.
          </div>
      ) : (
        <ConversationList
          rows={conversations.map((conv) => ({
            id: conv.id,
            href: `/company/messages/${conv.id}`,
            name: conv.worker.fullName,
            subtitle: `${conv.worker.primaryTrade.charAt(0)}${conv.worker.primaryTrade.slice(1).toLowerCase()}, ${conv.worker.homeState}`,
            jobStatus: conv.job?.status ?? null,
            lastMessage: conv.messages[0]?.body ?? null,
            lastAt: conv.messages[0] ? formatDateTime(conv.messages[0].createdAt) : null,
          }))}
        />
      )}
    </div>
  );
}
