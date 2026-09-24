import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="space-y-6">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="space-y-1">
          <label htmlFor="trade" className="text-sm font-medium">
            Trade
          </label>
          <select
            id="trade"
            name="trade"
            defaultValue={trade ?? ""}
            className="border-input flex h-9 w-40 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="">Any trade</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="state" className="text-sm font-medium">
            State
          </label>
          <select
            id="state"
            name="state"
            defaultValue={state ?? ""}
            className="border-input flex h-9 w-32 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="">Any state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="q" className="text-sm font-medium">
            Keyword
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name or bio…"
            className="border-input flex h-9 w-56 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium"
        >
          Search
        </button>
      </form>

      <p className="text-muted-foreground text-sm">
        {workers.length} tradesperson{workers.length === 1 ? "" : "s"} found.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <Link key={worker.id} href={profileHref(worker.id)}>
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{worker.fullName}</CardTitle>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{worker.primaryTrade}</Badge>
                  <Badge variant="outline">{worker.homeState}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground line-clamp-2">{worker.bio}</p>
                <p>{worker.yearsExperience} years&apos; experience</p>
                <p className="font-medium">{formatCents(worker.hourlyRate)}/hr</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {workers.length === 0 && (
        <p className="text-muted-foreground text-center text-sm">
          No tradespeople match those filters yet.
        </p>
      )}
    </div>
  );
}
