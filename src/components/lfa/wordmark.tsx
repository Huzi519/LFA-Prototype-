import Link from "next/link";

/** LFA wordmark: a hi-vis square carrying the initials. */
export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">
      <span className="flex size-8 items-center justify-center rounded-[4px] bg-hivis font-heading text-[13px] font-extrabold tracking-tight text-white">
        LFA
      </span>
      <span className={`font-heading text-sm font-semibold leading-tight ${light ? "text-white" : "text-foreground"}`}>
        Labour Workforce
        <br />
        Australia
      </span>
    </Link>
  );
}
