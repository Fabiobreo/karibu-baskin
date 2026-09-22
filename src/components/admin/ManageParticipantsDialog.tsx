"use client";
import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { usePeopleSearch, type AdminPerson } from "@/components/admin/people/usePeopleSearch";
import PersonRow from "@/components/admin/people/PersonRow";
import RolePicker from "@/components/admin/people/RolePicker";

export interface ParticipantRegistration {
  id: string;
  name: string;
  role: number;
  userId: string | null;
  childId: string | null;
  attended: boolean | null;
  registeredAsCoach?: boolean;
}

interface ManageParticipantsDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  /** Allenamento già iniziato: chi si aggiunge, di norma, c'era. */
  isPast: boolean;
  registrations: ParticipantRegistration[];
  /** Dopo ogni aggiunta o rimozione: il chiamante ricarica i suoi dati. */
  onChanged: () => void;
}

const personKey = (kind: "user" | "child", id: string) => `${kind}:${id}`;

/**
 * Aggiunge e toglie iscritti a un allenamento, anche passato o già chiuso:
 * serve allo staff per ricostruire le presenze o preparare i dati.
 *
 * Pensato per il telefono: a schermo intero, una sola casella di ricerca in
 * cima, e ogni azione è un tocco. Dopo un'aggiunta la ricerca si svuota e
 * resta attiva, così si inserisce il nome successivo senza toccare altro.
 * Senza ricerca la lista mostra gli iscritti attuali, con la rimozione.
 */
export default function ManageParticipantsDialog({
  open,
  onClose,
  sessionId,
  sessionTitle,
  sessionDate,
  isPast,
  registrations,
  onChanged,
}: ManageParticipantsDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [markPresent, setMarkPresent] = useState(isPast);
  // Aggiunte e rimozioni fatte qui, finché il chiamante non ricarica i dati:
  // la lista risponde subito al tocco.
  const [added, setAdded] = useState<ParticipantRegistration[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rolePickFor, setRolePickFor] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const { people, searching, enabled, isError } = usePeopleSearch(query, "all");

  const current = useMemo(() => {
    const serverIds = new Set(registrations.map((r) => r.id));
    return [...registrations, ...added.filter((a) => !serverIds.has(a.id))]
      .filter((r) => !removedIds.has(r.id))
      .sort((a, b) => a.role - b.role || a.name.localeCompare(b.name, "it"));
  }, [registrations, added, removedIds]);

  const registeredBy = useMemo(() => {
    const map = new Map<string, ParticipantRegistration>();
    for (const r of current) {
      if (r.userId) map.set(personKey("user", r.userId), r);
      if (r.childId) map.set(personKey("child", r.childId), r);
    }
    return map;
  }, [current]);

  function focusSearch() {
    // Sul telefono il focus riapre la tastiera: è quello che serve, il
    // prossimo gesto è scrivere il nome successivo.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function add(person: AdminPerson, role?: number) {
    const key = personKey(person.kind, person.id);
    if (!person.sportRole && !role) {
      setRolePickFor(key);
      return;
    }
    setBusyKey(key);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(person.kind === "user" ? { userId: person.id } : { childId: person.id }),
          ...(role ? { role } : {}),
          attended: markPresent ? true : null,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const reg = (await res.json()) as ParticipantRegistration;
      setAdded((prev) => [...prev, reg]);
      setRolePickFor(null);
      setQuery("");
      focusSearch();
      showToast({ message: `${reg.name} aggiunto`, severity: "success" });
      onChanged();
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore durante l'iscrizione",
        severity: "error",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(reg: ParticipantRegistration) {
    setBusyKey(reg.id);
    try {
      const res = await fetch(`/api/registrations/${reg.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      setRemovedIds((prev) => new Set(prev).add(reg.id));
      setConfirmRemoveId(null);
      showToast({ message: `${reg.name} tolto dall'allenamento`, severity: "success" });
      onChanged();
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore durante la rimozione",
        severity: "error",
      });
    } finally {
      setBusyKey(null);
    }
  }

  function handleClose() {
    setQuery("");
    setRolePickFor(null);
    setConfirmRemoveId(null);
    onClose();
  }

  const athletes = current.filter((r) => !r.registeredAsCoach).length;
  const present = current.filter((r) => !r.registeredAsCoach && r.attended === true).length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby="manage-participants-title"
      slotProps={{ paper: { sx: { height: { sm: "80vh" } } } }}
    >
      {/* ── Intestazione + ricerca: restano fisse, scorre solo la lista ── */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
            <Typography id="manage-participants-title" variant="h6" fontWeight={800} noWrap>
              Iscritti
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {sessionTitle} · {format(new Date(sessionDate), "EEE d MMM yyyy", { locale: it })}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} aria-label="Chiudi" sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <TextField
          inputRef={inputRef}
          autoFocus={!fullScreen}
          fullWidth
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setRolePickFor(null);
          }}
          placeholder="Cerca per nome, cognome o genitore"
          sx={{ mt: 1.5 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.disabled" }} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  {searching ? (
                    <CircularProgress size={18} />
                  ) : (
                    <IconButton
                      onClick={() => {
                        setQuery("");
                        focusSearch();
                      }}
                      aria-label="Svuota ricerca"
                      edge="end"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </InputAdornment>
              ) : null,
            },
            htmlInput: { enterKeyHint: "search", autoComplete: "off" },
          }}
        />

        <FormControlLabel
          sx={{ mt: 1, mr: 0 }}
          control={
            <Switch checked={markPresent} onChange={(e) => setMarkPresent(e.target.checked)} />
          }
          label={
            <Typography variant="body2">
              Segna presente chi aggiungo
              {isPast && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {" "}
                  (allenamento passato)
                </Typography>
              )}
            </Typography>
          }
        />
      </Box>

      <DialogContent sx={{ px: 2, py: 0 }}>
        {enabled ? (
          // ── Risultati della ricerca ─────────────────────────────────────
          <Box>
            {isError ? (
              <EmptyText>Ricerca non riuscita: riprova.</EmptyText>
            ) : people.length === 0 && !searching ? (
              <EmptyText>
                Nessuno trovato. Chi non ha un account va creato prima in Utenti (anche come figlio
                di un genitore).
              </EmptyText>
            ) : (
              people.map((p) => {
                const key = personKey(p.kind, p.id);
                const reg = registeredBy.get(key);
                const busy = busyKey === key;
                return (
                  <PersonRow
                    key={key}
                    name={p.name}
                    image={p.image}
                    sportRole={p.sportRole}
                    meta={
                      p.kind === "child"
                        ? `Figlio di ${p.parentName ?? "?"}`
                        : [p.email, p.appRole === "GUEST" ? "account in attesa" : null]
                            .filter(Boolean)
                            .join(" · ")
                    }
                    trailing={
                      reg ? (
                        <Chip
                          icon={<CheckIcon />}
                          label="Iscritto"
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      ) : (
                        <Button
                          variant="contained"
                          onClick={() => add(p)}
                          disabled={busy || busyKey !== null}
                          startIcon={
                            busy ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <PersonAddAlt1Icon />
                            )
                          }
                          sx={{ minHeight: 44 }}
                        >
                          Aggiungi
                        </Button>
                      )
                    }
                  >
                    {rolePickFor === key && (
                      <Box sx={{ pb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" component="p">
                          {p.name} non ha ancora un ruolo Baskin: con che ruolo lo iscrivi?
                        </Typography>
                        <Box sx={{ mt: 0.75 }}>
                          <RolePicker
                            value={null}
                            onChange={(r) => r && add(p, r)}
                            disabled={busyKey !== null}
                          />
                        </Box>
                      </Box>
                    )}
                  </PersonRow>
                );
              })
            )}
          </Box>
        ) : (
          // ── Iscritti attuali ────────────────────────────────────────────
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              fontWeight={700}
              component="p"
              sx={{ pt: 1.5 }}
            >
              {athletes} {athletes === 1 ? "atleta" : "atleti"}
              {isPast && ` · ${present} presenti`}
            </Typography>
            {current.length === 0 ? (
              <EmptyText>Nessun iscritto. Cerca una persona qui sopra per aggiungerla.</EmptyText>
            ) : (
              current.map((r) => {
                const confirming = confirmRemoveId === r.id;
                const busy = busyKey === r.id;
                return (
                  <PersonRow
                    key={r.id}
                    name={r.name}
                    sportRole={r.registeredAsCoach ? null : r.role}
                    meta={
                      r.registeredAsCoach ? (
                        "Allenatore"
                      ) : r.attended === true ? (
                        <AttendanceMeta present />
                      ) : r.attended === false ? (
                        <AttendanceMeta present={false} />
                      ) : !r.userId && !r.childId ? (
                        "Iscrizione anonima"
                      ) : null
                    }
                    trailing={
                      confirming ? (
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Button
                            color="inherit"
                            onClick={() => setConfirmRemoveId(null)}
                            disabled={busy}
                            sx={{ minHeight: 44 }}
                          >
                            No
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => remove(r)}
                            disabled={busy}
                            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                            sx={{ minHeight: 44 }}
                          >
                            Togli
                          </Button>
                        </Box>
                      ) : (
                        <IconButton
                          onClick={() => setConfirmRemoveId(r.id)}
                          disabled={busyKey !== null}
                          aria-label={`Togli ${r.name} dall'allenamento`}
                          sx={{ width: 44, height: 44, color: "text.secondary" }}
                        >
                          <PersonRemoveIcon />
                        </IconButton>
                      )
                    }
                  />
                );
              })
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
        <Button variant="contained" fullWidth={fullScreen} onClick={handleClose} size="large">
          Fatto
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
      {children}
    </Typography>
  );
}

function AttendanceMeta({ present }: { present: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        color: present ? "success.main" : "error.main",
      }}
    >
      {present ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <CancelIcon sx={{ fontSize: 14 }} />}
      {present ? "Presente" : "Assente"}
    </Box>
  );
}
