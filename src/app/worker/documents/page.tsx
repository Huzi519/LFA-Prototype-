import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function WorkerDocumentsPage() {
  const user = await requireRole(Role.WORKER);

  const documents = await db.document.findMany({
    where: {
      OR: [
        { uploaderId: user.id },
        { recipientId: user.id, status: "APPROVED" },
      ],
    },
    include: { file: true, conversation: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-muted-foreground">
          Every document you&apos;ve shared or received, across all your
          conversations.
        </p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No documents yet — they appear here once shared in a conversation
            with a company.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isUploader = doc.uploaderId === user.id;
            return (
              <Link
                key={doc.id}
                href={`/worker/messages/${doc.conversationId}`}
                className="block"
              >
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center justify-between gap-4 pt-6 text-sm">
                    <div>
                      <p className="font-medium">
                        {doc.category.replace(/_/g, " ")} —{" "}
                        {doc.conversation.company.companyName}
                      </p>
                      <p className="text-muted-foreground">
                        {isUploader ? "You uploaded" : "They uploaded"} ·{" "}
                        {doc.file.originalName} · {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{isUploader ? doc.status : "APPROVED"}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
