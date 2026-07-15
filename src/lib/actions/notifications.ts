"use server";

import "server-only";
import {
  getNotifications,
  markNotificationsSeen,
  type NotificationItem,
} from "@/lib/store";

export async function getNotificationsAction(): Promise<{
  items: NotificationItem[];
  unreadCount: number;
} | null> {
  try {
    return await getNotifications();
  } catch {
    return null;
  }
}

export async function markNotificationsSeenAction(): Promise<void> {
  try {
    await markNotificationsSeen();
  } catch {
    // Non-fatal — the dot just stays until the next successful open.
  }
}
