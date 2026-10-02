"use client";
import { useEffect, useState } from "react";
import { Box, Button, Divider, List, Skeleton, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/context/NotificationContext";
import NotificationItem from "./NotificationItem";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const t = useTranslations("pages.notifiche");
  const { refreshCount } = useNotifications();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Aprire la tendina vuol dire aver visto queste notifiche: si segnano lette
  // subito sul server, e solo quelle mostrate (le altre restano non lette e il
  // contatore le conta ancora). A schermo il segno "non letta" resta finché la
  // tendina è aperta: serve a capire quali sono le nuove.
  useEffect(() => {
    fetch("/api/notifications?limit=6")
      .then((r) => r.json())
      .then((data: { notifications?: NotifItem[] }) => {
        const items = data.notifications ?? [];
        setNotifications(items);
        const unread = items.filter((n) => !n.isRead);
        if (unread.length === 0) return;
        void Promise.allSettled(
          unread.map((n) => fetch(`/api/notifications/${n.id}`, { method: "PATCH" }))
        ).then(() => refreshCount());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  return (
    <Box
      sx={{
        width: { xs: "90vw", sm: 380 },
        maxHeight: 480,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header: niente "Segna tutte lette", si segnano da sole (UX-42). */}
      <Box sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Typography variant="subtitle1">{t("heroTitle")}</Typography>
      </Box>
      <Divider />

      {/* Lista */}
      {loading ? (
        <Box sx={{ px: 2, py: 1.5 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={64}
              sx={{ mb: 1, borderRadius: RADIUS.md }}
            />
          ))}
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {t("empty")}
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ overflowY: "auto", flex: 1 }}>
          {notifications.map((n, idx) => (
            <Box component="li" key={n.id} sx={{ listStyle: "none" }}>
              <NotificationItem notification={n} onRead={handleRead} />
              {idx < notifications.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}

      {/* Footer */}
      <Divider />
      <Box sx={{ flexShrink: 0 }}>
        <Button
          fullWidth
          size="small"
          href="/notifiche"
          sx={{ py: 1.25, fontSize: TYPE_SCALE.xs }}
          onClick={onClose}
        >
          {t("showAll")}
        </Button>
      </Box>
    </Box>
  );
}
