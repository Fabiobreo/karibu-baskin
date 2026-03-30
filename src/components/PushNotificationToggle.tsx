"use client";
import { useState, useEffect } from "react";
import { Box, Button, Typography, Alert } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushNotificationToggle() {
  const [status, setStatus] = useState<"loading" | "unsupported" | "granted" | "denied" | "default">("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as "granted" | "denied" | "default");

    // Controlla se è già iscritto
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  async function subscribe() {
    setSaving(true);
    setError("");
    try {
      // Ottieni chiave pubblica VAPID
      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) throw new Error("VAPID non configurato");
      const { key } = await keyRes.json();

      const permission = await Notification.requestPermission();
      setStatus(permission as "granted" | "denied" | "default");
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      setSubscribed(true);
    } catch (e) {
      setError((e as Error).message ?? "Errore durante l'attivazione");
    } finally {
      setSaving(false);
    }
  }

  async function unsubscribe() {
    setSaving(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <Typography variant="caption" color="text.disabled">
        Le notifiche push non sono supportate da questo browser.
      </Typography>
    );
  }

  return (
    <Box>
      {status === "denied" ? (
        <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
          Le notifiche sono bloccate dal browser. Abilitale dalle impostazioni del sito.
        </Alert>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant={subscribed ? "outlined" : "contained"}
            color={subscribed ? "error" : "primary"}
            size="small"
            startIcon={subscribed ? <NotificationsOffIcon /> : <NotificationsIcon />}
            onClick={subscribed ? unsubscribe : subscribe}
            disabled={saving}
          >
            {saving
              ? "..."
              : subscribed
              ? "Disattiva notifiche"
              : "Attiva notifiche"}
          </Button>
          {subscribed && (
            <Typography variant="caption" color="success.main" fontWeight={600}>
              ✓ Notifiche attive su questo dispositivo
            </Typography>
          )}
        </Box>
      )}
      {error && (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
