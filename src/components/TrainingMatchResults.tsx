"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Box, Typography, Paper, TextField, Button, CircularProgress, Chip, IconButton, Tooltip,
} from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import { TEAM_META } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import type { TeamsData } from "@/components/TeamDisplay";

type MatchupKey = "AB" | "AC" | "BC";

interface MatchResult {
  id: string;
  sessionId: string;
  matchup: string | null;
  scoreA: number;
  scoreB: number;
  notes: string | null;
  createdAt: string;
}

interface MatchupDef {
  key: MatchupKey;
  team1Idx: number;
  team2Idx: number;
}

interface Props {
  sessionId: string;
  isStaff: boolean;
  teams: TeamsData | null;
  onResultsCount?: (count: number) => void;
}

const ALL_MATCHUPS: MatchupDef[] = [
  { key: "AB", team1Idx: 0, team2Idx: 1 },
  { key: "AC", team1Idx: 0, team2Idx: 2 },
  { key: "BC", team1Idx: 1, team2Idx: 2 },
];

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject()));

// ── Slot singolo matchup ──────────────────────────────────────────────────────

function MatchupSlot({
  def, result, sessionId, isStaff, onSaved, onDeleted,
}: {
  def: MatchupDef;
  result: MatchResult | undefined;
  sessionId: string;
  isStaff: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const team1 = TEAM_META[def.team1Idx];
  const team2 = TEAM_META[def.team2Idx];
  const [editing, setEditing] = useState(false);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  function startEdit() {
    setScore1(result ? String(result.scoreA) : "");
    setScore2(result ? String(result.scoreB) : "");
    setEditing(true);
  }

  async function handleSave() {
    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      showToast({ message: "Inserisci punteggi validi", severity: "error" });
      return;
    }
    setSaving(true);
    try {
      const body = { matchup: def.key, scoreA: s1, scoreB: s2 };
      const res = result
        ? await fetch(`/api/sessions/${sessionId}/match-results/${result.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/sessions/${sessionId}/match-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (res.ok) {
        setEditing(false);
        onSaved();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore nel salvataggio", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!result) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/match-results/${result.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted();
      } else {
        showToast({ message: "Errore durante l'eliminazione", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const label = (
    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
      {team1.name} — {team2.name}
    </Typography>
  );

  // Form di inserimento / modifica (staff)
  if (isStaff && (!result || editing)) {
    return (
      <Box
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: editing ? "primary.light" : "divider",
          borderRadius: 2,
          bgcolor: editing ? "primary.50" : "background.paper",
        }}
      >
        {label}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: team1.color, flexShrink: 0 }} />
            <Typography variant="caption" fontWeight={600} sx={{ minWidth: 58 }}>{team1.name}</Typography>
            <TextField
              size="small"
              type="number"
              placeholder="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              inputProps={{ min: 0, style: { width: 52, padding: "4px 8px", textAlign: "center", fontSize: "1.1rem", fontWeight: 700 } }}
              disabled={saving}
            />
          </Box>
          <Typography color="text.disabled" fontWeight={700} sx={{ fontSize: "0.8rem" }}>vs</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: team2.color, flexShrink: 0 }} />
            <Typography variant="caption" fontWeight={600} sx={{ minWidth: 58 }}>{team2.name}</Typography>
            <TextField
              size="small"
              type="number"
              placeholder="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              inputProps={{ min: 0, style: { width: 52, padding: "4px 8px", textAlign: "center", fontSize: "1.1rem", fontWeight: 700 } }}
              disabled={saving}
            />
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={13} color="inherit" /> : <CheckIcon />}
          >
            Salva
          </Button>
          {editing && (
            <Button size="small" onClick={() => setEditing(false)} disabled={saving} color="inherit">
              Annulla
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  // Visualizzazione risultato salvato
  const s1 = result?.scoreA ?? 0;
  const s2 = result?.scoreB ?? 0;
  const winner = result ? (s1 > s2 ? 1 : s2 > s1 ? 2 : 0) : -1;

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: result ? "divider" : "divider",
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box sx={{ flex: 1 }}>
        {label}
        {result ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Chip
              label={`${team1.name}  ${s1}`}
              size="small"
              sx={{
                bgcolor: winner === 1 ? team1.color : `${team1.color}22`,
                color: winner === 1 ? "#fff" : "text.primary",
                fontWeight: winner === 1 ? 700 : 500,
                border: "1px solid",
                borderColor: team1.color,
                fontSize: "0.8rem",
              }}
            />
            <Typography variant="caption" color="text.disabled" fontWeight={700}>vs</Typography>
            <Chip
              label={`${team2.name}  ${s2}`}
              size="small"
              sx={{
                bgcolor: winner === 2 ? team2.color : `${team2.color}22`,
                color: winner === 2 ? "#fff" : "text.primary",
                fontWeight: winner === 2 ? 700 : 500,
                border: "1px solid",
                borderColor: team2.color,
                fontSize: "0.8rem",
              }}
            />
            {winner === 0 && (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Pareggio</Typography>
            )}
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled">Non ancora registrato</Typography>
        )}
      </Box>
      {isStaff && result && (
        <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
          <Tooltip title="Modifica">
            <IconButton size="small" onClick={startEdit} sx={{ p: "3px", color: "text.disabled", "&:hover": { color: "primary.main" } }}>
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancella risultato">
            <span>
              <IconButton
                size="small"
                onClick={handleDelete}
                disabled={deleting}
                sx={{ p: "3px", color: "text.disabled", "&:hover": { color: "error.main" } }}
              >
                {deleting ? <CircularProgress size={12} /> : <DeleteOutlineIcon sx={{ fontSize: 14 }} />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function TrainingMatchResults({ sessionId, isStaff, teams, onResultsCount }: Props) {
  const { data: results = [], mutate } = useSWR<MatchResult[]>(
    `/api/sessions/${sessionId}/match-results`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const hasThreeTeams = !!(teams?.teamC && teams.teamC.length > 0);
  const matchups = hasThreeTeams ? ALL_MATCHUPS : ALL_MATCHUPS.slice(0, 1);
  const savedCount = matchups.filter((m) => results.some((r) => r.matchup === m.key)).length;

  useEffect(() => {
    onResultsCount?.(savedCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedCount]);

  return (
    <Paper id="partite" variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "grey.50",
        }}
      >
        <SportsBasketballIcon sx={{ fontSize: 18, color: "primary.main" }} />
        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
          Risultati partite
        </Typography>
        {savedCount > 0 && (
          <Chip
            label={`${savedCount}/${matchups.length}`}
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Slot matchup */}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {matchups.map((def) => (
          <MatchupSlot
            key={def.key}
            def={def}
            result={results.find((r) => r.matchup === def.key)}
            sessionId={sessionId}
            isStaff={isStaff}
            onSaved={() => mutate()}
            onDeleted={() => mutate()}
          />
        ))}
      </Box>
    </Paper>
  );
}
