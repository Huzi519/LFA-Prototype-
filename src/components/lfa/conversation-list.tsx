import Link from "next/link";
import { StatusBadge } from "./status-badge";

export type ConversationRow = {
  id: string;
  href: string;
  name: string;
  subtitle: string;
  jobStatus: string | null;
  lastMessage: string | null;
  lastAt: string | null;
};

/** Inbox-style list shared by the company and worker message pages. */
export function ConversationList({ rows }: { rows: ConversationRow[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      {rows.map((row) => {
        const initials = row.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
        return (
          <li key={row.id}>
            <Link
              href={row.href}
              className="flex items-start gap-4 px-4 py-4 transition-colors hover:bg-secondary focus-visible:bg-secondary outline-none"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-bluestone font-heading text-sm font-bold text-primary-foreground">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{row.name}</span>
                  <span className="text-muted-foreground text-xs">{row.subtitle}</span>
                  {row.jobStatus && <StatusBadge status={row.jobStatus} />}
                </span>
                <span className="text-muted-foreground mt-1 block truncate text-sm">
                  {row.lastMessage ?? "No messages yet."}
                </span>
              </span>
              {row.lastAt && (
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{row.lastAt}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
