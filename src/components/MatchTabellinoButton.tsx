"use client";

import { useState, useSyncExternalStore } from "react";
import { IconButton, CircularProgress, Tooltip } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { useToast } from "@/context/ToastContext";

interface Props {
  matchId: string;
  filename: string;
}

// useSyncExternalStore evita il warning React-Compiler "set-state-in-effect":
// la disponibilità di Web Share API è una capability del browser, non cambia mai
// dopo il primo render.
const emptySubscribe = () => () => {};
const getCanShareSnapshot = () => "share" in navigator && "canShare" in navigator;
const getCanShareServerSnapshot = () => false;

export default function MatchTabellinoButton({ matchId, filename }: Props) {
  const [loading, setLoading] = useState(false);
  const canShare = useSyncExternalStore(
    emptySubscribe,
    getCanShareSnapshot,
    getCanShareServerSnapshot
  );
  const { showToast } = useToast();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/tabellino`);
      if (!res.ok) throw new Error("Errore generazione tabellino");
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });

      // Web Share API con file (mobile)
      const nav = typeof navigator !== "undefined" ? navigator : null;
      if (nav && "canShare" in nav && nav.canShare?.({ files: [file] }) && "share" in nav) {
        try {
          await nav.share({
            files: [file],
            title: "Tabellino partita",
            text: "Tabellino Karibu Baskin",
          });
          return;
        } catch (err) {
          // L'utente ha annullato — non mostriamo errore
          if (err instanceof Error && err.name === "AbortError") return;
          // Altrimenti fallback a download
        }
      }

      // Fallback: download del file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast({ message: "Tabellino scaricato", severity: "success" });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore di rete",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  const label = canShare ? "Condividi tabellino" : "Scarica tabellino";

  return (
    <Tooltip title={label}>
      <IconButton
        onClick={handleClick}
        disabled={loading}
        aria-label={label}
        sx={{
          color: "#fff",
          bgcolor: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.2)",
          "&:hover": { bgcolor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.4)" },
        }}
      >
        {loading ? (
          <CircularProgress size={18} sx={{ color: "#fff" }} />
        ) : (
          <ShareIcon sx={{ fontSize: 18 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
