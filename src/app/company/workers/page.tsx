import { requireRole } from "@/lib/auth";
import { Role } from "@/generated/prisma";
import { WorkerDirectory } from "@/components/worker-directory";

export default async function CompanyWorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ trade?: string; state?: string; q?: string }>;
}) {
  await requireRole(Role.COMPANY);
  const filters = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Search tradespeople</h1>
        <p className="text-muted-foreground">
          Find and message a live, verified worker directly.
        </p>
      </div>
      <WorkerDirectory filters={filters} variant="company" />
    </div>
  );
}
