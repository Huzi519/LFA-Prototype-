import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="bg-bluestone mt-auto text-primary-foreground">
      <div className="tape" />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Wordmark light />
          <p className="max-w-xs text-sm text-white/70">
            Licensed tradespeople, hired direct. A prototype built for
            demonstration only.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
          <Link href="/workers" className="hover:text-hivis">Find a tradie</Link>
          <Link href="/register?tab=company" className="hover:text-hivis">Register a company</Link>
          <Link href="/register?tab=worker" className="hover:text-hivis">Join as a tradie</Link>
          <Link href="/login" className="hover:text-hivis">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
