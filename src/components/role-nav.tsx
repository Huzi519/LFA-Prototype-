import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export type NavLink = { href: string; label: string };

export async function RoleNav({
  title,
  email,
  userId,
  links,
}: {
  title: string;
  email: string;
  userId: string;
  links: NavLink[];
}) {
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.notification.count({ where: { userId, read: false } }),
  ]);

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            LFA
          </Link>
          <span className="text-muted-foreground text-sm">{title}</span>
          <nav className="flex items-center gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell
            unreadCount={unreadCount}
            notifications={notifications.map((n) => ({
              id: n.id,
              message: n.message,
              link: n.link,
              read: n.read,
              createdAt: formatDateTime(n.createdAt),
            }))}
          />
          <span className="text-muted-foreground text-sm">{email}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
