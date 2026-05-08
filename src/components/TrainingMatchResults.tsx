"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Box, Typography, Paper, IconButton, Tooltip,
  TextField, Button, CircularProgress, Divider, Chip, Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import { TEAM_META } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import type { TeamsData } from "@/components/TeamDisplay";

interface MatchResult {
  id: string;
  sessionId: string;
  scoreA: number;
  scoreB: number;
  scoreC: number | null;
  notes: string | null;
  createdAt: string;
}

interface Props {
  sessionId: string;
  isStaff: boolean;
  teams: TeamsData | null;
  onResultsCount?: (count: number) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject()));

// ── Riga risultato ────────────────────────────────────────────────────────────

function ResultRow({
  result,
  index,
  hasThreeTeams,
  isStaff,
  onDeleted,
  onUpdated,
}: {
  result: MatchResult;
  index: number;
  hasThreeTeams: boolean;
  isStaff: boolean;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(String(result.scoreA));
  const [scoreB, setScoreB] = useState(String(result.scoreB));
  const [scoreC, setScoreC] = useState(result.scoreC != null ? String(result.scoreC) : "");
  const [notes, setNotes] = useState(result.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  function startEdit() {
    setScoreA(String(result.scoreA));
    setScoreB(String(result.scoreB));
    setScoreC(result.scoreC != null ? String(result.scoreC) : "");
    setNotes(result.notes ?? "");
    setEditing(true);
  }

  async function handleSave() {
    const a = parseInt(scoreA, 10);
    const b = parseInt(scoreB, 10);
    const c = hasThreeTeams && scoreC !== "" ? parseInt(scoreC, 10) : null;
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || (c != null && (isNaN(c) || c < 0))) {
      showToast({ message: "Punteggi non validi", severity: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${result.sessionId}/match-results/${result.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreA: a, scoreB: b, ...(hasThreeTeams ? { scoreC: c } : {}), notes: notes.trim() || null }),
      });
      if (res.ok) {
        setEditing(false);
        onUpdated();
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
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${result.sessionId}/match-results/${result.id}`, { method: "DELETE" });
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

  const teams = hasThreeTeams ? TEAM_META : TEAM_META.slice(0, 2);

  if (editing) {
    return (
      <Box
        sx={{
          p: 1.5,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "primary.light",
          bgcolor: "primary.50",
        }}
      >
        <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: "block" }}>
          Partita {index + 1}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          {teams.map((t, i) => {
            const val  = i === 0 ? scoreA : i === 1 ? scoreB : scoreC;
            const setVal = i === 0 ? setScoreA : i === 1 ? setScoreB : setScoreC;
            return (
              <Box key={t.key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: t.color, flexShrink: 0 }} />
                <Typography variant="caption" fontWeight={600} sx={{ minWidth: 52 }}>{t.name}</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  inputProps={{ min: 0, style: { width: 48, padding: "4px 6px" } }}
                  disabled={saving}
                />
              </Box>
            );
          })}
        </Box>
        <TextField
          size="small"
          label="Note (opzionale)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          sx={{ mt: 1 }}
          disabled={saving}
        />
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
          >
            Salva
          </Button>
          <Button size="small" onClick={() => setEditing(false)} disabled={saving} color="inherit">
            Annulla
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ minWidth: 54 }}>
        Partita {index + 1}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flex: 1, flexWrap: "wrap" }}>
        {teams.map((t, i) => {
          const score = i === 0 ? result.scoreA : i === 1 ? result.scoreB : result.scoreC;
          const scores = hasThreeTeams
            ? [result.scoreA, result.scoreB, result.scoreC ?? 0]
            : [result.scoreA, result.scoreB];
          const maxScore = Math.max(...scores);
          const isWinner = score === maxScore && scores.filter((s) => s === maxScore).length === 1;
          return (
            <Chip
              key={t.key}
              label={`${t.name} ${score}`}
              size="small"
              sx={{
                bgcolor: isWinner ? t.color : `${t.color}22`,
                color: isWinner ? "#fff" : "text.primary",
                fontWeight: isWinner ? 700 : 500,
                fontSize: "0.75rem",
                border: "1px solid",
                borderColor: t.color,
              }}
            />
          );
        })}
        {result.notes && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
            {result.notes}
          </Typography>
        )}
      </Box>

      {isStaff && (
        <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
          <Tooltip title="Modifica">
            <IconButton size="small" onClick={startEdit} sx={{ p: "3px", color: "text.disabled", "&:hover": { color: "primary.main" } }}>
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Elimina">
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

  useEffect(() => {
    onResultsCount?.(results.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length]);

  const [addOpen, setAddOpen] = useState(false);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [scoreC, setScoreC] = useState("");
  const [notes, setNotes] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const { showToast } = useToast();

  const hasThreeTeams = !!(teams?.teamC && teams.teamC.length > 0);
  const addTeams = hasThreeTeams ? TEAM_META : TEAM_META.slice(0, 2);

  function resetForm() {
    setScoreA(""); setScoreB(""); setScoreC(""); setNotes(""); setAddError("");
  }

  async function handleAdd() {
    const a = parseInt(scoreA, 10);
    const b = parseInt(scoreB, 10);
    const c = hasThreeTeams && scoreC !== "" ? parseInt(scoreC, 10) : null;
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      setAddError("Inserisci punteggi validi per tutte le squadre");
      return;
    }
    if (hasThreeTeams && (c == null || isNaN(c) || c < 0)) {
      setAddError("Inserisci il punteggio per i Bianchi");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/match-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreA: a, scoreB: b, ...(hasThreeTeams ? { scoreC: c } : {}), notes: notes.trim() || null }),
      });
      if (res.ok) {
        resetForm();
        setAddOpen(false);
        mutate();
        showToast({ message: "Risultato aggiunto", severity: "success" });
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? "Errore nel salvataggio");
      }
    } catch {
      setAddError("Errore di rete, riprova");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Paper id="partitelle" variant="outlined" sx={{ overflow: "hidden" }}>
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
          Partitelle
        </Typography>
        {results.length > 0 && (
          <Chip label={`${results.length}`} size="small" sx={{ fontWeight: 600 }} />
        )}
        {isStaff && (
          <Tooltip title="Aggiungi risultato">
            <IconButton
              size="small"
              onClick={() => { resetForm(); setAddOpen(true); }}
              sx={{ ml: "auto", color: "primary.main" }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Form aggiunta */}
      {addOpen && (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          {addError && <Alert severity="error" sx={{ mb: 1.5 }}>{addError}</Alert>}
          <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: "block" }}>
            Nuova partita
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            {addTeams.map((t, i) => {
              const val  = i === 0 ? scoreA : i === 1 ? scoreB : scoreC;
              const setVal = i === 0 ? setScoreA : i === 1 ? setScoreB : setScoreC;
              return (
                <Box key={t.key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: t.color, flexShrink: 0 }} />
                  <Typography variant="caption" fontWeight={600} sx={{ minWidth: 52 }}>{t.name}</Typography>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="0"
                    value={val}
                    onChange={(e) => { setVal(e.target.value); setAddError(""); }}
                    inputProps={{ min: 0, style: { width: 48, padding: "4px 6px" } }}
                    disabled={adding}
                  />
                </Box>
              );
            })}
          </Box>
          <TextField
            size="small"
            label="Note (opzionale)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
            disabled={adding}
          />
          <Box sx={{ display: "flex", gap: 1, mt: 1.5, mb: 0.5 }}>
            <Button
              size="small"
              variant="contained"
              onClick={handleAdd}
              disabled={adding}
              startIcon={adding ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
            >
              Aggiungi
            </Button>
            <Button size="small" onClick={() => { resetForm(); setAddOpen(false); }} disabled={adding} color="inherit">
              Annulla
            </Button>
          </Box>
          <Divider sx={{ mt: 1.5 }} />
        </Box>
      )}

      {/* Lista risultati */}
      {results.length === 0 && !addOpen ? (
        <Typography color="text.secondary" sx={{ px: 2, py: 2.5, fontSize: "0.875rem" }}>
          {isStaff ? "Nessun risultato ancora. Usa + per aggiungere le partitelle." : "Nessun risultato registrato."}
        </Typography>
      ) : (
        <Box sx={{ px: 1, py: 1 }}>
          {results.map((r, i) => (
            <ResultRow
              key={r.id}
              result={r}
              index={i}
              hasThreeTeams={hasThreeTeams}
              isStaff={isStaff}
              onDeleted={() => mutate()}
              onUpdated={() => mutate()}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}
