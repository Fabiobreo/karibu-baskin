"use client";
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

interface Props {
  onCreated: () => void;
}

export default function AdminSessionForm({ onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date || !time) {
      setError("Tutti i campi sono obbligatori");
      return;
    }

    setLoading(true);
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
      onCreated();
    } catch {
      setError("Errore di rete, riprova");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Nuovo allenamento
      </Typography>

      <TextField
        label="Titolo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        size="small"
        placeholder="es. Allenamento settimanale"
        sx={{ mb: 2 }}
        disabled={loading}
      />

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label="Data"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          sx={{ flex: 2 }}
        />
        <TextField
          label="Inizio"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Fine"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          sx={{ flex: 1 }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
      >
        {loading ? "Creazione..." : "Crea allenamento"}
      </Button>
    </Box>
  );
}
