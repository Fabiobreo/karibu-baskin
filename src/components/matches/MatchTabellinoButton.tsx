"use client";

import { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { useShareOutcomeToast } from "@/hooks/useShareOutcomeToast";
import { shareImageBlob } from "@/lib/shareImage";
import { shareUrl } from "@/lib/shareLinks";
import { errorText } from "@/lib/networkError";

interface MatchTabellinoButtonProps {
  matchId: string;
  filename: string;
  /** Pagina della partita (`/partite/<slug>`), per il link del messaggio. */
  path: string;
  /** "Karibu – Thiene 42-38", con chi gioca in casa prima. */
  scoreLine: string;
}

/** Bottone fantasma degli hero, come quelli di `ShareSection dark`. */
const HERO_BUTTON_SX = { color: "common.white", typography: "caption", px: 1.5 } as const;

/**
 * "Immagine del risultato" (UX-56): il tabellino in PNG, condiviso con la
 * frase e il link della partita. Sta nella riga di condivisione dell'hero,
 * accanto a WhatsApp, Copia link e QR, con l'etichetta che la distingue da
 * loro: questo bottone manda un'immagine, gli altri il link.
 */
export default function MatchTabellinoButton({
  matchId,
  filename,
  path,
  scoreLine,
}: MatchTabellinoButtonProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const toastOutcome = useShareOutcomeToast();
  const t = useTranslations("share");
  const tCommon = useTranslations("common");

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/tabellino`);
      if (!res.ok) throw new Error(t("tabellinoError"));
      const outcome = await shareImageBlob(await res.blob(), {
        title: scoreLine,
        fileName: filename,
        link: { url: shareUrl(path, "tabellino"), text: t("msgTabellino", { score: scoreLine }) },
      });
      toastOutcome(outcome);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      showToast({
        message: errorText(err, tCommon("networkError"), tCommon("networkError")),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outlined"
      size="small"
      color="inherit"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading || undefined}
      startIcon={
        loading ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : <ImageOutlinedIcon />
      }
      sx={HERO_BUTTON_SX}
    >
      {t("tabellinoImage")}
    </Button>
  );
}
