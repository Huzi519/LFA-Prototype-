import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewForm } from "./review-form";

export default async function AdminDocumentsPage() {
  await requireRole(Role.ADMIN);

  const [pending, recentlyReviewed] = await Promise.all([
    db.document.findMany({
      where: { status: "PENDING_REVIEW" },
      include: {
        file: true,
        uploader: true,
        conversation: { include: { company: true, worker: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.document.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: {
        file: true,
        uploader: true,
        conversation: { include: { company: true, worker: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Document review</h1>
        <p className="text-muted-foreground">
          Every document is invisible to its recipient until you approve it.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Awaiting review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing to review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-start justify-between gap-4 pt-6 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {doc.category.replace(/_/g, " ")} —{" "}
                      {doc.conversation.company.companyName} ↔{" "}
                      {doc.conversation.worker.fullName}
                    </p>
                    <p className="text-muted-foreground">
                      From {doc.uploader.email} · {doc.file.originalName} ·{" "}
                      {formatDate(doc.createdAt)}
                    </p>
                    <a
                      href={`/api/files/${doc.file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      View file
                    </a>
                  </div>
                  <ReviewForm documentId={doc.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recently reviewed</h2>
        {recentlyReviewed.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing reviewed yet.</p>
        ) : (
          <div className="space-y-2">
            {recentlyReviewed.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between gap-4 pt-6 text-sm">
                  <span>
                    {doc.category.replace(/_/g, " ")} —{" "}
                    {doc.conversation.company.companyName} ↔{" "}
                    {doc.conversation.worker.fullName} · From {doc.uploader.email}
                  </span>
                  <Badge variant={doc.status === "APPROVED" ? "default" : "destructive"}>
                    {doc.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
