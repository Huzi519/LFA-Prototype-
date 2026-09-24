import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCents, formatDate } from "@/lib/format";

export default async function CompanyJobsPage() {
  const user = await requireRole(Role.COMPANY);
  const company = await db.companyProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const jobs = await db.job.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { quotes: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your jobs</h1>
          <p className="text-muted-foreground">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} posted.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/company/jobs/new" />}>
          Post a job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            You haven&apos;t posted any jobs yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/company/jobs/${job.id}`} className="block">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <p className="text-muted-foreground text-sm">
                      {job.trade} · {job.state} {job.postcode} · Starts{" "}
                      {formatDate(job.startDate)}
                    </p>
                  </div>
                  <Badge variant="outline">{job.status}</Badge>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <span>{formatCents(job.budget)}</span>
                  <span className="text-muted-foreground">
                    {job._count.quotes} quote{job._count.quotes === 1 ? "" : "s"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
