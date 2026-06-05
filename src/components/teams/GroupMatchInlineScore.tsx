"use client";

import { useState } from "react";
import { Box, Popover, TextField, Button, Typography, CircularProgress } from "@mui/material";
import { useToast } from "@/context/ToastContext";

interface Props {
  groupId: string;
  matchId: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  onSaved: (
    matchId: string,
    fields: { homeScore: number | null; awayScore: number | null }
  ) => void;
}

export default function GroupMatchInlineScore({
  groupId,
  matchId,
  homeName,
  awayName,
  homeScore,
  awayScore,
  onSaved,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const [home, setHome] = useState(homeScore !== null ? String(homeScore) : "");
  const [away, setAway] = useState(awayScore !== null ? String(awayScore) : "");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const hasScore = homeScore !== null && awayScore !== null;

  function handleOpen(e: React.MouseEvent<HTMLButtonElement>) {
    setHome(homeScore !== null ? String(homeScore) : "");
    setAway(awayScore !== null ? String(awayScore) : "");
    setAnchorEl(e.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const h = home === "" ? null : Number(home);
      const a = away === "" ? null : Number(away);
      if (h !== null && (isNaN(h) || h < 0)) {
        showToast({ message: "Punteggio casa non valido", severity: "error" });
        return;
      }
      if (a !== null && (isNaN(a) || a < 0)) {
        showToast({ message: "Punteggio ospite non valido", severity: "error" });
        return;
      }
      const res = await fetch(`/api/groups/${groupId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore: h, awayScore: a }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast({ message: err.error ?? "Errore nel salvataggio", severity: "error" });
        return;
      }
      onSaved(matchId, { homeScore: h, awayScore: a });
      showToast({ message: "Punteggio aggiornato", severity: "success" });
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        size="small"
        onClick={handleOpen}
        sx={{
          minWidth: 0,
          px: 0.75,
          py: 0,
          fontSize: "0.72rem",
          fontWeight: 600,
          textTransform: "none",
          color: hasScore ? "text.primary" : "primary.main",
        }}
      >
        {hasScore ? `${homeScore} – ${awayScore}` : "+ pt."}
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 240 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {homeName} vs {awayName}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "center" }}>
            <TextField
              label={homeName}
              type="number"
              size="small"
              value={home}
              onChange={(e) => setHome(e.target.value)}
              slotProps={{
                htmlInput: { min: 0, style: { textAlign: "center", fontSize: "1rem" } },
                inputLabel: { sx: { fontSize: "0.75rem" } },
              }}
              sx={{ width: 95 }}
              autoFocus
            />
            <Typography variant="body2" color="text.disabled">
              –
            </Typography>
            <TextField
              label={awayName}
              type="number"
              size="small"
              value={away}
              onChange={(e) => setAway(e.target.value)}
              slotProps={{
                htmlInput: { min: 0, style: { textAlign: "center", fontSize: "1rem" } },
                inputLabel: { sx: { fontSize: "0.75rem" } },
              }}
              sx={{ width: 95 }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button size="small" onClick={handleClose} disabled={saving}>
              Annulla
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} /> : undefined}
            >
              Salva
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
