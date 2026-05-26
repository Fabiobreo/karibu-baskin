import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { mergePrefs, CONTROLLABLE_TYPES } from "@/lib/notifPrefs";
import type { AppNotificationType } from "@prisma/client";
import SiteHeader from "@/components/SiteHeader";
import NotificheClient from "@/components/NotificheClient";

const LIMIT = 20;

export default async function NotifichePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifPrefs: true, createdAt: true },
  });
  const prefs = mergePrefs(user?.notifPrefs);
  const disabledTypes = CONTROLLABLE_TYPES.filter((t) => !prefs.inApp[t]) as AppNotificationType[];
  const joinedAt = user?.createdAt ?? new Date(0);

  const visibleFilter = {
    OR: [{ targetUserId: null, createdAt: { gte: joinedAt } }, { targetUserId: userId }],
    ...(disabledTypes.length > 0 && { NOT: { type: { in: disabledTypes } } }),
  };

  const [notifications, total] = await Promise.all([
    prisma.appNotification.findMany({
      where: visibleFilter,
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      include: {
        reads: { where: { userId }, select: { readAt: true } },
      },
    }),
    prisma.appNotification.count({ where: visibleFilter }),
  ]);

  const initialNotifications = notifications.map((n) => ({
    id: n.id,
    type: n.type as string,
    title: n.title,
    body: n.body,
    url: n.url ?? null,
    createdAt: n.createdAt.toISOString(),
    isRead: n.reads.length > 0,
  }));

  return (
    <>
      <SiteHeader />
      <NotificheClient initialNotifications={initialNotifications} initialHasMore={LIMIT < total} />
    </>
  );
}
