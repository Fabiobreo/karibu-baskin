"use client";
import { useCallback, useEffect, useState } from "react";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import IosShareIcon from "@mui/icons-material/IosShare";
import InstallMobileIcon from "@mui/icons-material/InstallMobile";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/lib/useHasMounted";
import { isStandaloneApp as isStandalone } from "@/lib/tabNavigation";
import { RADIUS } from "@/lib/radius";
import {
  INSTALL_STATE_KEY,
  LEGACY_DISMISS_KEY,
  canShowInstallPrompt,
  parseInstallState,
  recordDismissed,
  recordShown,
  type InstallPromptState,
} from "@/lib/installPrompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const COOKIE_KEY = "kb-cookie-consent";
/** Ritardo prima di proporre l'installazione: prima l'utente guarda il sito. */
const INITIAL_DELAY_MS = 20_000;

/**
 * Stato condiviso fra pagine e schede (`localStorage`): quante volte il banner
 * e' comparso, quando, e l'ultimo rifiuto. Le regole stanno in
 * `@/lib/installPrompt`.
 */
function readState(): InstallPromptState {
  try {
    return parseInstallState(
      localStorage.getItem(INSTALL_STATE_KEY),
      localStorage.getItem(LEGACY_DISMISS_KEY)
    );
  } catch {
    return parseInstallState(null);
  }
}

function writeState(state: InstallPromptState) {
  try {
    localStorage.setItem(INSTALL_STATE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage non disponibile: il banner riapparira' alla prossima visita */
  }
}

/** Il banner si puo' proporre adesso? */
function mayShow(): boolean {
  return canShowInstallPrompt(readState(), Date.now());
}

function cookieBannerClosed(): boolean {
  try {
    return localStorage.getItem(COOKIE_KEY) !== null;
  } catch {
    return true;
  }
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
  const iosMode = mounted && isIosSafari() && !isStandalone();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    // Un'altra scheda ha mostrato o chiuso il banner: qui non serve piu'.
    const onStorage = (e: StorageEvent) => {
      if (e.key === INSTALL_STATE_KEY && !mayShow()) setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Mostra il banner e lo conta: la comparsa si registra subito, cosi' un
  // ricaricamento, un'altra pagina o un'altra scheda non lo ripropongono.
  const show = useCallback(() => {
    if (!mayShow()) return;
    writeState(recordShown(readState(), Date.now()));
    setVisible(true);
  }, []);

  // Mostra il banner solo dopo il ritardo iniziale e quando il banner cookie è già stato chiuso.
  useEffect(() => {
    if (!deferred && !iosMode) return;
    if (!mayShow()) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      if (cookieBannerClosed()) {
        show();
        return;
      }
      interval = setInterval(() => {
        if (cookieBannerClosed()) {
          show();
          if (interval) clearInterval(interval);
        }
      }, 3000);
    }, INITIAL_DELAY_MS);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [deferred, iosMode, show]);

  const dismiss = useCallback(() => {
    writeState(recordDismissed(readState(), Date.now()));
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
        borderRadius: RADIUS.lg,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
        <InstallMobileIcon sx={{ color: "primary.main", mt: 0.25, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
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
          <Button variant="outlined" onClick={dismiss}>
            {t("later")}
          </Button>
          <Button variant="contained" onClick={install}>
            {t("install")}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
