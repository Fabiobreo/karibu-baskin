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
  TextField,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import SessionRestrictionEditor, {
  seasonForDate,
  type RestrictionValue,
} from "@/components/training/SessionRestrictionEditor";
import { toLocalDateString, toLocalTimeString } from "@/lib/dateUtils";
import { readError } from "@/lib/fetchJson";
import { CLUB_VENUE_LABEL } from "@/lib/clubVenue";
import { useToast } from "@/context/ToastContext";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export interface EditableSession {
  id: string;
  title: string;
  date: string;
  endTime: string | null;
  location?: string | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
}

interface SessionEditDialogProps {
  session: EditableSession | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Modifica di un allenamento (titolo, data, orari, restrizioni). Estratto da
 * `AllenamentiClient` per l'admin (UX-14): stessa validazione e stessa PATCH
 * `/api/sessions/[id]`.
 */
export default function SessionEditDialog({ session, onClose, onSaved }: SessionEditDialogProps) {
  return (
    <Dialog open={!!session} onClose={onClose} maxWidth="sm" fullWidth>
      {/* key: il form riparte dai valori dell'allenamento a ogni apertura */}
      {session && (
        <EditForm key={session.id} session={session} onClose={onClose} onSaved={onSaved} />
      )}
    </Dialog>
  );
}

function EditForm({
  session,
  onClose,
  onSaved,
}: {
  session: EditableSession;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const start = new Date(session.date);
  const end = session.endTime ? new Date(session.endTime) : null;
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(toLocalDateString(start));
  const [time, setTime] = useState(toLocalTimeString(start));
  const [endTime, setEndTime] = useState(end ? toLocalTimeString(end) : "");
  const [location, setLocation] = useState(session.location ?? CLUB_VENUE_LABEL);
  const [restrictions, setRestrictions] = useState<RestrictionValue>({
    allowedRoles: session.allowedRoles,
    restrictTeamId: session.restrictTeamId,
    openRoles: session.openRoles,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!title.trim()) return setError("Il titolo è obbligatorio");
    if (!date) return setError("La data è obbligatoria");
    if (endTime && endTime <= time) return setError("L'orario di fine deve essere dopo l'inizio");
    setLoading(true);
    setError("");
    try {
      const dateTime = new Date(`${date}T${time}:00`);
      const endDateTime = endTime ? new Date(`${date}T${endTime}:00`) : null;
      const dateSlug = `${date}${time}`.replace(/-/g, "").replace(":", "");
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: dateTime.toISOString(),
          endTime: endDateTime?.toISOString() ?? null,
          location: location.trim() || null,
          dateSlug,
          allowedRoles: restrictions.allowedRoles,
          restrictTeamId: restrictions.restrictTeamId,
          openRoles: restrictions.openRoles,
        }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      showToast({ message: "Allenamento aggiornato", severity: "success" });
      onSaved();
    } catch {
      setError("Errore di rete, riprova");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>Modifica allenamento</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            disabled={loading}
            autoFocus
          />
          <TextField
            label="Data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={loading}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Inizio"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={loading}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Fine"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={loading}
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            label="Luogo"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
            disabled={loading}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            helperText="Lascia la sede abituale, o scrivi dove si gioca."
          />
          <Divider />
          <SessionRestrictionEditor
            value={restrictions}
            onChange={setRestrictions}
            disabled={loading}
            seasonFilter={date ? seasonForDate(new Date(date)) : undefined}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} color="inherit" sx={{ minHeight: 44 }}>
          Annulla
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={loading}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : <EventAvailableIcon />
          }
          sx={{ px: 3, minHeight: 44 }}
        >
          {loading ? "Salvataggio..." : "Salva modifiche"}
        </Button>
      </DialogActions>
    </>
  );
}
