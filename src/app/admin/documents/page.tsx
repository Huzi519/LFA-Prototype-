import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/lfa/status-badge";
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
        <h1 className="display-lg text-3xl sm:text-4xl">Document review</h1>
        <p className="text-muted-foreground mt-1.5 max-w-xl">
          Every document is invisible to its recipient until you approve it.
        </p>
      </div>

      <section>
        <h2 className="display-md mb-3 text-xl">
          Awaiting review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing to review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="font-heading text-base font-bold">
                      {doc.category.charAt(0) + doc.category.slice(1).toLowerCase().replace(/_/g, " ")}
                    </p>
                    <p className="text-muted-foreground">
                      {doc.conversation.company.companyName} and {doc.conversation.worker.fullName}
                    </p>
                    <p className="text-muted-foreground">
                      {doc.file.originalName}, sent by {doc.uploader.email} on {formatDate(doc.createdAt)}
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
        <h2 className="display-md mb-3 text-xl">Recently reviewed</h2>
        {recentlyReviewed.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing reviewed yet.</p>
        ) : (
          <div className="space-y-2">
            {recentlyReviewed.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between gap-4 text-sm">
                  <span>
                    <span className="font-semibold">
                      {doc.category.charAt(0) + doc.category.slice(1).toLowerCase().replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}between {doc.conversation.company.companyName} and {doc.conversation.worker.fullName}
                    </span>
                  </span>
                  <StatusBadge status={doc.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
