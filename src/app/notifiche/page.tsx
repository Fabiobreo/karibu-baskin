import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@mui/material";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { mergePrefs, CONTROLLABLE_TYPES } from "@/lib/notifications/notifPrefs";
import type { AppNotificationType } from "@prisma/client";
import NotificheClient from "@/components/notifications/NotificheClient";
import PageHero from "@/components/common/PageHero";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Notifiche",
  description: "Le tue notifiche dal Karibu Baskin.",
  path: "/notifiche",
  noindex: true,
});

const LIMIT = 20;

export default async function NotifichePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const t = await getTranslations("pages.notifiche");

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
      <PageHero
        chip={t("heroChip")}
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        subtitleMaxWidth={520}
      />
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <NotificheClient
          initialNotifications={initialNotifications}
          initialHasMore={LIMIT < total}
        />
      </Container>
    </>
  );
}
