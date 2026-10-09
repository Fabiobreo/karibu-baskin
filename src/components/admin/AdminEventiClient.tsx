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
  TablePagination,
  MenuItem,
  Divider,
  FormControlLabel,
  Switch,
  Checkbox,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PlaceIcon from "@mui/icons-material/Place";
import EventIcon from "@mui/icons-material/Event";
import HistoryIcon from "@mui/icons-material/History";
import { useState, useTransition, useEffect, useMemo, useRef, type RefObject } from "react";
import { visuallyHidden } from "@mui/utils";
import RowActions from "@/components/admin/RowActions";
import { eventDeleteMessage, notifyActionLabel, notifyConfirm } from "@/lib/adminRowActions";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { useRowsPerPage } from "@/hooks/useRowsPerPage";
import { useRouter, useSearchParams } from "next/navigation";
import { formatRome } from "@/lib/dateUtils";
import { isoToLocalInput, localInputToIso } from "@/lib/datetimeLocal";
import { it } from "date-fns/locale";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ImageUploader from "@/components/common/ImageUploader";
import EventResponsesDialog from "@/components/admin/EventResponsesDialog";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
  slug?: string | null;
  allowGuests?: boolean;
  maxGuests?: number | null;
  /** Ultimo avviso mandato a tutti; null = creato senza avvisare. */
  lastNotifiedAt?: string | Date | null;
  options?: EventOptionRow[];
  /** Risposte date (persone ed esterni): la risposta dell'API non lo include. */
  _count?: { attendances: number };
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

export default function AdminEventiClient({
  events: initialEvents,
  readOnly = false,
}: {
  events: Event[];
  /** Dirigente: legge l'elenco e le risposte, non crea né modifica. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState(initialEvents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [responsesId, setResponsesId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>([]);
  const [allowGuests, setAllowGuests] = useState(false);
  // Stringa per l'input numerico: "" = nessun limite.
  const [maxGuests, setMaxGuests] = useState("");
  // Spunta "Avvisa tutti del nuovo evento": solo in creazione.
  const [notify, setNotify] = useState(true);
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage("events", [10, 25, 50], 10);
  const [now] = useState(() => Date.now());
  const { showToast } = useToast();
  // Dopo un'eliminazione il focus torna qui: la riga non c'è più.
  const newButtonRef = useRef<HTMLButtonElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: { title: "", date: "", endDate: "", location: "", description: "" },
  });

  // Un evento inserito a cose fatte non avvisa nessuno (lo rifiuta anche il
  // server): la spunta c'è solo in creazione e con una data futura.
  const [dateValue, endDateValue] = useWatch({ control, name: ["date", "endDate"] });
  const endsAt = endDateValue || dateValue;
  const canNotifyOnCreate = !editingId && (!endsAt || new Date(endsAt).getTime() >= now);
  const willNotify = canNotifyOnCreate && notify;

  const openCreate = () => {
    setEditingId(null);
    setImageUrl(null);
    setOptionDrafts([]);
    setAllowGuests(false);
    setMaxGuests("");
    setNotify(true);
    reset({ title: "", date: "", endDate: "", location: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (ev: Event) => {
    setEditingId(ev.id);
    setImageUrl(ev.imageUrl ?? null);
    setAllowGuests(!!ev.allowGuests);
    setMaxGuests(ev.maxGuests ? String(ev.maxGuests) : "");
    setOptionDrafts(
      (ev.options ?? []).map((o) => ({
        id: o.id,
        label: o.label,
        startsAt: isoToLocalInput(o.startsAt),
        kind: o.kind ?? "ALTRO",
      }))
    );
    reset({
      title: ev.title,
      date: isoToLocalInput(ev.date),
      endDate: isoToLocalInput(ev.endDate),
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
    if (!editId || readOnly) return;
    const ev = initialEvents.find((e) => e.id === editId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ev) openEdit(ev);
    router.replace("/admin/eventi", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: EventFormValues) => {
    const body = {
      title: values.title.trim(),
      // L'input `datetime-local` non ha fuso: senza conversione il server (UTC)
      // leggerebbe "18:00" come 18:00 UTC, cioè le 20:00 a Roma.
      date: localInputToIso(values.date),
      endDate: localInputToIso(values.endDate),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
      imageUrl: imageUrl ?? null,
      allowGuests,
      maxGuests: allowGuests && maxGuests ? Number(maxGuests) : null,
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
          body: JSON.stringify({ ...body, notify: willNotify }),
        });

    if (!res.ok) {
      const message = await readError(res);
      setError("root", { message: message });
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
        startsAt: localInputToIso(o.startsAt),
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
      setEvents((prev) =>
        prev.map((e) => (e.id === editingId ? { ...savedWithOptions, _count: e._count } : e))
      );
    } else {
      setEvents((prev) =>
        [...prev, savedWithOptions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      );
      // L'unica prova che i telefoni hanno suonato, o no.
      showToast({
        message: saved.lastNotifiedAt
          ? "Evento creato, avviso inviato"
          : "Evento creato senza avvisare",
        severity: "success",
      });
    }
    setDialogOpen(false);
    startTransition(() => router.refresh());
  };

  // Prossimi in ordine cronologico, passati dal più recente: con un elenco
  // unico per data crescente la prima pagina mostrava gli eventi più vecchi.
  // Un evento su più giorni resta fra i prossimi fino alla sua fine.
  const { upcoming, past } = useMemo(() => {
    const time = (d: string | Date) => new Date(d).getTime();
    const up: Event[] = [];
    const pa: Event[] = [];
    for (const ev of events) (time(ev.endDate ?? ev.date) >= now ? up : pa).push(ev);
    up.sort((a, b) => time(a.date) - time(b.date));
    pa.sort((a, b) => time(b.date) - time(a.date));
    return { upcoming: up, past: pa };
  }, [events, now]);

  const lastPage = Math.max(0, Math.ceil(past.length / rowsPerPage) - 1);
  const safePage = Math.min(page, lastPage);
  const pastPaginated = past.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);

  const sendNotify = async (ev: Event) => {
    const res = await fetch(`/api/events/${ev.id}/notify`, { method: "POST" });
    if (!res.ok) {
      showToast({ message: await readError(res), severity: "error" });
      return;
    }
    const { lastNotifiedAt } = (await res.json()) as { lastNotifiedAt: string };
    setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, lastNotifiedAt } : e)));
    showToast({ message: "Avviso inviato", severity: "success" });
  };

  /** "Avvisa tutti…" / "Avvisa di nuovo…": la notifica non si ritira, prima si chiede. */
  const askNotify = (ev: Event) => {
    const c = notifyConfirm({
      title: ev.title,
      lastNotifiedAt: ev.lastNotifiedAt,
      now: Date.now(),
    });
    openConfirm(c.title, c.message, () => void sendNotify(ev), {
      confirmLabel: c.confirmLabel,
      confirmColor: "primary",
    });
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast({ message: await readError(res), severity: "error" });
      return false;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    showToast({ message: "Evento eliminato", severity: "success" });
    startTransition(() => router.refresh());
  };

  return (
    <Box>
      {!readOnly && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button
            ref={newButtonRef}
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            Aggiungi evento
          </Button>
        </Box>
      )}

      {events.length === 0 ? (
        <Paper elevation={2} sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Nessun evento ancora creato
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {upcoming.length > 0 && (
            <Paper elevation={2}>
              <EventsSectionHeader
                icon={<EventIcon fontSize="small" sx={{ color: "text.secondary" }} />}
                label={`Prossimi (${upcoming.length})`}
              />
              <EventsList
                events={upcoming}
                onResponses={setResponsesId}
                onEdit={openEdit}
                onNotify={askNotify}
                onDelete={handleDelete}
                focusAfterDelete={newButtonRef}
                readOnly={readOnly}
              />
            </Paper>
          )}
          {past.length > 0 && (
            <Paper elevation={2}>
              <EventsSectionHeader
                icon={<HistoryIcon fontSize="small" sx={{ color: "text.secondary" }} />}
                label={`Passati (${past.length})`}
              />
              <EventsList
                events={pastPaginated}
                onResponses={setResponsesId}
                onEdit={openEdit}
                onDelete={handleDelete}
                focusAfterDelete={newButtonRef}
                readOnly={readOnly}
              />
              <TablePagination
                component="div"
                count={past.length}
                page={safePage}
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
          )}
        </Stack>
      )}

      {/* Dialog crea/modifica */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={FONT_WEIGHT.semibold}>
          {editingId ? "Modifica evento" : "Nuovo evento"}
        </DialogTitle>
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
                <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} sx={{ mb: 0.5 }}>
                  Immagine copertina
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  Facoltativa: mostrata nella pagina calendario e nella card evento.
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
                <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} sx={{ mb: 0.5 }}>
                  Opzioni di partecipazione
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  Facoltative (es. &quot;Sabato mattina&quot;, &quot;Pranzo domenica&quot;). Chi
                  risponde dice se viene all&apos;evento e, a parte, spunta le opzioni: si può
                  venire all&apos;evento senza il pranzo, o solo al pranzo.
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

              <Divider />

              {/* Esterni (+1): chi non è nell'app, portato da chi risponde */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={allowGuests}
                      onChange={(e) => setAllowGuests(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                      Esterni ammessi
                    </Typography>
                  }
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: allowGuests ? 1.5 : 0 }}
                >
                  Chi risponde può aggiungere persone che non sono nell&apos;app (la ragazza, i
                  nonni). I famigliari collegati nell&apos;app non servono: compaiono già.
                </Typography>
                {allowGuests && (
                  <TextField
                    label="Massimo per persona"
                    type="number"
                    size="small"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value)}
                    helperText="Vuoto = nessun limite"
                    slotProps={{ htmlInput: { min: 1, max: 20 } }}
                    sx={{ width: 200 }}
                  />
                )}
              </Box>

              {canNotifyOnCreate && (
                <>
                  <Divider />
                  <FormControlLabel
                    control={
                      <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                          Avvisa tutti del nuovo evento
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Manda una notifica a tutti. Se la spegni l&apos;evento si vede lo stesso,
                          e puoi avvisare più tardi dal menu ⋯.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", m: 0 }}
                  />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button variant="contained" size="large" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <CircularProgress size={18} />
              ) : editingId ? (
                "Salva"
              ) : willNotify ? (
                "Crea e avvisa"
              ) : (
                "Crea"
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <EventResponsesDialog eventId={responsesId} onClose={() => setResponsesId(null)} />
      {ConfirmDialog}
    </Box>
  );
}

/** Intestazione di sezione (Prossimi / Passati). */
function EventsSectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      {icon}
      <Typography component="h2" variant="subtitle2">
        {label}
      </Typography>
    </Box>
  );
}

/** Azioni di un evento: "Risposte · N" in riga, il resto nel "⋯". */
function EventRowActions({
  ev,
  onResponses,
  onEdit,
  onNotify,
  onDelete,
  focusAfterDelete,
  readOnly,
}: {
  ev: Event;
  onResponses: (id: string) => void;
  onEdit: (ev: Event) => void;
  /** Solo per gli eventi in programma: un evento passato non si avvisa più. */
  onNotify?: (ev: Event) => void;
  onDelete: (id: string) => Promise<boolean | void>;
  focusAfterDelete: RefObject<HTMLButtonElement | null>;
  readOnly: boolean;
}) {
  const responses = ev._count?.attendances ?? 0;
  const publicPage = {
    label: "Pagina pubblica",
    href: `/eventi/${ev.slug ?? ev.id}`,
    external: true,
  };
  return (
    <RowActions
      subject={ev.title}
      primary={{
        label: `Risposte · ${responses}`,
        onClick: () => onResponses(ev.id),
        emphasis: "text",
      }}
      items={
        readOnly
          ? [publicPage]
          : [
              { label: "Modifica", onClick: () => onEdit(ev) },
              ...(onNotify
                ? [{ label: notifyActionLabel(ev.lastNotifiedAt), onClick: () => onNotify(ev) }]
                : []),
              publicPage,
            ]
      }
      onDelete={readOnly ? undefined : () => onDelete(ev.id)}
      deleteLabel="Elimina evento…"
      deleteConfirm={{
        title: "Eliminare l'evento?",
        message: eventDeleteMessage(ev.title, responses),
      }}
      focusAfterDelete={focusAfterDelete}
    />
  );
}

/**
 * Tabella (desktop) e righe (telefono) di una lista di eventi, senza
 * paginazione. Su telefono il testo sta a sinistra e le azioni a destra.
 */
function EventsList({
  events,
  ...actions
}: {
  events: Event[];
  onResponses: (id: string) => void;
  onEdit: (ev: Event) => void;
  onNotify?: (ev: Event) => void;
  onDelete: (id: string) => Promise<boolean | void>;
  focusAfterDelete: RefObject<HTMLButtonElement | null>;
  readOnly: boolean;
}) {
  return (
    <>
      {/* Desktop table */}
      <Box sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold }}>Titolo</TableCell>
              <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold }}>Data inizio</TableCell>
              <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold }}>Data fine</TableCell>
              <TableCell
                sx={{
                  fontWeight: FONT_WEIGHT.semibold,
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                Luogo
              </TableCell>
              <TableCell align="right">
                <Box component="span" sx={visuallyHidden}>
                  Azioni
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev) => (
              <TableRow key={ev.id} hover>
                <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold }}>{ev.title}</TableCell>
                <TableCell>{formatRome(ev.date, "d MMM yyyy, HH:mm", { locale: it })}</TableCell>
                <TableCell>
                  {ev.endDate ? formatRome(ev.endDate, "d MMM yyyy, HH:mm", { locale: it }) : "—"}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  {ev.location ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <PlaceIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      {ev.location}
                    </Box>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell align="right">
                  <EventRowActions ev={ev} {...actions} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Telefono: righe con il testo sopra e le azioni a destra */}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        {events.map((ev) => (
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
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={FONT_WEIGHT.semibold}
                sx={{ wordBreak: "break-word" }}
              >
                {ev.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {formatRome(ev.date, "d MMM yyyy, HH:mm", { locale: it })}
                {ev.endDate && ` – ${formatRome(ev.endDate, "d MMM yyyy, HH:mm", { locale: it })}`}
              </Typography>
              {ev.location && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {ev.location}
                </Typography>
              )}
            </Box>
            <EventRowActions ev={ev} {...actions} />
          </Box>
        ))}
      </Box>
    </>
  );
}
