import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { Wordmark } from "@/components/lfa/wordmark";
import { NavLinks } from "@/components/lfa/nav-links";
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
    <header className="bg-bluestone text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3">
        <div className="flex items-center gap-3">
          <Wordmark light />
          <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs font-semibold text-white/80">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
          <span className="hidden text-sm text-white/70 sm:inline">{email}</span>
          <SignOutButton />
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-b border-white/10 px-4 pt-2">
        <NavLinks links={links} />
      </div>
    </header>
  );
}
