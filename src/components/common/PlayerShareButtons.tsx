"use client";

import { useState } from "react";
import { Box, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useLocale, useTranslations } from "next-intl";
import { formatDecimal } from "@/lib/numberFormat";
import { useToast } from "@/context/ToastContext";
import { brandColor } from "@/lib/heroStyles";
import { readableFill } from "@/lib/colorUtils";
import { TYPE_SCALE } from "@/lib/typeScale";

interface Props {
  playerName: string;
  totalPoints: number;
  matchesPlayed: number;
  medalsCount: number;
  slug: string;
  playerColor: string;
}

export default function PlayerShareButtons({
  playerName,
  totalPoints,
  matchesPlayed,
  medalsCount,
  slug,
  playerColor,
}: Props) {
  const { showToast } = useToast();
  // Colore della squadra come fondo, etichetta bianca: fondo scurito se serve (UX-22).
  const fill = readableFill(playerColor, { preferWhite: true });
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
        sx={{
          bgcolor: fill.bg,
          color: fill.fg,
          fontWeight: 700,
          fontSize: TYPE_SCALE.xs,
          textTransform: "none",
          px: 1.75,
          py: 0.5,
          borderRadius: 999,
          "&:hover": { bgcolor: fill.bg, opacity: 0.9 },
        }}
      >
        {t("share")}
      </Button>
      {/* "Condividi" apre gia' WhatsApp e le altre app sul telefono: accanto
          resta solo "Copia link", con etichetta e bordo chiaro, perche' le
          icone scure sul fondo scuro dell'hero quasi non si vedevano. */}
      <Button
        size="small"
        variant="outlined"
        onClick={handleCopy}
        startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
        aria-label={t("copyProfileLink")}
        sx={{
          color: "common.white",
          borderColor: alpha(brandColor.white, 0.5),
          fontWeight: 700,
          fontSize: TYPE_SCALE.xs,
          textTransform: "none",
          px: 1.5,
          py: 0.5,
          borderRadius: 999,
          "&:hover": {
            borderColor: brandColor.white,
            bgcolor: alpha(brandColor.white, 0.08),
          },
        }}
      >
        {t("copyLink")}
      </Button>
    </Box>
  );
}
