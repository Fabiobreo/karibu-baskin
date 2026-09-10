"use client";
import { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  Stack,
  Tooltip,
  Avatar,
  Divider,
} from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";

type Category = "APP" | "ALLENAMENTI" | "PARTITE_EVENTI" | "ALTRO";
type Status = "NUOVO" | "LETTO" | "ARCHIVIATO";

interface NoteAuthor {
  id: string;
  name: string | null;
  image: string | null;
  customImage: string | null;
}

interface Note {
  id: string;
  body: string;
  createdAt: string;
  author: NoteAuthor;
}

interface Suggestion {
  id: string;
  category: Category;
  message: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
}

interface AdminSuggerimentiClientProps {
  initialSuggestions: Suggestion[];
  currentUserId: string;
  isAdmin: boolean;
}

const CATEGORY_LABELS: Record<Category, string> = {
  APP: "App / sito",
  ALLENAMENTI: "Allenamenti",
  PARTITE_EVENTI: "Partite ed eventi",
  ALTRO: "Altro",
};

const STATUS_META: Record<Status, { label: string; color: "warning" | "info" | "default" }> = {
  NUOVO: { label: "Nuovo", color: "warning" },
  LETTO: { label: "Letto", color: "info" },
  ARCHIVIATO: { label: "Archiviato", color: "default" },
};

const FILTERS: { value: Status | "TUTTI"; label: string }[] = [
  { value: "TUTTI", label: "Tutti" },
  { value: "NUOVO", label: "Nuovi" },
  { value: "LETTO", label: "Letti" },
  { value: "ARCHIVIATO", label: "Archiviati" },
];

function fmt(iso: string): string {
  return format(new Date(iso), "d MMM yyyy, HH:mm", { locale: it });
}

export default function AdminSuggerimentiClient({
  initialSuggestions,
  currentUserId,
  isAdmin,
}: AdminSuggerimentiClientProps) {
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [items, setItems] = useState<Suggestion[]>(initialSuggestions);
  const [filter, setFilter] = useState<Status | "TUTTI">("TUTTI");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { NUOVO: 0, LETTO: 0, ARCHIVIATO: 0 };
    for (const it of items) c[it.status]++;
    return c;
  }, [items]);

  const visible = useMemo(
    () => (filter === "TUTTI" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  async function changeStatus(id: string, status: Status) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const message = await readError(res);
        throw new Error(message);
      }
      const updated: Suggestion = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setBusyId(null);
    }
  }

  function handleDeleteSuggestion(s: Suggestion) {
    openConfirm(
      "Eliminare il suggerimento?",
      "Verranno eliminate anche tutte le note. L'azione è definitiva.",
      async () => {
        setBusyId(s.id);
        try {
          const res = await fetch(`/api/suggestions/${s.id}`, { method: "DELETE" });
          if (!res.ok && res.status !== 204) {
            const message = await readError(res);
            throw new Error(message);
          }
          setItems((prev) => prev.filter((i) => i.id !== s.id));
          showToast({ message: "Suggerimento eliminato", severity: "success" });
        } catch (err) {
          showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
        } finally {
          setBusyId(null);
        }
      }
    );
  }

  async function addNote(suggestionId: string) {
    const body = (drafts[suggestionId] ?? "").trim();
    if (!body) return;
    setBusyId(suggestionId);
    try {
      const res = await fetch(`/api/suggestions/${suggestionId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const message = await readError(res);
        throw new Error(message);
      }
      const note: Note = await res.json();
      setItems((prev) =>
        prev.map((i) => (i.id === suggestionId ? { ...i, notes: [...i.notes, note] } : i))
      );
      setDrafts((prev) => ({ ...prev, [suggestionId]: "" }));
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setBusyId(null);
    }
  }

  function handleDeleteNote(suggestionId: string, note: Note) {
    openConfirm("Eliminare la nota?", "L'azione non può essere annullata.", async () => {
      try {
        const res = await fetch(`/api/suggestions/${suggestionId}/notes/${note.id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
          const message = await readError(res);
          throw new Error(message);
        }
        setItems((prev) =>
          prev.map((i) =>
            i.id === suggestionId ? { ...i, notes: i.notes.filter((n) => n.id !== note.id) } : i
          )
        );
      } catch (err) {
        showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
      }
    });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Filtri */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        {FILTERS.map((f) => {
          const count = f.value === "TUTTI" ? items.length : counts[f.value];
          return (
            <Chip
              key={f.value}
              label={`${f.label} (${count})`}
              onClick={() => setFilter(f.value)}
              color={filter === f.value ? "primary" : "default"}
              variant={filter === f.value ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
          );
        })}
      </Stack>

      {visible.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 4, textAlign: "center", border: "1px dashed", borderColor: "divider" }}
        >
          <Typography color="text.secondary">Nessun suggerimento in questa categoria.</Typography>
        </Paper>
      ) : (
        visible.map((s) => {
          const busy = busyId === s.id;
          return (
            <Paper
              key={s.id}
              elevation={1}
              sx={{
                p: 2.5,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                opacity: s.status === "ARCHIVIATO" ? 0.75 : 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={STATUS_META[s.status].label}
                  color={STATUS_META[s.status].color}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={CATEGORY_LABELS[s.category]}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                  {fmt(s.createdAt)}
                </Typography>
              </Box>

              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {s.message}
              </Typography>

              {/* Thread note staff */}
              {s.notes.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mt: 0.5 }}>
                  <Divider />
                  {s.notes.map((n) => {
                    const canDelete = isAdmin || n.author.id === currentUserId;
                    return (
                      <Box key={n.id} sx={{ display: "flex", gap: 1.25 }}>
                        <Avatar
                          src={n.author.customImage ?? n.author.image ?? undefined}
                          sx={{ width: 32, height: 32, fontSize: "0.8rem" }}
                        >
                          {n.author.name?.[0]?.toUpperCase() ?? "?"}
                        </Avatar>
                        <Box
                          sx={{
                            flex: 1,
                            bgcolor: "action.hover",
                            borderRadius: 1.5,
                            p: 1.25,
                          }}
                        >
                          <Box
                            sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
                          >
                            <Typography variant="caption" fontWeight={700}>
                              {n.author.name ?? "Staff"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {fmt(n.createdAt)}
                            </Typography>
                            {canDelete && (
                              <Tooltip title="Elimina nota">
                                <IconButton
                                  size="small"
                                  color="error"
                                  sx={{ ml: "auto", p: 0.25 }}
                                  onClick={() => handleDeleteNote(s.id, n)}
                                >
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}>
                            {n.body}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Aggiungi nota / rispondi */}
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mt: 0.5 }}>
                <TextField
                  placeholder="Aggiungi una nota o una risposta…"
                  value={drafts[s.id] ?? ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  size="small"
                  fullWidth
                  multiline
                  maxRows={4}
                  inputProps={{ maxLength: 1000 }}
                />
                <Button
                  variant="contained"
                  disabled={busy || !(drafts[s.id] ?? "").trim()}
                  onClick={() => addNote(s.id)}
                  startIcon={<SendIcon />}
                  sx={{ flexShrink: 0, fontWeight: 700 }}
                >
                  Invia
                </Button>
              </Box>

              <Divider sx={{ mt: 0.5 }} />

              {/* Azioni stato */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                {s.status === "NUOVO" && (
                  <Button
                    size="small"
                    startIcon={<MarkEmailReadIcon />}
                    disabled={busy}
                    onClick={() => changeStatus(s.id, "LETTO")}
                  >
                    Segna letto
                  </Button>
                )}
                {s.status !== "ARCHIVIATO" ? (
                  <Button
                    size="small"
                    startIcon={<ArchiveIcon />}
                    disabled={busy}
                    onClick={() => changeStatus(s.id, "ARCHIVIATO")}
                  >
                    Archivia
                  </Button>
                ) : (
                  <Button
                    size="small"
                    startIcon={<UnarchiveIcon />}
                    disabled={busy}
                    onClick={() => changeStatus(s.id, "LETTO")}
                  >
                    Riapri
                  </Button>
                )}
                <Tooltip title="Elimina suggerimento">
                  <span style={{ marginLeft: "auto" }}>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={busy}
                      onClick={() => handleDeleteSuggestion(s)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Paper>
          );
        })
      )}

      {ConfirmDialog}
    </Box>
  );
}
