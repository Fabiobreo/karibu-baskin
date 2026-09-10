"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { Typography, Box, Button, CircularProgress, Divider, Paper, List } from "@mui/material";
import { useTranslations } from "next-intl";
import { isToday, isThisWeek } from "date-fns";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import NotificationItem from "@/components/notifications/NotificationItem";
import EmptyState from "@/components/common/EmptyState";
import { useNotifications } from "@/context/NotificationContext";
import { useToast } from "@/context/ToastContext";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  createdAt: string;
  isRead: boolean;
}

interface NotificheClientProps {
  initialNotifications: NotifItem[];
  initialHasMore: boolean;
}

type GroupKey = "today" | "week" | "earlier";

const GROUP_ORDER: GroupKey[] = ["today", "week", "earlier"];

function groupOf(iso: string): GroupKey {
  const d = new Date(iso);
  if (isToday(d)) return "today";
  // weekStartsOn 1: la settimana italiana comincia di lunedì.
  if (isThisWeek(d, { weekStartsOn: 1 })) return "week";
  return "earlier";
}

export default function NotificheClient({
  initialNotifications,
  initialHasMore,
}: NotificheClientProps) {
  const t = useTranslations("pages");
  const { markAllRead, refreshCount } = useNotifications();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotifItem[]>(initialNotifications);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (p: number) => {
      try {
        const res = await fetch(`/api/notifications?limit=20&page=${p}`);
        if (!res.ok) throw new Error(t("notifiche.loadError"));
        const data = (await res.json()) as { notifications?: NotifItem[]; hasMore?: boolean };
        const items = data.notifications ?? [];
        setNotifications((prev) => [...prev, ...items]);
        setHasMore(data.hasMore ?? false);
      } catch (err) {
        showToast({
          message: err instanceof Error ? err.message : t("notifiche.loadError"),
          severity: "error",
        });
      }
    },
    [showToast, t]
  );

  // Auto-mark as read dopo 1.5s dall'apertura della pagina
  useEffect(() => {
    if (!notifications.some((n) => !n.isRead)) return;
    const timer = setTimeout(async () => {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "3 mesi fa" ripetuto sette volte non dice niente: le notifiche si leggono
  // per blocchi temporali. L'elenco arriva già ordinato dal più recente.
  const groups = useMemo(() => {
    const byGroup = new Map<GroupKey, NotifItem[]>();
    for (const n of notifications) {
      const k = groupOf(n.createdAt);
      const arr = byGroup.get(k) ?? [];
      arr.push(n);
      byGroup.set(k, arr);
    }
    return GROUP_ORDER.filter((k) => byGroup.has(k)).map((k) => ({
      key: k,
      items: byGroup.get(k)!,
    }));
  }, [notifications]);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPage(nextPage);
    setLoadingMore(false);
  }

  async function handleMarkAllRead() {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    refreshCount();
  }

  const groupLabel: Record<GroupKey, string> = {
    today: t("notifiche.groupToday"),
    week: t("notifiche.groupThisWeek"),
    earlier: t("notifiche.groupEarlier"),
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          size="small"
          onClick={handleMarkAllRead}
          disabled={!hasUnread}
          startIcon={<DoneAllIcon sx={{ fontSize: "1rem !important" }} />}
          sx={{ fontWeight: 700 }}
        >
          {t("notifiche.markAllRead")}
        </Button>
      </Box>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<NotificationsNoneIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
          title={t("notifiche.empty")}
          message={t("notifiche.emptyDesc")}
        />
      ) : (
        groups.map((group) => (
          <Box key={group.key} sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              fontWeight={800}
              color="text.secondary"
              sx={{ letterSpacing: "0.08em", display: "block", mb: 1 }}
            >
              {groupLabel[group.key]} ({group.items.length})
            </Typography>
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <List disablePadding>
                {group.items.map((n, idx) => (
                  <Box key={n.id}>
                    <NotificationItem notification={n} onRead={handleRead} />
                    {idx < group.items.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Paper>
          </Box>
        ))
      )}

      {hasMore && (
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Button
            variant="outlined"
            onClick={loadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loadingMore ? t("notifiche.loading") : t("notifiche.loadMore")}
          </Button>
        </Box>
      )}
    </>
  );
}
