import { WorkerDirectory } from "@/components/worker-directory";

export default async function PublicWorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ trade?: string; state?: string; q?: string }>;
}) {
  const filters = await searchParams;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="display-lg text-4xl sm:text-5xl">Find a tradie</h1>
        <p className="text-muted-foreground mt-3 max-w-xl">
          Every profile here holds an admin-checked licence. Log in as a
          company to message someone directly.
        </p>
      </div>
      <WorkerDirectory filters={filters} variant="public" />
    </div>
  );
}
