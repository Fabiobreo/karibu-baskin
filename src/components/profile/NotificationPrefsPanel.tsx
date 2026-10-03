"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Button,
  Skeleton,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { useTranslations } from "next-intl";
import {
  CONTROLLABLE_TYPES,
  mergePrefs,
  type NotifPrefs,
  type ControllableNotifType,
} from "@/lib/notifications/notifPrefs";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import {
  createPushSubscription,
  rememberPushChoice,
  savePushSubscription,
} from "@/lib/pushSubscription";

interface Props {
  initialPrefs: NotifPrefs;
}

export default function NotificationPrefsPanel({ initialPrefs }: Props) {
  const t = useTranslations("notifPanel");
  const tNav = useTranslations("nav");
  const tTypes = useTranslations("notifTypes");

  // ── Push subscription state ───────────────────────────────────────────────
  const [pushStatus, setPushStatus] = useState<
    "loading" | "unsupported" | "granted" | "denied" | "default"
  >("loading");
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
      const permission = await Notification.requestPermission();
      setPushStatus(permission as "granted" | "denied" | "default");
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await createPushSubscription(reg).catch((e: Error) => {
        throw new Error(e.message === "vapid" ? t("vapidError") : e.message);
      });
      // Prima il "sì" risultava attivo anche se il server non l'aveva salvato.
      if (!(await savePushSubscription(sub))) throw new Error(t("activationError"));
      rememberPushChoice(true);
      setSubscribed(true);
    } catch (e) {
      setPushError((e as Error).message ?? t("activationError"));
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
      // Spente da qui: all'apertura dell'app non si ricreano da sole.
      rememberPushChoice(false);
      setSubscribed(false);
    } finally {
      setPushSaving(false);
    }
  }

  async function togglePref(
    channel: "push" | "inApp",
    type: ControllableNotifType,
    value: boolean
  ) {
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
    return <Skeleton variant="rectangular" height={120} sx={{ borderRadius: RADIUS.lg }} />;
  }

  return (
    <Box>
      {/* ── Sezione push ────────────────────────────────────────────────────── */}
      <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} sx={{ mb: 1.5 }}>
        {t("pushTitle")}
      </Typography>

      {pushStatus === "unsupported" ? (
        <Typography variant="caption" color="text.secondary">
          {t("unsupported")}
        </Typography>
      ) : pushStatus === "denied" ? (
        <Alert severity="warning" sx={{ fontSize: TYPE_SCALE.xs }}>
          {t("denied")}
        </Alert>
      ) : (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            {t("pushDesc")}{" "}
            <a href="/privacy" style={{ color: "inherit" }}>
              {tNav("privacyPolicy")}
            </a>
            .
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: subscribed ? 1.5 : 0 }}>
            <Button
              variant={subscribed ? "outlined" : "contained"}
              color={subscribed ? "error" : "primary"}
              size="small"
              startIcon={subscribed ? <NotificationsOffIcon /> : <NotificationsIcon />}
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={pushSaving}
            >
              {pushSaving ? "..." : subscribed ? t("deactivate") : t("activate")}
            </Button>
            {subscribed && (
              <Typography variant="caption" color="success.main" fontWeight={FONT_WEIGHT.semibold}>
                {t("activeOnDevice")}
              </Typography>
            )}
          </Box>

          {subscribed && (
            <Box sx={{ pl: 1 }}>
              {CONTROLLABLE_TYPES.map((type) => (
                <Box
                  key={type}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    py: 0.5,
                  }}
                >
                  <Box sx={{ flex: 1, pr: 1 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                      {tTypes(type)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {tTypes(`${type}_desc`)}
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
      <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} sx={{ mb: 1.5 }}>
        {t("inAppTitle")}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        {t("inAppDesc")}
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
                <Typography variant="body2">{tTypes(type)}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {tTypes(`${type}_desc`)}
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
