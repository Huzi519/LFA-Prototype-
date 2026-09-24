import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  await requireRole(Role.ADMIN);

  const [pendingDocuments, totalUsers, totalJobs] = await Promise.all([
    db.document.count({ where: { status: "PENDING_REVIEW" } }),
    db.user.count(),
    db.job.count(),
  ]);

  const stats = [
    { label: "Documents awaiting review", value: pendingDocuments },
    { label: "Total jobs posted", value: totalJobs },
    { label: "Total users", value: totalUsers },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="text-muted-foreground">Document review queue.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingDocuments > 0 && (
        <Link
          href="/admin/documents"
          className="text-sm underline underline-offset-4"
        >
          Review pending documents →
        </Link>
      )}
    </div>
  );
}
