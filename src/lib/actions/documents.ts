"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload, InvalidFileError } from "@/lib/storage";
import { notify } from "@/lib/notifications";
import { Role, DocumentStatus } from "@/generated/prisma";

// Shared by company and worker conversation pages — documents attach to a
// Conversation (the hub for a company/worker relationship — see
// DECISIONS.md), not a Job, so the admin-review gate applies from first
// contact onward, not only after a hire. CLAUDE.md "Every uploaded
// document starts as PENDING_REVIEW and is invisible to the recipient
// until an admin approves it" still holds throughout.

export type ActionState = { error?: string } | undefined;

const CATEGORIES = [
  "CONTRACT",
  "DRAWING",
  "SCOPE",
  "SWMS",
  "INDUCTION",
  "PROOF_OF_COMPLETION",
  "OTHER",
] as const;

const uploadSchema = z.object({
  conversationId: z.string().min(1),
  category: z.enum(CATEGORIES),
});

export async function uploadDocument(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || (user.role !== Role.WORKER && user.role !== Role.COMPANY)) {
    return { error: "Not authorised." };
  }

  const parsed = uploadSchema.safeParse({
    conversationId: formData.get("conversationId"),
    category: formData.get("category"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  const conversation = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    include: { company: true, worker: true },
  });
  if (!conversation) return { error: "Conversation not found." };

  // Ownership check — the actor must actually be a party to this thread.
  let recipientId: string;
  if (conversation.company.userId === user.id) {
    recipientId = conversation.worker.userId;
  } else if (conversation.worker.userId === user.id) {
    recipientId = conversation.company.userId;
  } else {
    return { error: "Not your conversation." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveUpload(buffer);

    const fileRecord = await db.file.create({
      data: {
        ownerId: user.id,
        originalName: file.name,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        storagePath: saved.storagePath,
      },
    });

    await db.document.create({
      data: {
        conversationId: conversation.id,
        uploaderId: user.id,
        recipientId,
        category: parsed.data.category,
        fileId: fileRecord.id,
        status: DocumentStatus.PENDING_REVIEW,
      },
    });
  } catch (err) {
    if (err instanceof InvalidFileError) return { error: err.message };
    return { error: "Upload failed. Please try again." };
  }

  revalidatePath(`/worker/messages/${conversation.id}`);
  revalidatePath(`/company/messages/${conversation.id}`);
  revalidatePath("/worker/documents");
  return { error: undefined };
}

// ---------- Admin review ----------

const reviewSchema = z.object({
  documentId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().trim().optional(),
});

export async function reviewDocument(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || user.role !== Role.ADMIN) return { error: "Not authorised." };

  const parsed = reviewSchema.safeParse({
    documentId: formData.get("documentId"),
    decision: formData.get("decision"),
    reviewNote: formData.get("reviewNote") || undefined,
  });
  if (!parsed.success) return { error: "Invalid input." };

  if (parsed.data.decision === "REJECT" && !parsed.data.reviewNote) {
    return { error: "A rejection needs a note explaining why." };
  }

  const document = await db.document.findUnique({
    where: { id: parsed.data.documentId },
    include: { conversation: { include: { company: true } } },
  });
  if (!document) return { error: "Document not found." };
  if (document.status !== DocumentStatus.PENDING_REVIEW) {
    return { error: "This document has already been reviewed." };
  }

  const newStatus =
    parsed.data.decision === "APPROVE"
      ? DocumentStatus.APPROVED
      : DocumentStatus.REJECTED;

  await db.document.update({
    where: { id: document.id },
    data: { status: newStatus, reviewNote: parsed.data.reviewNote || null },
  });

  const uploaderIsCompany = document.uploaderId === document.conversation.company.userId;
  await notify(
    document.uploaderId,
    newStatus === DocumentStatus.APPROVED
      ? "Your document was approved and is now visible to the other party."
      : `Your document was rejected: ${parsed.data.reviewNote}`,
    uploaderIsCompany
      ? `/company/messages/${document.conversationId}`
      : `/worker/messages/${document.conversationId}`
  );

  revalidatePath("/admin/documents");
  return { error: undefined };
}
