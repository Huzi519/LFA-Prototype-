import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCents, formatDate } from "@/lib/format";

export default async function CompanyDashboardPage() {
  const user = await requireRole(Role.COMPANY);
  const profile = await db.companyProfile.findUnique({
    where: { userId: user.id },
  });

  const recentJobs = profile
    ? await db.job.findMany({
        where: { companyId: profile.id },
        include: { worker: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {profile?.companyName ?? "Company"} dashboard
          </h1>
          <p className="text-muted-foreground">
            Search for tradespeople, message them and hire directly.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/company/workers" />}>
          Search workers
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Verified:{" "}
            <Badge variant={profile?.verified ? "default" : "outline"}>
              {profile?.verified ? "Yes" : "Not yet"}
            </Badge>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent jobs</CardTitle>
          <Link href="/company/jobs" className="text-sm underline underline-offset-4">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You haven&apos;t hired anyone yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/company/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span>
                      {job.title} · {job.worker.fullName} · Starts{" "}
                      {formatDate(job.startDate)} · {formatCents(job.budget)}
                    </span>
                    <Badge variant="outline">{job.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
