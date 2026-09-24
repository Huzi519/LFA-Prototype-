"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { signIn } from "@/auth";
import { Role } from "@/generated/prisma";
import { isValidAbn, normaliseAbn } from "@/lib/rules/abn";

const emailPassword = {
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
};

const workerSchema = z.object({
  ...emailPassword,
  fullName: z.string().trim().min(2, "Enter your full name."),
});

const companySchema = z.object({
  ...emailPassword,
  companyName: z.string().trim().min(2, "Enter your organisation's name."),
  abn: z
    .string()
    .trim()
    .refine((v) => isValidAbn(v), "Enter a valid 11-digit ABN."),
  contactName: z.string().trim().min(2, "Enter a contact name."),
  phone: z.string().trim().min(6, "Enter a phone number."),
  state: z.enum([
    "NSW",
    "VIC",
    "QLD",
    "WA",
    "SA",
    "TAS",
    "ACT",
    "NT",
  ]),
  postcode: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit postcode."),
});

export type ActionState = { error?: string } | undefined;

async function createUser(email: string, password: string, role: Role) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  return db.user.create({ data: { email, passwordHash, role } });
}

export async function registerWorker(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = workerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const user = await createUser(
      parsed.data.email,
      parsed.data.password,
      Role.WORKER
    );
    await db.workerProfile.create({
      data: {
        userId: user.id,
        fullName: parsed.data.fullName,
        phone: "",
        abn: "",
        primaryTrade: "LABOURER",
        otherTrades: "[]",
        yearsExperience: 0,
        bio: "",
        hourlyRate: 0,
        homeState: "NSW",
        serviceRadiusKm: 0,
        postcode: "",
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Registration failed." };
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });
  redirect("/worker/onboarding");
}

export async function registerCompany(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = companySchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    companyName: formData.get("companyName"),
    abn: formData.get("abn"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    state: formData.get("state"),
    postcode: formData.get("postcode"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const user = await createUser(
      parsed.data.email,
      parsed.data.password,
      Role.COMPANY
    );
    await db.companyProfile.create({
      data: {
        userId: user.id,
        companyName: parsed.data.companyName,
        abn: normaliseAbn(parsed.data.abn),
        contactName: parsed.data.contactName,
        phone: parsed.data.phone,
        state: parsed.data.state,
        postcode: parsed.data.postcode,
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Registration failed." };
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });
  redirect("/company/dashboard");
}
