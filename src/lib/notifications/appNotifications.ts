import { prisma } from "@/lib/db";
import type { AppNotificationType } from "@prisma/client";
import { logSkippedNotification, notificationsDisabled } from "./devSwitch";

export interface AppNotificationPayload {
  type: AppNotificationType;
  title: string;
  body: string;
  url?: string;
  targetUserId?: string;
}

export async function createAppNotification(payload: AppNotificationPayload): Promise<void> {
  if (notificationsDisabled()) {
    return logSkippedNotification("in-app", `"${payload.title}"`);
  }
  await prisma.appNotification.create({ data: payload });
}

export async function createTargetedAppNotifications(
  userIds: string[],
  payload: Omit<AppNotificationPayload, "targetUserId">
): Promise<void> {
  if (userIds.length === 0) return;
  if (notificationsDisabled()) {
    return logSkippedNotification("in-app", `"${payload.title}" a ${userIds.length} utenti`);
  }
  await prisma.appNotification.createMany({
    data: userIds.map((targetUserId) => ({ ...payload, targetUserId })),
  });
}
