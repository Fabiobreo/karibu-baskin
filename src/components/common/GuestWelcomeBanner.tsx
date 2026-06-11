"use client";
import { useState } from "react";
import Link from "next/link";
import { Alert, AlertTitle, Button } from "@mui/material";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/lib/useHasMounted";

const STORAGE_KEY = "karibu-guest-welcome-dismissed";

/**
 * Banner di benvenuto per gli utenti GUEST (account in attesa di approvazione).
 * Spiega lo stato e cosa si può già fare; dismissible (persistito in localStorage).
 */
export default function GuestWelcomeBanner() {
  const t = useTranslations("guestWelcome");
  const mounted = useHasMounted();
  const [dismissed, setDismissed] = useState(false);

  // Renderizzato solo dopo il mount per leggere localStorage senza hydration mismatch
  if (!mounted || dismissed || localStorage.getItem(STORAGE_KEY) === "1") return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <Alert severity="info" onClose={handleDismiss} closeText={t("dismiss")}>
      <AlertTitle sx={{ fontWeight: 700 }}>{t("title")}</AlertTitle>
      {t("body")}
      <Link href="/allenamenti" style={{ textDecoration: "none", display: "block" }}>
        <Button size="small" variant="outlined" color="inherit" sx={{ mt: 1.5, fontWeight: 700 }}>
          {t("cta")}
        </Button>
      </Link>
    </Alert>
  );
}
