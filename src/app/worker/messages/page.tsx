import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="text-muted-foreground">Your conversations with companies.</p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No conversations yet — companies will reach out once your profile
            is live.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Link key={conv.id} href={`/worker/messages/${conv.id}`} className="block">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{conv.company.companyName}</CardTitle>
                  {conv.job && <Badge variant="outline">{conv.job.status}</Badge>}
                </CardHeader>
                <CardContent className="text-sm">
                  {conv.messages[0] ? (
                    <p className="text-muted-foreground truncate">
                      {conv.messages[0].body} ·{" "}
                      {formatDateTime(conv.messages[0].createdAt)}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No messages yet.</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
