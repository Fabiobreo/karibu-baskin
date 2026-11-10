"use client";
import { createContext, useContext, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PUSH_RECEIVED_MESSAGE } from "@/lib/pushMessages";

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

const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

/**
 * Ogni quanto si richiede il contatore mentre il sito è aperto e visibile.
 * Non serve più spesso: una push che arriva con l'app aperta lo aggiorna
 * subito (messaggio del service worker), e al ritorno sull'app lo aggiorna
 * `refetchOnWindowFocus`. Era 30 secondi: ogni telefono con il sito aperto
 * accendeva una funzione due volte al minuto.
 */
const UNREAD_COUNT_INTERVAL_MS = 3 * 60_000;

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications/unread-count");
  if (!res.ok) throw new Error(`unread-count ${res.status}`);
  const data = (await res.json()) as { count?: number };
  return data.count ?? 0;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const authenticated = status === "authenticated";

  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchUnreadCount,
    enabled: authenticated,
    // A scheda nascosta React Query non interroga (refetchIntervalInBackground
    // è false di default); al ritorno ci pensa refetchOnWindowFocus.
    refetchInterval: UNREAD_COUNT_INTERVAL_MS,
    refetchOnWindowFocus: true,
    // Il contatore è un dettaglio: se la rete manca, resta l'ultimo valore.
    retry: false,
  });

  const refreshCount = useCallback(() => {
    if (authenticated) void refetch();
  }, [authenticated, refetch]);

  // Push arrivata con l'app aperta: il service worker lo dice alle pagine.
  useEffect(() => {
    if (!authenticated || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === PUSH_RECEIVED_MESSAGE) refreshCount();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [authenticated, refreshCount]);

  const markAllRead = useCallback(async () => {
    // Parte da un timer (pagina e tendina le segnano da sole): se la rete
    // manca non deve restare un errore non gestito, e il contatore non si
    // azzera finché il server non ha davvero segnato.
    const res = await fetch("/api/notifications/read-all", { method: "PATCH" }).catch(() => null);
    if (res?.ok) queryClient.setQueryData(UNREAD_COUNT_KEY, 0);
  }, [queryClient]);

  const effectiveUnreadCount = authenticated ? unreadCount : 0;

  return (
    <NotificationContext.Provider
      value={{ unreadCount: effectiveUnreadCount, refreshCount, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
