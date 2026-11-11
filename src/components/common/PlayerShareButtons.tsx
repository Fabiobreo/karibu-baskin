"use client";

import { useState } from "react";
import { Box, Button } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useLocale, useTranslations } from "next-intl";
import { formatDecimal } from "@/lib/numberFormat";
import { useToast } from "@/context/ToastContext";
import { shareUrl, type ShareSource } from "@/lib/shareLinks";

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

  /** Il link del profilo con la provenienza (UX-56): il foglio del telefono o "Copia link". */
  function buildMessage(source: ShareSource): {
    title: string;
    intro: string;
    text: string;
    url: string;
  } {
    const url = shareUrl(`/giocatori/${slug}`, "profilo", source);
    const title = `${playerName} · Karibu Baskin`;
    const parts: string[] = [t("playerIntro", { name: playerName })];
    if (matchesPlayed > 0) {
      const avg = formatDecimal(totalPoints / matchesPlayed, locale);
      parts.push(t("playerPoints", { points: totalPoints, avg, count: matchesPlayed }));
    }
    if (medalsCount > 0) parts.push(t("playerMedals", { count: medalsCount }));
    // `intro` senza il link per il foglio del telefono, che il link lo riceve
    // a parte: con tutti e due WhatsApp lo scriverebbe due volte.
    return { title, intro: parts.join("\n"), text: [...parts, url].join("\n"), url };
  }

  async function handleNativeShare() {
    if (busy) return;
    setBusy(true);
    try {
      const msg = buildMessage("whatsapp");
      const nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined;
      if (nav && typeof nav.share === "function") {
        try {
          await nav.share({ title: msg.title, text: msg.intro, url: msg.url });
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
      const msg = buildMessage("link");
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
        startIcon={<ShareIcon />}
        // Bottone fantasma come il resto della riga di condivisione degli hero
        // (UX-32): un arancio pieno nell'intestazione competeva con il titolo.
        variant="outlined"
        color="inherit"
        sx={{ color: "common.white", typography: "caption", px: 1.5 }}
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
        startIcon={<ContentCopyIcon />}
        aria-label={t("copyProfileLink")}
        sx={{ color: "common.white", typography: "caption", px: 1.5 }}
      >
        {t("copyLink")}
      </Button>
    </Box>
  );
}
