"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";

export type NotificationItem = {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string; // pre-formatted, server passes a display string
};

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleClick(item: NotificationItem) {
    startTransition(async () => {
      if (!item.read) await markNotificationRead(item.id);
      if (item.link) router.push(item.link);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="bg-hivis absolute text-white -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-muted-foreground text-xs font-medium">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-muted-foreground text-xs font-normal underline underline-offset-4"
              onClick={() => startTransition(() => markAllNotificationsRead())}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-sm">
            No notifications yet.
          </p>
        ) : (
          notifications.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => handleClick(item)}
              className="flex flex-col items-start gap-0.5 whitespace-normal"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className={item.read ? "text-muted-foreground" : "font-medium"}>
                  {item.message}
                </span>
                {!item.read && (
                  <Badge className="shrink-0" variant="default">
                    New
                  </Badge>
                )}
              </div>
              <span className="text-muted-foreground text-xs">{item.createdAt}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
