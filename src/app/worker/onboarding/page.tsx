import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function WorkerOnboardingPage() {
  const user = await requireRole(Role.WORKER);

  const profile = await db.workerProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: {
      credentials: {
        include: { file: { select: { id: true, originalName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="display-lg text-3xl sm:text-4xl">Worker onboarding</h1>
        <p className="text-muted-foreground mt-1.5 max-w-xl">
          Tell us about yourself and upload your credentials — an admin
          reviews everything before your profile goes live.
        </p>
      </div>

      <OnboardingWizard
        profile={{
          fullName: profile.fullName,
          phone: profile.phone,
          abn: profile.abn,
          primaryTrade: profile.primaryTrade,
          otherTrades: profile.otherTrades,
          yearsExperience: profile.yearsExperience,
          bio: profile.bio,
          hourlyRate: profile.hourlyRate,
          homeState: profile.homeState,
          postcode: profile.postcode,
          serviceRadiusKm: profile.serviceRadiusKm,
          profileStatus: profile.profileStatus,
        }}
        credentials={profile.credentials.map((c) => ({
          id: c.id,
          type: c.type,
          status: c.status,
          trade: c.trade,
          issuingState: c.issuingState,
          expiryDate: c.expiryDate ? c.expiryDate.toISOString() : null,
          file: c.file,
        }))}
      />
    </div>
  );
}
