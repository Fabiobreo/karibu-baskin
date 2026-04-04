"use client";
import { useEffect, useState } from "react";
import {
  Box, Button, Divider, List, Skeleton, Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import NotificationItem from "./NotificationItem";

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
  const router = useRouter();
  const { markAllRead, refreshCount } = useNotifications();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications?limit=6")
      .then((r) => r.json())
      .then((data: { notifications?: NotifItem[] }) => {
        setNotifications(data.notifications ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkAllRead() {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    refreshCount();
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
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Notifiche
        </Typography>
        <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: "0.75rem" }}>
          Segna tutte lette
        </Button>
      </Box>
      <Divider />

      {/* Lista */}
      {loading ? (
        <Box sx={{ px: 2, py: 1.5 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rectangular" height={64} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Nessuna notifica
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ overflowY: "auto", flex: 1 }}>
          {notifications.map((n, idx) => (
            <Box key={n.id}>
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
          sx={{ py: 1.25, fontSize: "0.8rem" }}
          onClick={() => {
            router.push("/notifiche");
            onClose();
          }}
        >
          Mostra tutte
        </Button>
      </Box>
    </Box>
  );
}
