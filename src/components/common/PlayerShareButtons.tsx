"use client";

import { useState } from "react";
import { Box, Button } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useLocale, useTranslations } from "next-intl";
import { formatDecimal } from "@/lib/numberFormat";
import { useToast } from "@/context/ToastContext";
import { TYPE_SCALE } from "@/lib/typeScale";

interface Props {
  playerName: string;
  totalPoints: number;
  matchesPlayed: number;
  medalsCount: number;
  slug: string;
}

export default function PlayerShareButtons({
  playerName,
  totalPoints,
  matchesPlayed,
  medalsCount,
  slug,
}: Props) {
  const { showToast } = useToast();
  const t = useTranslations("share");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);

  function buildMessage(): { title: string; text: string; url: string } {
    const url = typeof window !== "undefined" ? window.location.href : `/giocatori/${slug}`;
    const title = `${playerName} · Karibu Baskin`;
    const parts: string[] = [t("playerIntro", { name: playerName })];
    if (matchesPlayed > 0) {
      const avg = formatDecimal(totalPoints / matchesPlayed, locale);
      parts.push(t("playerPoints", { points: totalPoints, avg, count: matchesPlayed }));
    }
    if (medalsCount > 0) parts.push(t("playerMedals", { count: medalsCount }));
    parts.push(url);
    return { title, text: parts.join("\n"), url };
  }

  async function handleNativeShare() {
    if (busy) return;
    setBusy(true);
    try {
      const msg = buildMessage();
      const nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined;
      if (nav && typeof nav.share === "function") {
        try {
          await nav.share({ title: msg.title, text: msg.text, url: msg.url });
        } catch {
          // utente ha annullato — niente toast
        }
      } else if (nav?.clipboard) {
        // Fallback: copia negli appunti
        await nav.clipboard.writeText(msg.text);
        showToast({ message: t("shareProfile"), severity: "success" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      const msg = buildMessage();
      await navigator.clipboard.writeText(msg.text);
      showToast({ message: t("shareProfile"), severity: "success" });
    } catch {
      showToast({ message: t("copyFailed"), severity: "error" });
    }
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Button
        size="small"
        onClick={handleNativeShare}
        disabled={busy}
        startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
        // Si tocca: bottone primario del tema (UX-29), non il colore della squadra.
        variant="contained"
        sx={{ fontSize: TYPE_SCALE.xs, px: 1.75, py: 0.5 }}
      >
        {t("share")}
      </Button>
      {/* "Condividi" apre gia' WhatsApp e le altre app sul telefono: accanto
          resta solo "Copia link", con etichetta e bordo chiaro, perche' le
          icone scure sul fondo scuro dell'hero quasi non si vedevano. */}
      <Button
        size="small"
        // Bottone fantasma del tema (UX-30), in bianco sull'hero scuro.
        variant="outlined"
        color="inherit"
        onClick={handleCopy}
        startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
        aria-label={t("copyProfileLink")}
        sx={{ color: "common.white", fontSize: TYPE_SCALE.xs, px: 1.5 }}
      >
        {t("copyLink")}
      </Button>
    </Box>
  );
}
