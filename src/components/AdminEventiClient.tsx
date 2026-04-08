"use client";

import {
  Box, Typography, Paper, Button, TextField, Stack, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Table, TableHead, TableBody, TableRow, TableCell, Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PlaceIcon from "@mui/icons-material/Place";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Event = {
  id: string;
  title: string;
  date: string | Date;
  endDate?: string | Date | null;
  location?: string | null;
  description?: string | null;
};

const emptyForm = {
  title: "",
  date: "",
  endDate: "",
  location: "",
  description: "",
};

export default function AdminEventiClient({ events: initialEvents }: { events: Event[] }) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (ev: Event) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      date: format(new Date(ev.date), "yyyy-MM-dd'T'HH:mm"),
      endDate: ev.endDate ? format(new Date(ev.endDate), "yyyy-MM-dd'T'HH:mm") : "",
      location: ev.location ?? "",
      description: ev.description ?? "",
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) {
      setError("Titolo e data obbligatori");
      return;
    }
    setError("");

    const body = {
      title: form.title.trim(),
      date: form.date,
      endDate: form.endDate || null,
      location: form.location.trim() || null,
      description: form.description.trim() || null,
    };

    const res = editingId
      ? await fetch(`/api/events/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Errore durante il salvataggio");
      return;
    }

    const saved: Event = await res.json();
    if (editingId) {
      setEvents((prev) => prev.map((e) => (e.id === editingId ? saved : e)));
    } else {
      setEvents((prev) => [...prev, saved].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }
    setDialogOpen(false);
    startTransition(() => router.refresh());
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      startTransition(() => router.refresh());
    }
    setDeleteId(null);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EventNoteIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>Gestione Eventi</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Aggiungi evento
        </Button>
      </Box>

      <Paper elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Titolo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Data inizio</TableCell>
              <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Data fine</TableCell>
              <TableCell sx={{ fontWeight: 700, display: { xs: "none", md: "table-cell" } }}>Luogo</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev) => (
              <TableRow key={ev.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{ev.title}</Typography>
                  {ev.description && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", maxWidth: 220 }}>
                      {ev.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {format(new Date(ev.date), "d MMM yyyy", { locale: it })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(ev.date), "HH:mm")}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {ev.endDate ? (
                    <Typography variant="body2">
                      {format(new Date(ev.endDate), "d MMM yyyy", { locale: it })}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  {ev.location ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <PlaceIcon sx={{ fontSize: "0.85rem", color: "text.secondary" }} />
                      <Typography variant="body2">{ev.location}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <Tooltip title="Modifica">
                    <IconButton size="small" onClick={() => openEdit(ev)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(ev.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Nessun evento ancora creato
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Dialog crea/modifica */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editingId ? "Modifica evento" : "Nuovo evento"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Titolo *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Data e ora inizio *"
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Data e ora fine (opzionale)"
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Luogo"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              fullWidth
              placeholder="es. Palazzetto di Montecchio Maggiore"
            />
            <TextField
              label="Descrizione"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="es. Torneo regionale under 18, tornata di padel a Vicenza..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleSave} disabled={isPending}>
            {isPending ? <CircularProgress size={18} /> : editingId ? "Salva" : "Crea"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle fontWeight={700}>Eliminare questo evento?</DialogTitle>
        <DialogContent>
          <Typography>L&apos;azione non è reversibile.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button color="error" variant="contained" onClick={() => deleteId && handleDelete(deleteId)}>
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
