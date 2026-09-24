import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Wordmark } from "./wordmark";

/**
 * Split layout for login and register: a bluestone statement panel on the
 * left, the form on the right.
 */
export function AuthShell({
  children,
  statement,
  aside,
}: {
  children: React.ReactNode;
  statement: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="bg-bluestone relative flex flex-col justify-between p-6 text-white lg:p-10">
        <Wordmark light />
        <div className="py-12 lg:py-0">
          <h1 className="display-xl text-4xl sm:text-5xl">{statement}</h1>
          <ul className="mt-8 space-y-3 text-sm text-white/75">
            <li className="flex gap-3">
              <ShieldCheck className="text-hivis size-5 shrink-0" aria-hidden />
              Every licence on the platform is checked by an admin.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="text-hivis size-5 shrink-0" aria-hidden />
              Documents are reviewed before the other party can open them.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="text-hivis size-5 shrink-0" aria-hidden />
              No job board. You choose who you talk to.
            </li>
          </ul>
        </div>
        <div className="hidden lg:block">{aside}</div>
        <div className="tape absolute inset-x-0 bottom-0" />
      </aside>
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">{children}</div>
        <p className="text-muted-foreground mx-auto mt-10 w-full max-w-md text-xs">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Back to the directory
          </Link>
        </p>
      </div>
    </div>
  );
}
