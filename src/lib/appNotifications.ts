import { prisma } from "@/lib/db";
import type { AppNotificationType } from "@prisma/client";

export interface AppNotificationPayload {
  type: AppNotificationType;
  title: string;
  body: string;
  url?: string;
  targetUserId?: string;
}

export async function createAppNotification(payload: AppNotificationPayload): Promise<void> {
  await prisma.appNotification.create({ data: payload });
}
