"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container, Typography, Box, Button, CircularProgress,
  Divider, Paper, List,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import NotificationItem from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/context/NotificationContext";

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  createdAt: string;
  isRead: boolean;
}

export default function NotifichePage() {
  const { status } = useSession();
  const router = useRouter();
  const { markAllRead, refreshCount } = useNotifications();

  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    try {
      const res = await fetch(`/api/notifications?limit=20&page=${p}`);
      if (!res.ok) return;
      const data = await res.json() as { notifications?: NotifItem[]; hasMore?: boolean };
      const items = data.notifications ?? [];
      setNotifications((prev) => append ? [...prev, ...items] : items);
      setHasMore(data.hasMore ?? false);
    } catch {
      // silenzioso
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchPage(1, false).finally(() => setLoading(false));
    }
  }, [status, router, fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPage(nextPage, true);
    setLoadingMore(false);
  }

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

  if (status === "loading" || loading) {
    return (
      <>
        <SiteHeader />
        <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Notifiche
          </Typography>
          <Button size="small" onClick={handleMarkAllRead}>
            Segna tutte come lette
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {/* Lista */}
        {notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 6 }}>
            Nessuna notifica
          </Typography>
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

        {/* Carica precedenti */}
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
    </>
  );
}
