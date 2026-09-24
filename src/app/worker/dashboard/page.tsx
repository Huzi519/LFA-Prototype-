import Link from "next/link";
import { ShieldCheck, FileText, MessageSquare } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/lfa/page-header";
import { StatusBadge } from "@/components/lfa/status-badge";
import { TradeChip } from "@/components/lfa/trade-chip";
import { formatCents } from "@/lib/format";

export default async function WorkerDashboardPage() {
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUnique({
    where: { userId: user.id },
    include: { credentials: true },
  });

  const [conversationCount, jobCount] = profile
    ? await Promise.all([
        db.conversation.count({ where: { workerId: profile.id } }),
        db.job.count({ where: { workerId: profile.id } }),
      ])
    : [0, 0];

  const needsOnboarding =
    !profile ||
    profile.profileStatus === "DRAFT" ||
    profile.credentials.length === 0;

  const approved = profile?.credentials.filter((c) => c.status === "APPROVED").length ?? 0;
  const status = profile?.profileStatus ?? "DRAFT";

  return (
    <div className="space-y-8">
      <PageHeader
        title={profile?.fullName ? `G'day, ${profile.fullName.split(" ")[0]}` : "Welcome"}
        lede="Your profile, credentials, messages and jobs live here."
        action={
          needsOnboarding ? (
            <Button variant="hivis" size="lg" nativeButton={false} render={<Link href="/worker/onboarding" />}>
              Finish your profile
            </Button>
          ) : (
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/worker/onboarding" />}>
              Edit profile
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Profile card, styled like the public one */}
        <section className="rounded-lg bg-card ring-1 ring-foreground/10">
          <div className="tape rounded-t-lg" />
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="display-md text-xl">Your public profile</h2>
              <StatusBadge status={status} />
            </div>
            {profile ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <TradeChip trade={profile.primaryTrade} />
                  <span className="text-muted-foreground text-sm">
                    {profile.homeState} {profile.postcode}, {profile.yearsExperience} yrs
                  </span>
                </div>
                <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
                  {profile.bio || "No bio yet."}
                </p>
                <div className="mt-4 flex items-baseline justify-between border-t border-dashed pt-3">
                  <span className="text-muted-foreground text-xs">Hourly rate</span>
                  <span className="font-heading text-xl font-bold tracking-tight">
                    {formatCents(profile.hourlyRate).replace(".00", "")}
                    <span className="text-muted-foreground text-xs font-medium">/hr</span>
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Finish onboarding to appear in the directory.
              </p>
            )}
            {status === "LIVE" && profile && (
              <Link
                href={`/workers/${profile.id}`}
                className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
              >
                See it as companies do
              </Link>
            )}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Link href="/worker/onboarding" className="flex items-center gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-secondary">
            <ShieldCheck className="text-verified size-6 shrink-0" aria-hidden />
            <span>
              <span className="block font-heading text-2xl font-extrabold">{approved}</span>
              <span className="text-muted-foreground text-sm">
                of {profile?.credentials.length ?? 0} credentials approved
              </span>
            </span>
          </Link>
          <Link href="/worker/messages" className="flex items-center gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-secondary">
            <MessageSquare className="text-muted-foreground size-6 shrink-0" aria-hidden />
            <span>
              <span className="block font-heading text-2xl font-extrabold">{conversationCount}</span>
              <span className="text-muted-foreground text-sm">conversations with companies</span>
            </span>
          </Link>
          <Link href="/worker/jobs" className="flex items-center gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-secondary">
            <FileText className="text-muted-foreground size-6 shrink-0" aria-hidden />
            <span>
              <span className="block font-heading text-2xl font-extrabold">{jobCount}</span>
              <span className="text-muted-foreground text-sm">jobs hired for</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
