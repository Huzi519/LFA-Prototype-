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
        <h1 className="display-lg text-3xl sm:text-4xl">Search tradespeople</h1>
        <p className="text-muted-foreground mt-1.5 max-w-xl">
          Find and message a live, verified worker directly.
        </p>
      </div>
      <WorkerDirectory filters={filters} variant="company" />
    </div>
  );
}
