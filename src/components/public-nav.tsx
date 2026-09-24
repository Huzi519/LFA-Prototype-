import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/lfa/wordmark";

export function PublicNav() {
  return (
    <header className="bg-paper/90 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Wordmark />
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/workers" className="hover:text-hivis transition-colors">
            Find a tradie
          </Link>
          <Link href="/register?tab=worker" className="hover:text-hivis transition-colors">
            Join as a tradie
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            Log in
          </Button>
          <Button nativeButton={false} render={<Link href="/register" />}>
            Register
          </Button>
        </div>
      </div>
    </header>
  );
}
