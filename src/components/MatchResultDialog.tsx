"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { useState, useEffect } from "react";
import type { MatchResult } from "@prisma/client";

const RESULT_LABELS: Record<MatchResult, string> = {
  WIN: "Vittoria",
  LOSS: "Sconfitta",
  DRAW: "Pareggio",
};
const RESULT_COLORS: Record<MatchResult, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};

function deriveResult(our: string, their: string): MatchResult | null {
  const a = parseInt(our, 10);
  const b = parseInt(their, 10);
  if (isNaN(a) || isNaN(b)) return null;
  if (a > b) return "WIN";
  if (a < b) return "LOSS";
  return "DRAW";
}

export type MatchResultSavedFields = {
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  matchId: string;
  matchLabel: string;
  initialOurScore: number | null;
  initialTheirScore: number | null;
  initialResult: MatchResult | null;
  onSaved: (matchId: string, fields: MatchResultSavedFields) => void;
}

export default function MatchResultDialog({
  open,
  onClose,
  matchId,
  matchLabel,
  initialOurScore,
  initialTheirScore,
  initialResult,
  onSaved,
}: Props) {
  const [ourScore, setOurScore] = useState("");
  const [theirScore, setTheirScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setOurScore(initialOurScore !== null ? String(initialOurScore) : "");
    setTheirScore(initialTheirScore !== null ? String(initialTheirScore) : "");
    setError("");
  }, [open, initialOurScore, initialTheirScore]);

  const derived = deriveResult(ourScore, theirScore);

  async function handleSave() {
    setError("");
    const our = ourScore === "" ? null : Number(ourScore);
    const their = theirScore === "" ? null : Number(theirScore);
    if (our !== null && (isNaN(our) || our < 0)) {
      setError("Punteggio non valido");
      return;
    }
    if (their !== null && (isNaN(their) || their < 0)) {
      setError("Punteggio non valido");
      return;
    }
    setSaving(true);
    const payload = {
      ourScore: our,
      theirScore: their,
      result: derived,
    };
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errData.error ?? "Errore nel salvataggio");
        return;
      }
      onSaved(matchId, payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ourScore: null, theirScore: null, result: null }),
      });
      if (!res.ok) {
        setError("Errore nel reset");
        return;
      }
      onSaved(matchId, { ourScore: null, theirScore: null, result: null });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
        <EmojiEventsIcon color="primary" />
        Inserisci risultato
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {matchLabel}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mt: 1 }}>
          <TextField
            label="Nostri"
            type="number"
            value={ourScore}
            onChange={(e) => setOurScore(e.target.value)}
            slotProps={{
              htmlInput: { min: 0, style: { textAlign: "center", fontSize: "1.4rem" } },
            }}
            sx={{ flex: 1 }}
            autoFocus
          />
          <Typography variant="h5" color="text.disabled">
            –
          </Typography>
          <TextField
            label="Avversario"
            type="number"
            value={theirScore}
            onChange={(e) => setTheirScore(e.target.value)}
            slotProps={{
              htmlInput: { min: 0, style: { textAlign: "center", fontSize: "1.4rem" } },
            }}
            sx={{ flex: 1 }}
          />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", mt: 2.5 }}>
          {derived ? (
            <Chip
              label={RESULT_LABELS[derived]}
              sx={{
                bgcolor: RESULT_COLORS[derived],
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.85rem",
                px: 1.5,
              }}
            />
          ) : (
            <Typography variant="caption" color="text.disabled">
              Inserisci entrambi i punteggi per calcolare l&apos;esito
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <Button color="error" onClick={handleClear} disabled={saving} size="small">
          Azzera
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            Salva risultato
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
