import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { formatCents } from "@/lib/format";
import { TradeChip } from "./trade-chip";

export type WorkerCardData = {
  id: string;
  fullName: string;
  primaryTrade: string;
  homeState: string;
  postcode: string;
  yearsExperience: number;
  hourlyRate: number;
  bio: string;
  credentialCount?: number;
};

/**
 * A worker rendered as a licence-style card: name and rate carry the
 * weight, the trade chip carries the colour, the verified mark carries
 * the trust. Shared by the directory grid and the landing hero deck.
 */
export function WorkerCard({
  worker,
  href,
  compact = false,
}: {
  worker: WorkerCardData;
  href?: string;
  compact?: boolean;
}) {
  const initials = worker.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  const body = (
    <article className="group/wc flex h-full flex-col rounded-lg bg-card ring-1 ring-foreground/10 transition-[box-shadow,transform] group-hover/link:shadow-[0_10px_30px_-12px_rgba(21,34,56,0.35)] group-hover/link:ring-foreground/20">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-bluestone font-heading text-sm font-bold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="display-md truncate text-lg">{worker.fullName}</h3>
          <p className="text-muted-foreground text-sm">
            {worker.homeState} {worker.postcode}
          </p>
        </div>
        <span className="text-verified inline-flex items-center gap-1 text-xs font-semibold">
          <ShieldCheck className="size-4" aria-hidden />
          Verified
        </span>
      </div>
      <div className="flex items-center gap-2 px-4">
        <TradeChip trade={worker.primaryTrade} />
        <span className="text-muted-foreground text-xs">
          {worker.yearsExperience} yrs
        </span>
      </div>
      {!compact && (
        <p className="text-muted-foreground line-clamp-2 px-4 pt-3 text-sm leading-relaxed">
          {worker.bio}
        </p>
      )}
      <div className="mt-auto flex items-baseline justify-between border-t border-dashed px-4 py-3">
        <span className="text-muted-foreground text-xs">Hourly rate</span>
        <span className="font-heading text-lg font-bold tracking-tight">
          {formatCents(worker.hourlyRate).replace(".00", "")}
          <span className="text-muted-foreground text-xs font-medium">/hr</span>
        </span>
      </div>
    </article>
  );

  if (!href) return body;
  return (
    <Link href={href} className="group/link block h-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {body}
    </Link>
  );
}
