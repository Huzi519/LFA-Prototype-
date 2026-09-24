import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/lfa/status-badge";
import { formatCents, formatDate } from "@/lib/format";

export default async function WorkerJobsPage() {
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const jobs = await db.job.findMany({
    where: { workerId: profile.id },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg text-3xl sm:text-4xl">Your jobs</h1>
        <p className="text-muted-foreground mt-1.5 max-w-xl">
          {jobs.length} job{jobs.length === 1 ? "" : "s"} you&apos;ve been hired for.
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No jobs yet — once a company messages you and marks you as
            hired, it&apos;ll show up here.{" "}
            <Link href="/worker/messages" className="underline underline-offset-4">
              Check your messages
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/worker/jobs/${job.id}`} className="block">
              <Card className="transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(21,34,56,0.35)]">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <p className="text-muted-foreground text-sm">
                      {job.company.companyName}, {job.trade}, {job.state}{" "}
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
