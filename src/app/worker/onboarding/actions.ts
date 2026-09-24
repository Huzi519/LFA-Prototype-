"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload, InvalidFileError } from "@/lib/storage";
import { isValidAbn, normaliseAbn } from "@/lib/rules/abn";
import { MIN_BIO_LENGTH } from "@/lib/rules/config";
import { Role, ProfileStatus } from "@/generated/prisma";

export type ActionState = { error?: string; success?: boolean } | undefined;

const TRADES = ["PLUMBER", "ELECTRICIAN", "CARPENTER", "LABOURER"] as const;
const STATES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
] as const;
const CREDENTIAL_TYPES = [
  "TRADE_LICENCE",
  "WHITE_CARD",
  "PUBLIC_LIABILITY",
  "WORKERS_COMP",
  "POLICE_CHECK",
  "WWCC",
  "OTHER",
] as const;

// ---------- Step 1–3: profile details ----------

const detailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z.string().trim().min(6, "Enter a phone number."),
  abn: z.string().trim().refine((v) => isValidAbn(v), "Enter a valid 11-digit ABN."),
  primaryTrade: z.enum(TRADES),
  otherTrades: z.array(z.enum(TRADES)).default([]),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  bio: z
    .string()
    .trim()
    .min(MIN_BIO_LENGTH, `Bio must be at least ${MIN_BIO_LENGTH} characters.`),
  hourlyRateDollars: z.coerce.number().positive("Enter an hourly rate."),
  homeState: z.enum(STATES),
  postcode: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit postcode."),
  serviceRadiusKm: z.coerce.number().int().positive("Enter a service radius."),
});

export async function saveProfileDetails(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole(Role.WORKER);

  const parsed = detailsSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    abn: formData.get("abn"),
    primaryTrade: formData.get("primaryTrade"),
    otherTrades: formData.getAll("otherTrades"),
    yearsExperience: formData.get("yearsExperience"),
    bio: formData.get("bio"),
    hourlyRateDollars: formData.get("hourlyRateDollars"),
    homeState: formData.get("homeState"),
    postcode: formData.get("postcode"),
    serviceRadiusKm: formData.get("serviceRadiusKm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const profile = await db.workerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) return { error: "Worker profile not found." };

  const otherTrades = parsed.data.otherTrades.filter(
    (t) => t !== parsed.data.primaryTrade
  );

  await db.workerProfile.update({
    where: { userId: user.id },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      abn: normaliseAbn(parsed.data.abn),
      primaryTrade: parsed.data.primaryTrade,
      otherTrades: JSON.stringify(otherTrades),
      yearsExperience: parsed.data.yearsExperience,
      bio: parsed.data.bio,
      hourlyRate: Math.round(parsed.data.hourlyRateDollars * 100),
      homeState: parsed.data.homeState,
      postcode: parsed.data.postcode,
      serviceRadiusKm: parsed.data.serviceRadiusKm,
    },
  });

  revalidatePath("/worker/onboarding");
  return { success: true };
}

// ---------- Step 4: credential uploads ----------

const credentialSchema = z.object({
  type: z.enum(CREDENTIAL_TYPES),
  trade: z.enum(TRADES).optional(),
  licenceNumber: z.string().trim().optional(),
  issuingState: z.enum(STATES).optional(),
  issuer: z.string().trim().optional(),
  expiryDate: z.string().trim().optional(),
});

export async function uploadCredential(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole(Role.WORKER);

  const parsed = credentialSchema.safeParse({
    type: formData.get("type"),
    trade: formData.get("trade") || undefined,
    licenceNumber: formData.get("licenceNumber") || undefined,
    issuingState: formData.get("issuingState") || undefined,
    issuer: formData.get("issuer") || undefined,
    expiryDate: formData.get("expiryDate") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.type === "TRADE_LICENCE" && !parsed.data.issuingState) {
    return { error: "A trade licence must have an issuing state." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const profile = await db.workerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) return { error: "Worker profile not found." };

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

    await db.credential.create({
      data: {
        workerId: profile.id,
        type: parsed.data.type,
        trade: parsed.data.trade,
        licenceNumber: parsed.data.licenceNumber || null,
        issuingState: parsed.data.issuingState,
        issuer: parsed.data.issuer || null,
        expiryDate: parsed.data.expiryDate
          ? new Date(parsed.data.expiryDate)
          : null,
        fileId: fileRecord.id,
        status: "PENDING",
      },
    });
  } catch (err) {
    if (err instanceof InvalidFileError) return { error: err.message };
    return { error: "Upload failed. Please try again." };
  }

  revalidatePath("/worker/onboarding");
  return { success: true };
}

export async function deleteCredential(credentialId: string): Promise<void> {
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) return;

  // Ownership check — never trust the client-supplied ID alone.
  await db.credential.deleteMany({
    where: { id: credentialId, workerId: profile.id },
  });
  revalidatePath("/worker/onboarding");
}

// ---------- Final: submit for review ----------

export async function submitForReview(): Promise<ActionState> {
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUnique({
    where: { userId: user.id },
    include: { credentials: true },
  });
  if (!profile) return { error: "Worker profile not found." };

  const missing: string[] = [];
  if (!profile.fullName) missing.push("full name");
  if (!profile.phone) missing.push("phone");
  if (!isValidAbn(profile.abn)) missing.push("a valid ABN");
  if (!profile.postcode) missing.push("postcode");
  if (!profile.serviceRadiusKm) missing.push("service radius");
  if (!profile.hourlyRate) missing.push("hourly rate");
  if (profile.bio.length < MIN_BIO_LENGTH) missing.push("a bio of at least 50 characters");
  if (profile.credentials.length === 0) missing.push("at least one uploaded credential");

  if (missing.length > 0) {
    return { error: `Before you can submit: ${missing.join(", ")}.` };
  }

  await db.workerProfile.update({
    where: { userId: user.id },
    data: { profileStatus: ProfileStatus.PENDING_REVIEW },
  });

  revalidatePath("/worker/onboarding");
  revalidatePath("/worker/dashboard");
  return { success: true };
}
