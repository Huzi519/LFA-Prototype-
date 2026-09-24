import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatCents, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AcceptQuoteButton } from "./accept-quote-button";
import { JobDocuments } from "@/components/job-documents";

export default async function CompanyJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(Role.COMPANY);
  const company = await db.companyProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const job = await db.job.findUnique({
    where: { id },
    include: {
      quotes: {
        include: { worker: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!job || job.companyId !== company.id) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {job.trade} · {job.state} {job.postcode} · Starts{" "}
              {formatDate(job.startDate)} · Budget {formatCents(job.budget)}
            </p>
          </div>
          <Badge variant="outline">{job.status}</Badge>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{job.description}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Quotes ({job.quotes.length})
        </h2>
        {job.quotes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No quotes yet — eligible workers will see this job in their feed.
          </p>
        ) : (
          <div className="space-y-3">
            {job.quotes.map((quote) => (
              <Card key={quote.id}>
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <div className="space-y-1">
                    <p className="font-medium">{quote.worker.fullName}</p>
                    <p className="text-muted-foreground text-sm">
                      {quote.worker.primaryTrade} · {quote.worker.homeState} ·{" "}
                      {quote.worker.yearsExperience} yrs experience
                    </p>
                    <p className="text-sm">{quote.message}</p>
                    <p className="font-medium">{formatCents(quote.amount)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant="outline">{quote.status}</Badge>
                    {job.status === "OPEN" && quote.status === "SUBMITTED" && (
                      <AcceptQuoteButton jobId={job.id} quoteId={quote.id} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {job.hiredWorkerId && (
        <JobDocuments jobId={job.id} viewerUserId={user.id} canUpload />
      )}
    </div>
  );
}
