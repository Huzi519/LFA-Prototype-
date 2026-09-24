"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload, InvalidFileError } from "@/lib/storage";
import { notify } from "@/lib/notifications";
import { Role, DocumentStatus } from "@/generated/prisma";

// Shared by both worker and company job pages — documents are always tied
// to a job and exchanged with that job's other party (CLAUDE.md "Every
// uploaded document starts as PENDING_REVIEW and is invisible to the
// recipient until an admin approves it").

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
  jobId: z.string().min(1),
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
    jobId: formData.get("jobId"),
    category: formData.get("category"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  const job = await db.job.findUnique({
    where: { id: parsed.data.jobId },
    include: { company: true, hiredWorker: true },
  });
  if (!job || !job.hiredWorker) {
    return { error: "This job has no hired worker to share documents with." };
  }

  // Ownership check — the actor must actually be a party to this job.
  let recipientId: string;
  if (user.role === Role.COMPANY) {
    if (job.company.userId !== user.id) return { error: "Not your job." };
    recipientId = job.hiredWorker.userId;
  } else {
    const workerProfile = await db.workerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!workerProfile || job.hiredWorkerId !== workerProfile.id) {
      return { error: "You're not the hired worker on this job." };
    }
    recipientId = job.company.userId;
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
        jobId: job.id,
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

  revalidatePath(`/worker/jobs/${job.id}`);
  revalidatePath(`/company/jobs/${job.id}`);
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
    include: { job: { include: { company: true } } },
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

  const uploaderIsCompany = document.uploaderId === document.job.company.userId;
  await notify(
    document.uploaderId,
    newStatus === DocumentStatus.APPROVED
      ? `Your document for "${document.job.title}" was approved and is now visible to the recipient.`
      : `Your document for "${document.job.title}" was rejected: ${parsed.data.reviewNote}`,
    uploaderIsCompany
      ? `/company/jobs/${document.jobId}`
      : `/worker/jobs/${document.jobId}`
  );

  revalidatePath("/admin/documents");
  return { error: undefined };
}
