"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  List,
} from "@mui/material";
import NotificationItem from "@/components/notifications/NotificationItem";
import EmptyState from "@/components/EmptyState";
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

export default function NotificheClient({
  initialNotifications,
  initialHasMore,
}: NotificheClientProps) {
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
        if (!res.ok) throw new Error("Errore nel caricamento delle notifiche");
        const data = (await res.json()) as { notifications?: NotifItem[]; hasMore?: boolean };
        const items = data.notifications ?? [];
        setNotifications((prev) => [...prev, ...items]);
        setHasMore(data.hasMore ?? false);
      } catch (err) {
        showToast({
          message: err instanceof Error ? err.message : "Errore nel caricamento",
          severity: "error",
        });
      }
    },
    [showToast]
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

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4" fontWeight={800}>
          Notifiche
        </Typography>
        <Button size="small" onClick={handleMarkAllRead}>
          Segna tutte come lette
        </Button>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<NotificationsNoneIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
          title="Nessuna notifica"
        />
      ) : (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <List disablePadding>
            {notifications.map((n, idx) => (
              <Box key={n.id}>
                <NotificationItem notification={n} onRead={handleRead} />
                {idx < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </Paper>
      )}

      {hasMore && (
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Button
            variant="outlined"
            onClick={loadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loadingMore ? "Caricamento..." : "Carica precedenti"}
          </Button>
        </Box>
      )}
    </Container>
  );
}
