import { db } from "@/lib/db";
import { Search } from "lucide-react";
import { WorkerCard } from "@/components/lfa/worker-card";

const TRADES = ["PLUMBER", "ELECTRICIAN", "CARPENTER", "LABOURER"] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

export type DirectoryFilters = {
  trade?: string;
  state?: string;
  q?: string;
};

/**
 * The worker search/browse UI, shared by the public directory (/workers)
 * and the logged-in company one (/company/workers) — same query and card
 * rendering, only the link target and the surrounding page chrome differ.
 */
export async function WorkerDirectory({
  filters,
  variant,
}: {
  filters: DirectoryFilters;
  variant: "public" | "company";
}) {
  const trade = TRADES.includes(filters.trade as (typeof TRADES)[number])
    ? filters.trade
    : undefined;
  const state = STATES.includes(filters.state as (typeof STATES)[number])
    ? filters.state
    : undefined;
  const q = filters.q?.trim();

  const workers = await db.workerProfile.findMany({
    where: {
      profileStatus: "LIVE",
      ...(trade ? { primaryTrade: trade as (typeof TRADES)[number] } : {}),
      ...(state ? { homeState: state as (typeof STATES)[number] } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q } },
              { bio: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const profileHref = (id: string) =>
    variant === "public" ? `/workers/${id}` : `/company/workers/${id}`;

  const selectClass =
    "h-10 rounded-md border border-input bg-card px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-3 rounded-lg bg-secondary p-3"
        method="get"
      >
        <div className="space-y-1">
          <label htmlFor="trade" className="text-muted-foreground block text-xs font-medium">
            Trade
          </label>
          <select id="trade" name="trade" defaultValue={trade ?? ""} className={`${selectClass} w-40`}>
            <option value="">Any trade</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="state" className="text-muted-foreground block text-xs font-medium">
            State
          </label>
          <select id="state" name="state" defaultValue={state ?? ""} className={`${selectClass} w-32`}>
            <option value="">Any state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <label htmlFor="q" className="text-muted-foreground block text-xs font-medium">
            Keyword
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name or skill"
            className={`${selectClass} w-full font-normal`}
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors hover:bg-bluestone-deep focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Search className="size-4" aria-hidden />
          Search
        </button>
      </form>

      <p className="text-muted-foreground text-sm">
        <span className="text-foreground font-semibold">{workers.length}</span>{" "}
        {workers.length === 1 ? "tradie" : "tradies"} available
        {trade ? ` in ${trade.toLowerCase()}` : ""}
        {state ? ` across ${state}` : ""}.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} href={profileHref(worker.id)} />
        ))}
      </div>

      {workers.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-semibold">No tradies match those filters yet.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Try a different state, or clear the keyword.
          </p>
        </div>
      )}
    </div>
  );
}
