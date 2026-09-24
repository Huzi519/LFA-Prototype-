import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { canWorkerTakeJob } from "@/lib/rules/credentials";
import { formatCents, formatDate } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function WorkerJobsPage() {
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: { credentials: true },
  });

  const myQuotes = await db.quote.findMany({
    where: { workerId: profile.id },
    include: { job: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });
  const quotedJobIds = new Set(myQuotes.map((q) => q.jobId));

  const openJobs =
    profile.profileStatus === "LIVE"
      ? await db.job.findMany({
          where: { status: "OPEN" },
          include: { company: true },
          orderBy: { createdAt: "desc" },
        })
      : [];
  const eligibleJobs = openJobs.filter(
    (job) =>
      !quotedJobIds.has(job.id) &&
      canWorkerTakeJob(profile, job, profile.credentials).allowed
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-muted-foreground">
          Jobs you&apos;re eligible to quote on, and your submitted quotes.
        </p>
      </div>

      {profile.profileStatus !== "LIVE" && (
        <Alert>
          <AlertDescription>
            Your profile needs to be live before you can see and quote on
            jobs. Current status: {profile.profileStatus}.
          </AlertDescription>
        </Alert>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Available jobs</h2>
        {eligibleJobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No open jobs match your trade, state and licences right now.
          </p>
        ) : (
          <div className="space-y-3">
            {eligibleJobs.map((job) => (
              <Link key={job.id} href={`/worker/jobs/${job.id}`} className="block">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{job.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {job.company.companyName} · {job.trade} · {job.state}{" "}
                        {job.postcode} · Starts {formatDate(job.startDate)}
                      </p>
                    </div>
                    <span className="font-medium">{formatCents(job.budget)}</span>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">My quotes</h2>
        {myQuotes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You haven&apos;t submitted any quotes yet.
          </p>
        ) : (
          <div className="space-y-3">
            {myQuotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/worker/jobs/${quote.jobId}`}
                className="block"
              >
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{quote.job.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {quote.job.company.companyName} · Your quote:{" "}
                        {formatCents(quote.amount)}
                      </p>
                    </div>
                    <Badge variant="outline">{quote.status}</Badge>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
