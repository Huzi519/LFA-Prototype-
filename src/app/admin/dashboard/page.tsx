import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/lfa/page-header";

export default async function AdminDashboardPage() {
  await requireRole(Role.ADMIN);

  const [pendingDocuments, totalUsers, totalJobs, liveWorkers] = await Promise.all([
    db.document.count({ where: { status: "PENDING_REVIEW" } }),
    db.user.count(),
    db.job.count(),
    db.workerProfile.count({ where: { profileStatus: "LIVE" } }),
  ]);

  const stats = [
    { label: "Live tradie profiles", value: liveWorkers },
    { label: "Jobs created", value: totalJobs },
    { label: "Registered users", value: totalUsers },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Admin" lede="Document review queue and platform totals." />

      <Link
        href="/admin/documents"
        className={`flex flex-wrap items-center justify-between gap-4 rounded-lg p-6 text-primary-foreground transition-colors ${
          pendingDocuments > 0 ? "bg-bluestone hover:bg-bluestone-deep" : "bg-verified"
        }`}
      >
        <div>
          <p className="font-heading text-5xl font-extrabold tracking-tight">{pendingDocuments}</p>
          <p className="mt-1 text-white/75">
            {pendingDocuments === 1 ? "document" : "documents"} waiting for review
          </p>
        </div>
        <Button variant={pendingDocuments > 0 ? "hivis" : "outline"} size="lg" className="pointer-events-none">
          {pendingDocuments > 0 ? "Open the queue" : "Queue is clear"}
        </Button>
      </Link>

      <div className="grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-5">
            <p className="font-heading text-4xl font-extrabold tracking-tight">{s.value}</p>
            <p className="text-muted-foreground mt-1 text-sm">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
