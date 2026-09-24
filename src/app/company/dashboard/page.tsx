import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/lfa/page-header";
import { StatusBadge } from "@/components/lfa/status-badge";
import { TradeChip } from "@/components/lfa/trade-chip";
import { formatCents, formatDate } from "@/lib/format";

export default async function CompanyDashboardPage() {
  const user = await requireRole(Role.COMPANY);
  const profile = await db.companyProfile.findUnique({
    where: { userId: user.id },
  });

  const [recentJobs, openConversations, liveWorkers] = await Promise.all([
    profile
      ? db.job.findMany({
          where: { companyId: profile.id },
          include: { worker: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [],
    profile ? db.conversation.count({ where: { companyId: profile.id, jobId: null } }) : 0,
    db.workerProfile.count({ where: { profileStatus: "LIVE" } }),
  ]);

  const stats = [
    { label: "Tradies available", value: liveWorkers, href: "/company/workers" },
    { label: "Open conversations", value: openConversations, href: "/company/messages" },
    { label: "Hired", value: recentJobs.length, href: "/company/jobs" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={profile?.companyName ?? "Company"}
        lede={
          profile?.verified
            ? "Verified company. Search, message and hire directly."
            : "Search, message and hire directly. Verification is pending."
        }
        action={
          <Button variant="hivis" size="lg" nativeButton={false} render={<Link href="/company/workers" />}>
            Find a tradie
          </Button>
        }
      />

      <div className="grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-card p-5 transition-colors hover:bg-secondary">
            <p className="font-heading text-4xl font-extrabold tracking-tight">{s.value}</p>
            <p className="text-muted-foreground mt-1 text-sm">{s.label}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="display-md text-xl">Recent hires</h2>
          <Link href="/company/jobs" className="text-sm font-medium underline underline-offset-4">
            View all jobs
          </Link>
        </div>
        {recentJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-semibold">No one hired yet.</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Open a conversation with a tradie and mark them as hired once you agree on the details.
            </p>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
            {recentJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/company/jobs/${job.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm transition-colors hover:bg-secondary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{job.title}</span>
                    <span className="text-muted-foreground">
                      {job.worker.fullName}, starts {formatDate(job.startDate)}
                    </span>
                  </span>
                  <span className="w-24"><TradeChip trade={job.trade} /></span>
                  <span className="font-heading w-24 text-right font-bold">{formatCents(job.budget)}</span>
                  <span className="w-24 text-right"><StatusBadge status={job.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
