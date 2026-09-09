"use client";
import { useCallback, useEffect, useState } from "react";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import IosShareIcon from "@mui/icons-material/IosShare";
import InstallMobileIcon from "@mui/icons-material/InstallMobile";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/lib/useHasMounted";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "kb-install-dismissed";
const COOKIE_KEY = "kb-cookie-consent";
/** Dopo un rifiuto non riproponiamo il banner per 30 giorni. */
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
/** Ritardo prima di proporre l'installazione: prima l'utente guarda il sito. */
const INITIAL_DELAY_MS = 20_000;

function isSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < SNOOZE_MS;
  } catch {
    return false;
  }
}

function cookieBannerClosed(): boolean {
  try {
    return localStorage.getItem(COOKIE_KEY) !== null;
  } catch {
    return true;
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari espone questo flag non standard
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  // Esclude i browser in-app (Instagram, Facebook, ecc.) dove l'installazione non esiste
  return !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line|Twitter/.test(ua);
}

export default function InstallPrompt() {
  const t = useTranslations("install");
  const mounted = useHasMounted();
  // L'evento puo essere gia arrivato prima dell'idratazione (script in layout.tsx).
  // Nessun rischio di mismatch: il primo render e comunque null finche non e montato.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window === "undefined"
      ? null
      : ((window as Window & { __kbInstallPrompt?: BeforeInstallPromptEvent }).__kbInstallPrompt ??
        null)
  );
  const [visible, setVisible] = useState(false);

  // iOS non emette mai beforeinstallprompt: la sola via è l'istruzione manuale.
  const iosMode = mounted && isIosSafari() && !isStandalone() && !isSnoozed();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || isSnoozed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Mostra il banner solo dopo il ritardo iniziale e quando il banner cookie è già stato chiuso.
  useEffect(() => {
    if (!deferred && !iosMode) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      if (cookieBannerClosed()) {
        setVisible(true);
        return;
      }
      interval = setInterval(() => {
        if (cookieBannerClosed()) {
          setVisible(true);
          if (interval) clearInterval(interval);
        }
      }, 3000);
    }, INITIAL_DELAY_MS);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [deferred, iosMode]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* localStorage non disponibile: il banner riapparirà alla prossima visita */
    }
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    setVisible(false);
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "dismissed") dismiss();
  }, [deferred, dismiss]);

  if (!mounted || !visible) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: { xs: 68, md: 16 },
        left: { xs: 8, md: "auto" },
        right: { xs: 8, md: 24 },
        width: { md: 420 },
        zIndex: 1400,
        p: 2.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
        <InstallMobileIcon sx={{ color: "primary.main", mt: 0.25, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            {t("title")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {t("body")}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={dismiss}
          aria-label={t("later")}
          sx={{ mt: -0.5, mr: -0.5 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {iosMode && !deferred ? (
        <Box sx={{ mt: 1.5, pl: 4.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <IosShareIcon fontSize="small" sx={{ color: "primary.main" }} />
            <Typography variant="caption" color="text.secondary">
              {t("iosStep1")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AddBoxOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
            <Typography variant="caption" color="text.secondary">
              {t("iosStep2")}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 1.5 }}>
          <Button size="small" variant="outlined" onClick={dismiss} sx={{ fontWeight: 600 }}>
            {t("later")}
          </Button>
          <Button size="small" variant="contained" onClick={install} sx={{ fontWeight: 700 }}>
            {t("install")}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
