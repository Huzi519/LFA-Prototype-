import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { canWorkerTakeJob } from "@/lib/rules/credentials";
import { formatCents, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuoteForm } from "./quote-form";
import { JobDocuments } from "@/components/job-documents";

export default async function WorkerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: { credentials: true },
  });

  const job = await db.job.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!job) notFound();

  const myQuote = await db.quote.findFirst({
    where: { jobId: job.id, workerId: profile.id },
  });

  const eligibility = canWorkerTakeJob(profile, job, profile.credentials);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {job.company.companyName} · {job.trade} · {job.state}{" "}
              {job.postcode} · Starts {formatDate(job.startDate)} · Budget{" "}
              {formatCents(job.budget)}
            </p>
          </div>
          <Badge variant="outline">{job.status}</Badge>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{job.description}</p>
        </CardContent>
      </Card>

      {myQuote ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Amount: {formatCents(myQuote.amount)}</p>
            <p>Message: {myQuote.message}</p>
            <p>
              Status: <Badge variant="outline">{myQuote.status}</Badge>
            </p>
          </CardContent>
        </Card>
      ) : job.status !== "OPEN" ? (
        <Alert>
          <AlertDescription>This job is no longer open for quotes.</AlertDescription>
        </Alert>
      ) : profile.profileStatus !== "LIVE" ? (
        <Alert>
          <AlertDescription>
            Your profile must be live before you can submit a quote.
          </AlertDescription>
        </Alert>
      ) : !eligibility.allowed ? (
        <Alert variant="destructive">
          <AlertDescription>{eligibility.reason}</AlertDescription>
        </Alert>
      ) : (
        <QuoteForm jobId={job.id} />
      )}

      {job.hiredWorkerId === profile.id && (
        <JobDocuments jobId={job.id} viewerUserId={user.id} canUpload />
      )}
    </div>
  );
}
