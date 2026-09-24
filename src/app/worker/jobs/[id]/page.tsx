import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { formatCents, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function WorkerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUniqueOrThrow({
    where: { userId: user.id },
  });

  const job = await db.job.findUnique({
    where: { id },
    include: { company: true, conversation: true },
  });
  if (!job || job.workerId !== profile.id) notFound();

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

      {job.conversation && (
        <Link
          href={`/worker/messages/${job.conversation.id}`}
          className="text-sm underline underline-offset-4"
        >
          View conversation & documents
        </Link>
      )}
    </div>
  );
}
