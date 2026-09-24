"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { canWorkerTakeJob } from "@/lib/rules/credentials";
import { Role, MessageKind, JobStatus } from "@/generated/prisma";

// The conversation is the hub for a company/worker relationship — search →
// message → proposal → documents → "Mark as hired" — replacing the old
// job-posting/quote flow entirely (see DECISIONS.md).

export type ActionState = { error?: string } | undefined;

const TRADES = ["PLUMBER", "ELECTRICIAN", "CARPENTER", "LABOURER"] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

async function loadConversationForParticipant(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { company: true, worker: true },
  });
  if (!conversation) return null;
  const isCompany = conversation.company.userId === userId;
  const isWorker = conversation.worker.userId === userId;
  if (!isCompany && !isWorker) return null;
  return { conversation, isCompany, isWorker };
}

/**
 * Company-only: reuses the pair's still-open thread (no job yet) if one
 * exists, otherwise starts a new one — so messaging a worker again after a
 * past hire starts a fresh conversation rather than reopening the old,
 * already-hired one.
 */
export async function getOrCreateConversation(
  workerId: string
): Promise<{ conversationId?: string; error?: string }> {
  const user = await requireRole(Role.COMPANY);
  const company = await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!company) return { error: "Company profile not found." };

  const worker = await db.workerProfile.findUnique({ where: { id: workerId } });
  if (!worker || worker.profileStatus !== "LIVE") {
    return { error: "This worker isn't available to contact." };
  }

  const existing = await db.conversation.findFirst({
    where: { companyId: company.id, workerId, jobId: null },
    orderBy: { createdAt: "desc" },
  });
  const conversation =
    existing ??
    (await db.conversation.create({ data: { companyId: company.id, workerId } }));

  return { conversationId: conversation.id };
}

const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Type a message first."),
});

export async function sendMessage(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authorised." };

  const parsed = messageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const found = await loadConversationForParticipant(parsed.data.conversationId, user.id);
  if (!found) return { error: "Conversation not found." };

  await db.message.create({
    data: {
      conversationId: found.conversation.id,
      senderId: user.id,
      kind: MessageKind.TEXT,
      body: parsed.data.body,
    },
  });

  const recipientUserId = found.isCompany
    ? found.conversation.worker.userId
    : found.conversation.company.userId;
  const recipientPath = found.isCompany ? "worker" : "company";
  await notify(
    recipientUserId,
    "You have a new message.",
    `/${recipientPath}/messages/${found.conversation.id}`
  );

  return undefined;
}

const proposalSchema = z.object({
  conversationId: z.string().min(1),
  title: z.string().trim().min(3, "Enter a title."),
  description: z.string().trim().min(20, "Enter a longer description."),
  budgetDollars: z.coerce.number().positive("Enter a budget."),
});

export async function sendProposal(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole(Role.COMPANY);

  const parsed = proposalSchema.safeParse({
    conversationId: formData.get("conversationId"),
    title: formData.get("title"),
    description: formData.get("description"),
    budgetDollars: formData.get("budgetDollars"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const found = await loadConversationForParticipant(parsed.data.conversationId, user.id);
  if (!found || !found.isCompany) return { error: "Conversation not found." };

  const budgetCents = Math.round(parsed.data.budgetDollars * 100);
  await db.message.create({
    data: {
      conversationId: found.conversation.id,
      senderId: user.id,
      kind: MessageKind.PROPOSAL,
      body: `Proposal: ${parsed.data.title}`,
      proposalTitle: parsed.data.title,
      proposalDescription: parsed.data.description,
      proposalBudget: budgetCents,
    },
  });

  await notify(
    found.conversation.worker.userId,
    "You received a new proposal.",
    `/worker/messages/${found.conversation.id}`
  );

  return undefined;
}

const hireSchema = z.object({
  conversationId: z.string().min(1),
  title: z.string().trim().min(3, "Enter a title."),
  description: z.string().trim().min(20, "Enter a longer description."),
  trade: z.enum(TRADES),
  state: z.enum(STATES),
  postcode: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit postcode."),
  startDate: z.string().trim().min(1, "Choose a start date."),
  budgetDollars: z.coerce.number().positive("Enter a budget."),
});

export async function markAsHired(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole(Role.COMPANY);

  const parsed = hireSchema.safeParse({
    conversationId: formData.get("conversationId"),
    title: formData.get("title"),
    description: formData.get("description"),
    trade: formData.get("trade"),
    state: formData.get("state"),
    postcode: formData.get("postcode"),
    startDate: formData.get("startDate"),
    budgetDollars: formData.get("budgetDollars"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const found = await loadConversationForParticipant(parsed.data.conversationId, user.id);
  if (!found || !found.isCompany) return { error: "Conversation not found." };
  if (found.conversation.jobId) {
    return { error: "This worker has already been marked as hired." };
  }

  const worker = await db.workerProfile.findUniqueOrThrow({
    where: { id: found.conversation.workerId },
    include: { credentials: true },
  });

  const eligibility = canWorkerTakeJob(
    worker,
    { trade: parsed.data.trade, state: parsed.data.state },
    worker.credentials
  );
  if (!eligibility.allowed) {
    return { error: eligibility.reason };
  }

  await db.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        companyId: found.conversation.companyId,
        workerId: found.conversation.workerId,
        title: parsed.data.title,
        description: parsed.data.description,
        trade: parsed.data.trade,
        state: parsed.data.state,
        postcode: parsed.data.postcode,
        startDate: new Date(parsed.data.startDate),
        budget: Math.round(parsed.data.budgetDollars * 100),
        status: JobStatus.HIRED,
      },
    });
    await tx.conversation.update({
      where: { id: found.conversation.id },
      data: { jobId: job.id },
    });
    await tx.message.create({
      data: {
        conversationId: found.conversation.id,
        senderId: user.id,
        kind: MessageKind.SYSTEM,
        body: `${worker.fullName} was marked as hired for "${parsed.data.title}".`,
      },
    });
    await notify(
      worker.userId,
      `You were marked as hired for "${parsed.data.title}".`,
      `/worker/messages/${found.conversation.id}`,
      tx
    );
  });

  revalidatePath(`/company/messages/${found.conversation.id}`);
  redirect(`/company/messages/${found.conversation.id}`);
}
