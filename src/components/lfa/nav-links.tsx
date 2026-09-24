"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/components/role-nav";

/** Portal tabs with an active marker; client-side so it can read the path. */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto text-sm font-medium">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative shrink-0 rounded-t-md px-3 py-2.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-hivis/50 ${
              active
                ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-hivis"
                : "text-white/65 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
