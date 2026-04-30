"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface NotificationContextValue {
  unreadCount: number;
  refreshCount: () => void;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refreshCount: () => {},
  markAllRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json() as { count?: number };
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // silenzioso
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCount();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchCount();
    }, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, fetchCount]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setUnreadCount(0);
  }, []);

  const effectiveUnreadCount = status === "authenticated" ? unreadCount : 0;

  return (
    <NotificationContext.Provider value={{ unreadCount: effectiveUnreadCount, refreshCount: fetchCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
