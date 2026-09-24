import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatCents, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/lfa/status-badge";

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
    include: { worker: true, conversation: true },
  });
  if (!job || job.companyId !== company.id) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {job.trade}, {job.state} {job.postcode}, Starts{" "}
              {formatDate(job.startDate)}, Budget {formatCents(job.budget)}
            </p>
          </div>
          <StatusBadge status={job.status} />
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{job.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hired worker</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <div>
            <p className="font-medium">{job.worker.fullName}</p>
            <p className="text-muted-foreground mt-1.5 max-w-xl">
              {job.worker.primaryTrade}, {job.worker.homeState}
            </p>
          </div>
          {job.conversation && (
            <Link
              href={`/company/messages/${job.conversation.id}`}
              className="text-sm underline underline-offset-4"
            >
              View conversation & documents
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
