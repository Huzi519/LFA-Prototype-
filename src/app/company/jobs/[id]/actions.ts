"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { Role, JobStatus, QuoteStatus } from "@/generated/prisma";

export type ActionState = { error?: string } | undefined;

const schema = z.object({
  jobId: z.string().min(1),
  quoteId: z.string().min(1),
});

/**
 * Accepts a quote: the accepted quote becomes ACCEPTED, every other
 * SUBMITTED quote on the job is DECLINED, and the job moves straight to
 * HIRED (no escrow step in this prototype — see DECISIONS.md).
 */
export async function acceptQuote(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole(Role.COMPANY);

  const parsed = schema.safeParse({
    jobId: formData.get("jobId"),
    quoteId: formData.get("quoteId"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const company = await db.companyProfile.findUnique({
    where: { userId: user.id },
  });
  if (!company) return { error: "Company profile not found." };

  const job = await db.job.findUnique({ where: { id: parsed.data.jobId } });
  if (!job || job.companyId !== company.id) {
    return { error: "Job not found." };
  }
  if (job.status !== JobStatus.OPEN) {
    return { error: "This job already has a hired worker." };
  }

  const quote = await db.quote.findUnique({
    where: { id: parsed.data.quoteId },
  });
  if (!quote || quote.jobId !== job.id) {
    return { error: "Quote not found." };
  }
  if (quote.status !== QuoteStatus.SUBMITTED) {
    return { error: "This quote is no longer available." };
  }

  const otherQuotes = await db.quote.findMany({
    where: {
      jobId: job.id,
      id: { not: quote.id },
      status: QuoteStatus.SUBMITTED,
    },
    select: { id: true, workerId: true, worker: { select: { userId: true } } },
  });

  await db.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quote.id },
      data: { status: QuoteStatus.ACCEPTED },
    });
    if (otherQuotes.length > 0) {
      await tx.quote.updateMany({
        where: { id: { in: otherQuotes.map((q) => q.id) } },
        data: { status: QuoteStatus.DECLINED },
      });
    }
    await tx.job.update({
      where: { id: job.id },
      data: { status: JobStatus.HIRED, hiredWorkerId: quote.workerId },
    });

    const hiredWorker = await tx.workerProfile.findUnique({
      where: { id: quote.workerId },
      select: { userId: true },
    });
    if (hiredWorker) {
      await notify(
        hiredWorker.userId,
        `You were hired for "${job.title}".`,
        `/worker/jobs/${job.id}`,
        tx
      );
    }
    for (const declined of otherQuotes) {
      await notify(
        declined.worker.userId,
        `Your quote for "${job.title}" wasn't accepted.`,
        `/worker/jobs/${job.id}`,
        tx
      );
    }
  });

  revalidatePath(`/company/jobs/${job.id}`);
  return { error: undefined };
}
