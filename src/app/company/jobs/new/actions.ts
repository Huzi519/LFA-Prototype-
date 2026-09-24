"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";

const TRADES = ["PLUMBER", "ELECTRICIAN", "CARPENTER", "LABOURER"] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

const jobSchema = z.object({
  title: z.string().trim().min(3, "Enter a job title."),
  description: z.string().trim().min(20, "Enter a longer description."),
  trade: z.enum(TRADES),
  state: z.enum(STATES),
  postcode: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit postcode."),
  startDate: z.string().trim().min(1, "Choose a start date."),
  budgetDollars: z.coerce.number().positive("Enter a budget."),
});

export type ActionState = { error?: string } | undefined;

export async function createJob(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole(Role.COMPANY);

  const parsed = jobSchema.safeParse({
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

  const company = await db.companyProfile.findUnique({
    where: { userId: user.id },
  });
  if (!company) return { error: "Company profile not found." };

  const job = await db.job.create({
    data: {
      companyId: company.id,
      title: parsed.data.title,
      description: parsed.data.description,
      trade: parsed.data.trade,
      state: parsed.data.state,
      postcode: parsed.data.postcode,
      startDate: new Date(parsed.data.startDate),
      budget: Math.round(parsed.data.budgetDollars * 100),
    },
  });

  redirect(`/company/jobs/${job.id}`);
}
