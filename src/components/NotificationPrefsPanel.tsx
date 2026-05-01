"use client";
import { useState, useEffect } from "react";
import {
  Box, Typography, Alert, Switch, FormControlLabel,
  Divider, CircularProgress, Button, Skeleton,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import {
  CONTROLLABLE_TYPES, NOTIF_TYPE_LABELS, NOTIF_TYPE_DESC,
  mergePrefs, type NotifPrefs, type ControllableNotifType,
} from "@/lib/notifPrefs";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

interface Props {
  initialPrefs: NotifPrefs;
}

export default function NotificationPrefsPanel({ initialPrefs }: Props) {
  // ── Push subscription state ───────────────────────────────────────────────
  const [pushStatus, setPushStatus] = useState<"loading" | "unsupported" | "granted" | "denied" | "default">("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [pushSaving, setPushSaving] = useState(false);
  const [pushError, setPushError] = useState("");

  // ── Preferenze granulari ─────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<NotifPrefs>(initialPrefs);
  const [prefSaving, setPrefSaving] = useState<ControllableNotifType | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPushStatus("unsupported");
      return;
    }
    setPushStatus(Notification.permission as "granted" | "denied" | "default");
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  async function subscribe() {
    setPushSaving(true);
    setPushError("");
    try {
      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) throw new Error("VAPID non configurato");
      const { key } = await keyRes.json();

      const permission = await Notification.requestPermission();
      setPushStatus(permission as "granted" | "denied" | "default");
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
      setPushError((e as Error).message ?? "Errore durante l'attivazione");
    } finally {
      setPushSaving(false);
    }
  }

  async function unsubscribe() {
    setPushSaving(true);
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
      setPushSaving(false);
    }
  }

  async function togglePref(channel: "push" | "inApp", type: ControllableNotifType, value: boolean) {
    const newPrefs: NotifPrefs = {
      ...prefs,
      [channel]: { ...prefs[channel], [type]: value },
    };
    setPrefs(newPrefs);
    setPrefSaving(type);
    try {
      await fetch("/api/users/me/notif-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPrefs),
      });
    } finally {
      setPrefSaving(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (pushStatus === "loading") {
    return <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />;
  }

  return (
    <Box>
      {/* ── Sezione push ────────────────────────────────────────────────────── */}
      <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5 }}>
        Notifiche push
      </Typography>

      {pushStatus === "unsupported" ? (
        <Typography variant="caption" color="text.disabled">
          Le notifiche push non sono supportate da questo browser.
        </Typography>
      ) : pushStatus === "denied" ? (
        <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
          Le notifiche sono bloccate dal browser. Abilitale dalle impostazioni del sito.
        </Alert>
      ) : (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: subscribed ? 1.5 : 0 }}>
            <Button
              variant={subscribed ? "outlined" : "contained"}
              color={subscribed ? "error" : "primary"}
              size="small"
              startIcon={subscribed ? <NotificationsOffIcon /> : <NotificationsIcon />}
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={pushSaving}
            >
              {pushSaving ? "..." : subscribed ? "Disattiva" : "Attiva notifiche push"}
            </Button>
            {subscribed && (
              <Typography variant="caption" color="success.main" fontWeight={600}>
                ✓ Attive su questo dispositivo
              </Typography>
            )}
          </Box>

          {subscribed && (
            <Box sx={{ pl: 1 }}>
              {CONTROLLABLE_TYPES.map((type) => (
                <Box key={type} sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", py: 0.5 }}>
                  <Box sx={{ flex: 1, pr: 1 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.3 }}>{NOTIF_TYPE_LABELS[type]}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {NOTIF_TYPE_DESC[type]}
                    </Typography>
                  </Box>
                  {prefSaving === type ? (
                    <CircularProgress size={20} sx={{ mt: 0.5, flexShrink: 0 }} />
                  ) : (
                    <Switch
                      size="small"
                      checked={prefs.push[type]}
                      onChange={(_, val) => togglePref("push", type, val)}
                      sx={{ flexShrink: 0 }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {pushError && (
        <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
          {pushError}
        </Typography>
      )}

      <Divider sx={{ my: 2 }} />

      {/* ── Sezione notifiche in-app ─────────────────────────────────────────── */}
      <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5 }}>
        Notifiche nell&apos;app
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        Controlla quali tipi di notifiche appaiono nel centro notifiche.
      </Typography>

      <Box sx={{ pl: 1 }}>
        {CONTROLLABLE_TYPES.map((type) => (
          <FormControlLabel
            key={type}
            control={
              prefSaving === type ? (
                <CircularProgress size={20} sx={{ mx: 1.25 }} />
              ) : (
                <Switch
                  size="small"
                  checked={prefs.inApp[type]}
                  onChange={(_, val) => togglePref("inApp", type, val)}
                />
              )
            }
            label={
              <Box>
                <Typography variant="body2">{NOTIF_TYPE_LABELS[type]}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {NOTIF_TYPE_DESC[type]}
                </Typography>
              </Box>
            }
            sx={{ alignItems: "flex-start", mb: 0.5, ml: 0 }}
          />
        ))}
      </Box>
    </Box>
  );
}
