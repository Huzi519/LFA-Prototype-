import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/lfa/status-badge";
import { Button } from "@/components/ui/button";
import { formatCents, formatDate } from "@/lib/format";

export default async function CompanyJobsPage() {
  const user = await requireRole(Role.COMPANY);
  const company = await db.companyProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const jobs = await db.job.findMany({
    where: { companyId: company.id },
    include: { worker: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display-lg text-3xl sm:text-4xl">Your jobs</h1>
          <p className="text-muted-foreground mt-1.5 max-w-xl">
            {jobs.length} worker{jobs.length === 1 ? "" : "s"} hired.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/company/workers" />}>
          Search workers
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            You haven&apos;t hired anyone yet — search for a worker and mark
            them as hired once you agree on the details.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/company/jobs/${job.id}`} className="block">
              <Card className="transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(21,34,56,0.35)]">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <p className="text-muted-foreground text-sm">
                      {job.worker.fullName}, {job.trade}, {job.state}{" "}
                      {job.postcode}, Starts {formatDate(job.startDate)}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </CardHeader>
                <CardContent className="text-sm">
                  <span>{formatCents(job.budget)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
