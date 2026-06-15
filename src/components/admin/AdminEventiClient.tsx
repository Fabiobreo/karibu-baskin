"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  TablePagination,
  MenuItem,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlaceIcon from "@mui/icons-material/Place";
import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ImageUploader from "@/components/common/ImageUploader";

type EventOptionRow = {
  id?: string;
  label: string;
  startsAt?: string | Date | null;
  kind: string;
  order?: number;
};

type Event = {
  id: string;
  title: string;
  date: string | Date;
  endDate?: string | Date | null;
  location?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  options?: EventOptionRow[];
};

const OPTION_KINDS = [
  { value: "SESSIONE", label: "Sessione" },
  { value: "PASTO", label: "Pasto" },
  { value: "PERNOTTO", label: "Pernotto" },
  { value: "ALTRO", label: "Altro" },
];

// Riga opzione in editing (startsAt = stringa datetime-local, "" se assente).
type OptionDraft = { id?: string; label: string; startsAt: string; kind: string };

const EventFormSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio").max(200),
  date: z.string().min(1, "Data obbligatoria"),
  endDate: z.string().optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});

type EventFormValues = z.infer<typeof EventFormSchema>;

export default function AdminEventiClient({ events: initialEvents }: { events: Event[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState(initialEvents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>([]);
  const [, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: { title: "", date: "", endDate: "", location: "", description: "" },
  });

  const openCreate = () => {
    setEditingId(null);
    setImageUrl(null);
    setOptionDrafts([]);
    reset({ title: "", date: "", endDate: "", location: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (ev: Event) => {
    setEditingId(ev.id);
    setImageUrl(ev.imageUrl ?? null);
    setOptionDrafts(
      (ev.options ?? []).map((o) => ({
        id: o.id,
        label: o.label,
        startsAt: o.startsAt ? format(new Date(o.startsAt), "yyyy-MM-dd'T'HH:mm") : "",
        kind: o.kind ?? "ALTRO",
      }))
    );
    reset({
      title: ev.title,
      date: format(new Date(ev.date), "yyyy-MM-dd'T'HH:mm"),
      endDate: ev.endDate ? format(new Date(ev.endDate), "yyyy-MM-dd'T'HH:mm") : "",
      location: ev.location ?? "",
      description: ev.description ?? "",
    });
    setDialogOpen(true);
  };

  const addOption = () =>
    setOptionDrafts((d) => [...d, { label: "", startsAt: "", kind: "ALTRO" }]);
  const updateOption = (i: number, patch: Partial<OptionDraft>) =>
    setOptionDrafts((d) => d.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const removeOption = (i: number) => setOptionDrafts((d) => d.filter((_, idx) => idx !== i));

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    const ev = initialEvents.find((e) => e.id === editId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ev) openEdit(ev);
    router.replace("/admin/eventi", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: EventFormValues) => {
    const body = {
      title: values.title.trim(),
      date: values.date,
      endDate: values.endDate || null,
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
      imageUrl: imageUrl ?? null,
    };

    const res = editingId
      ? await fetch(`/api/events/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError("root", { message: data.error ?? "Errore durante il salvataggio" });
      return;
    }

    const saved: Event = await res.json();

    // Salva le sotto-opzioni (replace in blocco). L'evento deve già esistere.
    let savedOptions: EventOptionRow[] = saved.options ?? [];
    const optionsPayload = optionDrafts
      .filter((o) => o.label.trim())
      .map((o, i) => ({
        id: o.id,
        label: o.label.trim(),
        startsAt: o.startsAt || null,
        kind: o.kind,
        order: i,
      }));
    const optRes = await fetch(`/api/events/${saved.id}/options`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: optionsPayload }),
    });
    if (optRes.ok) savedOptions = await optRes.json();

    const savedWithOptions: Event = { ...saved, options: savedOptions };
    if (editingId) {
      setEvents((prev) => prev.map((e) => (e.id === editingId ? savedWithOptions : e)));
    } else {
      setEvents((prev) =>
        [...prev, savedWithOptions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      );
    }
    setDialogOpen(false);
    startTransition(() => router.refresh());
  };

  const paginatedEvents = events.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

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
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Aggiungi evento
        </Button>
      </Box>

      <Paper elevation={2}>
        {/* Desktop table */}
        <Box sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Titolo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data inizio</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>
                  Data fine
                </TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: "none", md: "table-cell" } }}>
                  Luogo
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEvents.map((ev) => (
                <TableRow key={ev.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{ev.title}</TableCell>
                  <TableCell>
                    {format(new Date(ev.date), "d MMM yyyy, HH:mm", { locale: it })}
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {ev.endDate
                      ? format(new Date(ev.endDate), "d MMM yyyy, HH:mm", { locale: it })
                      : "—"}
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    {ev.location ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <PlaceIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                        {ev.location}
                      </Box>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Modifica">
                      <IconButton
                        size="medium"
                        aria-label="Modifica evento"
                        onClick={() => openEdit(ev)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <IconButton
                        size="medium"
                        aria-label="Elimina evento"
                        color="error"
                        onClick={() => setDeleteId(ev.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
        </Box>

        {/* Mobile card view */}
        <Box sx={{ display: { xs: "block", sm: "none" } }}>
          {events.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Nessun evento ancora creato
              </Typography>
            </Box>
          ) : (
            paginatedEvents.map((ev) => (
              <Box
                key={ev.id}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { borderBottom: 0 },
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ wordBreak: "break-word" }}>
                    {ev.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {format(new Date(ev.date), "d MMM yyyy, HH:mm", { locale: it })}
                    {ev.endDate &&
                      ` – ${format(new Date(ev.endDate), "d MMM yyyy, HH:mm", { locale: it })}`}
                  </Typography>
                  {ev.location && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                      <PlaceIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {ev.location}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title="Modifica">
                    <IconButton
                      size="medium"
                      aria-label="Modifica evento"
                      onClick={() => openEdit(ev)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina">
                    <IconButton
                      size="medium"
                      aria-label="Elimina evento"
                      color="error"
                      onClick={() => setDeleteId(ev.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))
          )}
        </Box>

        <TablePagination
          component="div"
          count={events.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Righe:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
          sx={{ borderTop: "1px solid", borderColor: "divider" }}
        />
      </Paper>

      {/* Dialog crea/modifica */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editingId ? "Modifica evento" : "Nuovo evento"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {errors.root && (
                <Typography color="error" variant="body2">
                  {errors.root.message}
                </Typography>
              )}
              <TextField
                label="Titolo *"
                {...register("title")}
                error={!!errors.title}
                helperText={errors.title?.message}
                fullWidth
              />
              <TextField
                label="Data e ora inizio *"
                type="datetime-local"
                {...register("date")}
                error={!!errors.date}
                helperText={errors.date?.message}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Data e ora fine (opzionale)"
                type="datetime-local"
                {...register("endDate")}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Luogo"
                {...register("location")}
                error={!!errors.location}
                helperText={errors.location?.message}
                fullWidth
                placeholder="es. Palazzetto di Montecchio Maggiore"
              />
              <TextField
                label="Descrizione"
                {...register("description")}
                error={!!errors.description}
                helperText={errors.description?.message}
                fullWidth
                multiline
                rows={3}
                placeholder="es. Torneo regionale under 18, tornata di padel a Vicenza..."
              />
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Immagine copertina
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  Facoltativa — mostrata nella pagina calendario e nella card evento.
                </Typography>
                <ImageUploader
                  currentUrl={imageUrl}
                  folder="events"
                  onUploaded={setImageUrl}
                  onRemoved={() => setImageUrl(null)}
                  shape="square"
                  size={120}
                />
              </Box>

              <Divider />

              {/* Sotto-opzioni: per eventi articolati (giorni, sessioni, pasti…) */}
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Opzioni di partecipazione
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  Facoltative. Se aggiungi opzioni (es. &quot;Sabato mattina&quot;, &quot;Pranzo
                  domenica&quot;), i partecipanti spuntano a cosa partecipano invece del semplice
                  &quot;Ci sarò&quot;.
                </Typography>
                <Stack spacing={1.5}>
                  {optionDrafts.map((o, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                      <TextField
                        label="Etichetta"
                        value={o.label}
                        onChange={(e) => updateOption(i, { label: e.target.value })}
                        size="small"
                        sx={{ flex: 1, minWidth: 120 }}
                      />
                      <TextField
                        label="Data/ora"
                        type="datetime-local"
                        value={o.startsAt}
                        onChange={(e) => updateOption(i, { startsAt: e.target.value })}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: 180 }}
                      />
                      <TextField
                        label="Tipo"
                        select
                        value={o.kind}
                        onChange={(e) => updateOption(i, { kind: e.target.value })}
                        size="small"
                        sx={{ width: 120 }}
                      >
                        {OPTION_KINDS.map((k) => (
                          <MenuItem key={k.value} value={k.value}>
                            {k.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <IconButton
                        aria-label="Rimuovi opzione"
                        onClick={() => removeOption(i)}
                        sx={{ mt: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addOption}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Aggiungi opzione
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button variant="contained" size="large" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={18} /> : editingId ? "Salva" : "Crea"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle fontWeight={700}>Eliminare questo evento?</DialogTitle>
        <DialogContent>
          <Typography>L&apos;azione non è reversibile.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteId && handleDelete(deleteId)}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
