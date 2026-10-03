"use client";
import { useEffect, useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import InstallMobileIcon from "@mui/icons-material/InstallMobile";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/lib/useHasMounted";
import { isStandaloneApp } from "@/lib/tabNavigation";
import {
  isIosSafari,
  runInstallPrompt,
  type BeforeInstallPromptEvent,
  type InstallPromptWindow,
} from "@/lib/installPrompt";

interface GuideInstallProps {
  android: string[];
  ios: string[];
}

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Box>
      <Typography variant="subtitle2" component="h4" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
        {steps.map((step) => (
          <Typography key={step} component="li" variant="body1" sx={{ lineHeight: 1.6, mb: 0.5 }}>
            {step}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Capitolo "Installare l'app" della guida: i passi per Android e iPhone e,
 * dove il browser lo offre, il bottone che installa davvero. Il banner
 * `InstallPrompt` dopo tre comparse non torna piu': questo e' il posto fisso.
 */
export default function GuideInstall({ android, ios }: GuideInstallProps) {
  const t = useTranslations("pages");
  const mounted = useHasMounted();
  // L'evento puo' essere gia' arrivato (script in layout.tsx): come in
  // InstallPrompt, il primo render non lo usa finche' non e' montato.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window === "undefined"
      ? null
      : ((window as InstallPromptWindow).__kbInstallPrompt ?? null)
  );
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => setDeferred(e as BeforeInstallPromptEvent);
    const onInstalled = () => {
      (window as InstallPromptWindow).__kbInstallPrompt = null;
      setDeferred(null);
      setJustInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installed = mounted && (justInstalled || isStandaloneApp());
  // Su iPhone si mostrano per primi i passi di iPhone.
  const iosFirst = mounted && isIosSafari();

  async function install() {
    if (!deferred) return;
    // Usato una volta, il bottone sparisce: restano i passi a mano.
    setDeferred(null);
    await runInstallPrompt(deferred);
  }

  if (installed) {
    return <Alert severity="success">{t("guida.installed")}</Alert>;
  }

  const androidSteps = <Steps key="android" title={t("guida.android")} steps={android} />;
  const iosSteps = <Steps key="ios" title={t("guida.ios")} steps={ios} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {mounted && deferred && (
        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={install}
            startIcon={<InstallMobileIcon />}
          >
            {t("guida.installBtn")}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("guida.installBtnHint")}
          </Typography>
        </Box>
      )}
      {iosFirst ? [iosSteps, androidSteps] : [androidSteps, iosSteps]}
    </Box>
  );
}
