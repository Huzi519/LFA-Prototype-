"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  // Ownership check — never trust the client-supplied ID alone.
  await db.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
