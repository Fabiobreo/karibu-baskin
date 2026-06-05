"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { MatchType, MatchResult } from "@prisma/client";

const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

const RESULT_LABELS: Record<MatchResult, string> = {
  WIN: "Vittoria",
  LOSS: "Sconfitta",
  DRAW: "Pareggio",
};

function deriveResult(our: string, their: string): MatchResult | "" {
  const o = parseInt(our, 10);
  const t = parseInt(their, 10);
  if (isNaN(o) || isNaN(t)) return "";
  if (o > t) return "WIN";
  if (o < t) return "LOSS";
  return "DRAW";
}

export interface MatchEditButtonProps {
  matchId: string;
  initial: {
    date: string | Date;
    isHome: boolean;
    venue: string | null;
    matchType: MatchType;
    ourScore: number | null;
    theirScore: number | null;
    result: MatchResult | null;
    notes: string | null;
    matchday: number | null;
    opponentId: string | null;
    opponentTeamId: string | null;
    groupId: string | null;
  };
  opposingTeams: Array<{ id: string; name: string; city: string | null }>;
  internalTeams?: Array<{ id: string; name: string; season: string }>;
  groups: Array<{ id: string; name: string; championship: string | null; season: string }>;
}

export default function MatchEditButton({
  matchId,
  initial,
  opposingTeams,
  internalTeams = [],
  groups,
}: MatchEditButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [date, setDate] = useState(format(new Date(initial.date), "yyyy-MM-dd'T'HH:mm"));
  const [isHome, setIsHome] = useState(initial.isHome);
  const [venue, setVenue] = useState(initial.venue ?? "");
  const [matchType, setMatchType] = useState<MatchType>(initial.matchType);
  const [opponentKind, setOpponentKind] = useState<"external" | "internal">(
    initial.opponentTeamId ? "internal" : "external"
  );
  const [opponentId, setOpponentId] = useState(initial.opponentId ?? "");
  const [opponentTeamId, setOpponentTeamId] = useState(initial.opponentTeamId ?? "");
  const [ourScore, setOurScore] = useState(
    initial.ourScore !== null ? String(initial.ourScore) : ""
  );
  const [theirScore, setTheirScore] = useState(
    initial.theirScore !== null ? String(initial.theirScore) : ""
  );
  const [result, setResult] = useState<MatchResult | "">(initial.result ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [matchday, setMatchday] = useState(
    initial.matchday !== null ? String(initial.matchday) : ""
  );
  const [groupId, setGroupId] = useState(initial.groupId ?? "");

  // Auto-deriva risultato dai punteggi
  function onScoreChange(field: "our" | "their", value: string) {
    if (field === "our") {
      setOurScore(value);
      const derived = deriveResult(value, theirScore);
      if (derived) setResult(derived);
    } else {
      setTheirScore(value);
      const derived = deriveResult(ourScore, value);
      if (derived) setResult(derived);
    }
  }

  function reset() {
    setDate(format(new Date(initial.date), "yyyy-MM-dd'T'HH:mm"));
    setIsHome(initial.isHome);
    setVenue(initial.venue ?? "");
    setMatchType(initial.matchType);
    setOpponentKind(initial.opponentTeamId ? "internal" : "external");
    setOpponentId(initial.opponentId ?? "");
    setOpponentTeamId(initial.opponentTeamId ?? "");
    setOurScore(initial.ourScore !== null ? String(initial.ourScore) : "");
    setTheirScore(initial.theirScore !== null ? String(initial.theirScore) : "");
    setResult(initial.result ?? "");
    setNotes(initial.notes ?? "");
    setMatchday(initial.matchday !== null ? String(initial.matchday) : "");
    setGroupId(initial.groupId ?? "");
    setError("");
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
  }

  function handleOpen() {
    reset();
    setOpen(true);
  }

  async function handleSave() {
    setError("");
    if (!date) {
      setError("Data obbligatoria");
      return;
    }
    if (opponentKind === "external" && !opponentId) {
      setError("Seleziona la squadra avversaria");
      return;
    }
    if (opponentKind === "internal" && !opponentTeamId) {
      setError("Seleziona la squadra interna avversaria");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        date,
        opponentId: opponentKind === "external" ? opponentId : null,
        opponentTeamId: opponentKind === "internal" ? opponentTeamId : null,
        isHome,
        venue: venue.trim() || null,
        // Le partite interne sono sempre amichevoli
        matchType: opponentKind === "internal" ? "FRIENDLY" : matchType,
        ourScore: ourScore !== "" ? Number(ourScore) : null,
        theirScore: theirScore !== "" ? Number(theirScore) : null,
        result: result || null,
        notes: notes.trim() || null,
        matchday: matchday !== "" ? Number(matchday) : null,
        groupId: opponentKind === "internal" ? null : groupId || null,
      };
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Errore nel salvataggio");
        setLoading(false);
        return;
      }
      setOpen(false);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Errore di rete, riprova");
      setLoading(false);
    }
  }

  return (
    <>
      <Tooltip title="Modifica partita">
        <IconButton
          onClick={handleOpen}
          size="small"
          aria-label="Modifica partita"
          sx={{
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
          }}
        >
          <EditIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Modifica partita</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {internalTeams.length > 0 && (
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Button
                  variant={opponentKind === "external" ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setOpponentKind("external")}
                  disabled={loading}
                  sx={{ flex: 1, textTransform: "none" }}
                >
                  Squadra esterna
                </Button>
                <Button
                  variant={opponentKind === "internal" ? "contained" : "outlined"}
                  size="small"
                  onClick={() => {
                    setOpponentKind("internal");
                    setMatchType("FRIENDLY");
                  }}
                  disabled={loading}
                  sx={{ flex: 1, textTransform: "none" }}
                >
                  Amichevole interna
                </Button>
              </Box>
            )}

            {opponentKind === "external" ? (
              <FormControl fullWidth required>
                <InputLabel>Squadra avversaria</InputLabel>
                <Select
                  value={opponentId}
                  onChange={(e) => setOpponentId(e.target.value)}
                  label="Squadra avversaria"
                  disabled={loading}
                >
                  {opposingTeams.map((o) => (
                    <MenuItem key={o.id} value={o.id}>
                      {o.name}
                      {o.city ? ` (${o.city})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth required>
                <InputLabel>Squadra interna avversaria</InputLabel>
                <Select
                  value={opponentTeamId}
                  onChange={(e) => setOpponentTeamId(e.target.value)}
                  label="Squadra interna avversaria"
                  disabled={loading}
                >
                  {internalTeams.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} — {t.season}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Data e ora"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={loading}
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as MatchType)}
                  label="Tipo"
                  disabled={loading || opponentKind === "internal"}
                >
                  {(Object.keys(MATCH_TYPE_LABELS) as MatchType[]).map((k) => (
                    <MenuItem key={k} value={k}>
                      {MATCH_TYPE_LABELS[k]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={isHome}
                    onChange={(e) => setIsHome(e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {isHome ? <HomeIcon fontSize="small" /> : <FlightIcon fontSize="small" />}
                    <Typography variant="body2">{isHome ? "Casa" : "Trasferta"}</Typography>
                  </Box>
                }
              />
            </Box>

            <TextField
              label="Campo / Palestra"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              fullWidth
              placeholder="Palasport di Montecchio"
              disabled={loading}
            />

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
              Risultato (opzionale)
            </Typography>

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Nostri punti"
                type="number"
                value={ourScore}
                onChange={(e) => onScoreChange("our", e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 0 } }}
                disabled={loading}
              />
              <TextField
                label="Punti avversario"
                type="number"
                value={theirScore}
                onChange={(e) => onScoreChange("their", e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 0 } }}
                disabled={loading}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Esito</InputLabel>
              <Select
                value={result}
                onChange={(e) => setResult(e.target.value as MatchResult | "")}
                label="Esito"
                disabled={loading}
              >
                <MenuItem value="">
                  <em>Non ancora giocata</em>
                </MenuItem>
                {(Object.keys(RESULT_LABELS) as MatchResult[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {RESULT_LABELS[k]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {groups.length > 0 && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl sx={{ flex: 2 }}>
                  <InputLabel shrink>Girone</InputLabel>
                  <Select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    label="Girone"
                    notched
                    displayEmpty
                    disabled={loading}
                  >
                    <MenuItem value="">
                      <em>Nessun girone</em>
                    </MenuItem>
                    {groups.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name} {g.championship ? `(${g.championship})` : ""} — {g.season}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Giornata"
                  type="number"
                  value={matchday}
                  onChange={(e) => setMatchday(e.target.value)}
                  sx={{ flex: 1 }}
                  slotProps={{ htmlInput: { min: 1 } }}
                  placeholder="es. 3"
                  disabled={loading}
                />
              </Box>
            )}

            <TextField
              label="Note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={2}
              disabled={loading}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={loading} color="inherit">
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ px: 3 }}
          >
            {loading ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
