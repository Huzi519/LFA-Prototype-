import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/lfa/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentUploadForm } from "@/components/document-upload-form";

/**
 * Documents for a conversation, from the current viewer's perspective. Per
 * CLAUDE.md "Documents": the uploader always sees their own documents and
 * status (rejected ones with the admin's note); the recipient only ever
 * sees APPROVED documents. Available from first contact onward — a
 * Conversation exists before any Job does (see DECISIONS.md).
 */
export async function ConversationDocuments({
  conversationId,
  viewerUserId,
}: {
  conversationId: string;
  viewerUserId: string;
}) {
  const documents = await db.document.findMany({
    where: {
      conversationId,
      OR: [{ uploaderId: viewerUserId }, { recipientId: viewerUserId, status: "APPROVED" }],
    },
    include: { file: true, uploader: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h2 className="display-md text-xl">Documents</h2>

      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No documents shared yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isUploader = doc.uploaderId === viewerUserId;
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{doc.category.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground">
                      {isUploader ? "You sent" : "They sent"} {doc.file.originalName} on{" "}
                      {formatDate(doc.createdAt)}
                    </p>
                    {isUploader && doc.status === "REJECTED" && doc.reviewNote && (
                      <p className="text-destructive mt-1">
                        Rejected: {doc.reviewNote}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(doc.status === "APPROVED" || isUploader) && (
                      <a
                        href={`/api/files/${doc.file.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline underline-offset-4"
                      >
                        View
                      </a>
                    )}
                    {isUploader ? (
                      <StatusBadge status={doc.status} />
                    ) : (
                      <StatusBadge status="APPROVED" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DocumentUploadForm conversationId={conversationId} />
    </div>
  );
}
