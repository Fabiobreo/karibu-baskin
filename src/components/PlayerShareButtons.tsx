"use client";

import { useState } from "react";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";

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
  const t = useTranslations("share");
  const [busy, setBusy] = useState(false);

  function buildMessage(): { title: string; text: string; url: string } {
    const url = typeof window !== "undefined" ? window.location.href : `/giocatori/${slug}`;
    const title = `${playerName} · Karibu Baskin`;
    const parts: string[] = [`🏀 ${playerName} sul Karibu Baskin`];
    if (matchesPlayed > 0) {
      const avg = (totalPoints / matchesPlayed).toFixed(1);
      parts.push(`📊 ${totalPoints} punti totali · ${avg} a partita su ${matchesPlayed} partite`);
    }
    if (medalsCount > 0) {
      parts.push(`🏆 ${medalsCount} ${medalsCount === 1 ? "medaglia" : "medaglie"} top scorer`);
    }
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

  function handleWhatsApp() {
    const msg = buildMessage();
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg.text)}`;
    if (typeof window !== "undefined") window.open(waUrl, "_blank", "noopener");
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Button
        size="small"
        onClick={handleNativeShare}
        disabled={busy}
        startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
        sx={{
          bgcolor: playerColor,
          color: "#fff",
          fontWeight: 700,
          fontSize: "0.78rem",
          textTransform: "none",
          px: 1.75,
          py: 0.5,
          borderRadius: 999,
          "&:hover": { bgcolor: playerColor, opacity: 0.9 },
        }}
      >
        {t("share")}
      </Button>
      <Tooltip title={t("whatsapp")}>
        <IconButton
          size="small"
          onClick={handleWhatsApp}
          sx={{
            bgcolor: "rgba(0,0,0,0.35)",
            color: "#25D366",
            border: "1px solid rgba(255,255,255,0.15)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
          }}
          aria-label={t("shareWhatsapp")}
        >
          <WhatsAppIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={t("copyLink")}>
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{
            bgcolor: "rgba(0,0,0,0.35)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
          }}
          aria-label={t("copyProfileLink")}
        >
          <ContentCopyIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
