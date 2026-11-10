"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { readError } from "@/lib/fetchJson";
import type { GironeOpponent, GironeOtherMatch } from "@/lib/groups/gironeCalendar";

interface GroupMatchDialogProps {
  open: boolean;
  groupId: string;
  /** null = nuova partita. */
  match: GironeOtherMatch | null;
  teams: GironeOpponent[];
  onClose: () => void;
  onSaved: (saved: GironeOtherMatch, isEdit: boolean) => void;
}

const EMPTY = {
  matchday: "",
  date: "",
  homeTeamId: "",
  awayTeamId: "",
  homeScore: "",
  awayScore: "",
};

/** Aggiunge o corregge il risultato di una partita fra due avversarie del girone. */
export default function GroupMatchDialog({
  open,
  groupId,
  match,
  teams,
  onClose,
  onSaved,
}: GroupMatchDialogProps) {
  // Il dialog nasce con il `key` della partita: lo stato parte già dai suoi valori.
  const [form, setForm] = useState(() =>
    match
      ? {
          matchday: match.matchday !== null ? String(match.matchday) : "",
          date: match.date ? match.date.slice(0, 10) : "",
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeScore: match.homeScore !== null ? String(match.homeScore) : "",
          awayScore: match.awayScore !== null ? String(match.awayScore) : "",
        }
      : EMPTY
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.homeTeamId || !form.awayTeamId) {
      setError("Scegli le due squadre");
      return;
    }
    if (form.homeTeamId === form.awayTeamId) {
      setError("Una squadra non gioca contro sé stessa");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        match ? `/api/groups/${groupId}/matches/${match.id}` : `/api/groups/${groupId}/matches`,
        {
          method: match ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchday: form.matchday !== "" ? Number(form.matchday) : null,
            date: form.date !== "" ? form.date : null,
            homeTeamId: form.homeTeamId,
            awayTeamId: form.awayTeamId,
            homeScore: form.homeScore !== "" ? Number(form.homeScore) : null,
            awayScore: form.awayScore !== "" ? Number(form.awayScore) : null,
          }),
        }
      );
      if (!res.ok) throw new Error(await readError(res));
      onSaved((await res.json()) as GironeOtherMatch, !!match);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  const teamSelect = (key: "homeTeamId" | "awayTeamId", label: string) => (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value as string }))}
      >
        {teams.map((t) => (
          <MenuItem key={t.id} value={t.id}>
            {t.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <ResponsiveDialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{match ? "Modifica risultato" : "Aggiungi risultato"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={1.5}>
            <TextField
              label="Giornata"
              type="number"
              size="small"
              value={form.matchday}
              onChange={(e) => setForm((f) => ({ ...f, matchday: e.target.value }))}
              sx={{ width: 120 }}
            />
            <TextField
              label="Data"
              type="date"
              size="small"
              fullWidth
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            {teamSelect("homeTeamId", "Casa")}
            <TextField
              label="Punti"
              type="number"
              size="small"
              value={form.homeScore}
              onChange={(e) => setForm((f) => ({ ...f, homeScore: e.target.value }))}
              sx={{ width: 96, flexShrink: 0 }}
            />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            {teamSelect("awayTeamId", "Ospiti")}
            <TextField
              label="Punti"
              type="number"
              size="small"
              value={form.awayScore}
              onChange={(e) => setForm((f) => ({ ...f, awayScore: e.target.value }))}
              sx={{ width: 96, flexShrink: 0 }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Annulla
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          Salva
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
