"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { canWorkerTakeJob } from "@/lib/rules/credentials";
import { Role, JobStatus, QuoteStatus } from "@/generated/prisma";

export type ActionState = { error?: string } | undefined;

const schema = z.object({
  jobId: z.string().min(1),
  amountDollars: z.coerce.number().positive("Enter a quote amount."),
  message: z.string().trim().min(5, "Add a short message."),
});

export async function submitQuote(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole(Role.WORKER);

  const parsed = schema.safeParse({
    jobId: formData.get("jobId"),
    amountDollars: formData.get("amountDollars"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const profile = await db.workerProfile.findUnique({
    where: { userId: user.id },
    include: { credentials: true },
  });
  if (!profile) return { error: "Worker profile not found." };
  if (profile.profileStatus !== "LIVE") {
    return { error: "Your profile must be live before you can quote." };
  }

  const job = await db.job.findUnique({ where: { id: parsed.data.jobId } });
  if (!job) return { error: "Job not found." };
  if (job.status !== JobStatus.OPEN) {
    return { error: "This job is no longer open." };
  }

  const eligibility = canWorkerTakeJob(profile, job, profile.credentials);
  if (!eligibility.allowed) {
    return { error: eligibility.reason };
  }

  const existing = await db.quote.findFirst({
    where: { jobId: job.id, workerId: profile.id },
  });
  if (existing) return { error: "You've already quoted on this job." };

  await db.quote.create({
    data: {
      jobId: job.id,
      workerId: profile.id,
      amount: Math.round(parsed.data.amountDollars * 100),
      message: parsed.data.message,
      status: QuoteStatus.SUBMITTED,
    },
  });

  const company = await db.companyProfile.findUnique({
    where: { id: job.companyId },
  });
  if (company) {
    await notify(
      company.userId,
      `New quote from ${profile.fullName} on "${job.title}".`,
      `/company/jobs/${job.id}`
    );
  }

  revalidatePath(`/worker/jobs/${job.id}`);
  revalidatePath("/worker/jobs");
  return { error: undefined };
}
