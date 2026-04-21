"use client";
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SessionRestrictionEditor, { seasonForDate, type RestrictionValue } from "@/components/SessionRestrictionEditor";

interface Props {
  onCreated: () => void;
  showTitle?: boolean;
  formId?: string;
  onLoadingChange?: (loading: boolean) => void;
}

interface FieldErrors {
  title?: string;
  date?: string;
  time?: string;
  endTime?: string;
}

const DEFAULT_RESTRICTIONS: RestrictionValue = {
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
};

export default function AdminSessionForm({ onCreated, showTitle = true, formId, onLoadingChange }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [restrictions, setRestrictions] = useState<RestrictionValue>(DEFAULT_RESTRICTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!title.trim())
      errs.title = "Il titolo è obbligatorio";
    if (!date)
      errs.date = "La data è obbligatoria";
    if (!time)
      errs.time = "L'orario di inizio è obbligatorio";
    if (time && endTime && endTime <= time)
      errs.endTime = "L'orario di fine deve essere dopo l'inizio";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    onLoadingChange?.(true);
    setError(null);

    try {
      const dateTime = new Date(`${date}T${time}:00`);
      const endDateTime = endTime ? new Date(`${date}T${endTime}:00`) : null;
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: dateTime.toISOString(),
          endTime: endDateTime?.toISOString() ?? null,
          dateSlug: `${date}${time}`.replace(/-/g, "").replace(":", ""),
          allowedRoles: restrictions.allowedRoles,
          restrictTeamId: restrictions.restrictTeamId,
          openRoles: restrictions.openRoles,
        }),
      });

      if (res.status === 401) {
        setError("Sessione scaduta, effettua di nuovo il login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Errore nella creazione");
        return;
      }

      setTitle("");
      setDate("");
      setTime("18:00");
      setEndTime("20:00");
      setRestrictions(DEFAULT_RESTRICTIONS);
      setFieldErrors({});
      onCreated();
    } catch {
      setError("Errore di rete, riprova");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <Box component="form" id={formId} onSubmit={handleSubmit}>
      {showTitle && (
        <Typography variant="h6" gutterBottom>
          Nuovo allenamento
        </Typography>
      )}

      <TextField
        label="Titolo"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setFieldErrors((p) => ({ ...p, title: undefined })); }}
        fullWidth
        size="small"
        placeholder="es. Allenamento settimanale"
        sx={{ mb: 2 }}
        disabled={loading}
        error={!!fieldErrors.title}
        helperText={fieldErrors.title}
      />

      <TextField
        label="Data"
        type="date"
        value={date}
        onChange={(e) => { setDate(e.target.value); setFieldErrors((p) => ({ ...p, date: undefined })); }}
        size="small"
        InputLabelProps={{ shrink: true }}
        inputProps={{ max: "2100-12-31", min: "2026-01-01" }}
        disabled={loading}
        error={!!fieldErrors.date}
        helperText={fieldErrors.date ?? " "}
        sx={{ mb: 1, width: "100%" }}
      />

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label="Inizio"
          type="time"
          value={time}
          onChange={(e) => { setTime(e.target.value); setFieldErrors((p) => ({ ...p, time: undefined, endTime: undefined })); }}
          size="small"
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          error={!!fieldErrors.time}
          helperText={fieldErrors.time ?? " "}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Fine"
          type="time"
          value={endTime}
          onChange={(e) => { setEndTime(e.target.value); setFieldErrors((p) => ({ ...p, endTime: undefined })); }}
          size="small"
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          error={!!fieldErrors.endTime}
          helperText={fieldErrors.endTime ?? " "}
          sx={{ flex: 1 }}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      <SessionRestrictionEditor
        value={restrictions}
        onChange={setRestrictions}
        disabled={loading}
        seasonFilter={date ? seasonForDate(new Date(date)) : undefined}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!formId && (
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          sx={{ mt: 2 }}
        >
          {loading ? "Creazione..." : "Crea allenamento"}
        </Button>
      )}
    </Box>
  );
}
