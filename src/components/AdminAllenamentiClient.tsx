"use client";
import { useState } from "react";
import {
  Box, Typography, Paper, Button, Chip, IconButton, Tooltip,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  DialogContentText, Grid2 as Grid, TextField, Alert, Menu, MenuItem, ListItemIcon, ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import LaunchIcon from "@mui/icons-material/Launch";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import AdminSessionForm from "@/components/AdminSessionForm";
import { useToast } from "@/context/ToastContext";

// ── Tipi ─────────────────────────────────────────────────────────────────────

interface SessionWithCount {
  id: string;
  title: string;
  date: string | Date;
  endTime: string | Date | null;
  dateSlug: string | null;
  teams: unknown;
  _count: { registrations: number };
}

type StatusInfo = { label: string; color: string };

function getStatus(date: Date, endTime: Date | null): StatusInfo {
  const now = new Date();
  const end = endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000);
  if (now >= date && now <= end) return { label: "In corso", color: "#2E7D32" };
  if (now > end) return { label: "Terminato", color: "#9E9E9E" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: "Oggi!", color: "#E65100" };
  if (diffDays === 1) return { label: "Domani", color: "#1565C0" };
  return { label: `Tra ${diffDays} giorni`, color: "#1565C0" };
}

function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toLocalTimeString(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function AdminAllenamentiClient({ initialSessions }: { initialSessions: SessionWithCount[] }) {
  const [sessions, setSessions] = useState<SessionWithCount[]>(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [toDelete, setToDelete] = useState<SessionWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [teamPickSession, setTeamPickSession] = useState<SessionWithCount | null>(null);
  const [removingTeams, setRemovingTeams] = useState<string | null>(null);

  // Modifica
  const [editSession, setEditSession] = useState<SessionWithCount | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const { showToast } = useToast();

  async function loadSessions() {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
  }

  function openEdit(s: SessionWithCount) {
    const date = new Date(s.date);
    const end = s.endTime ? new Date(s.endTime) : null;
    setEditSession(s);
    setEditTitle(s.title);
    setEditDate(toLocalDateString(date));
    setEditTime(toLocalTimeString(date));
    setEditEndTime(end ? toLocalTimeString(end) : "");
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editSession) return;
    if (!editTitle.trim()) { setEditError("Il titolo è obbligatorio"); return; }
    if (!editDate) { setEditError("La data è obbligatoria"); return; }
    if (editEndTime && editEndTime <= editTime) { setEditError("L'orario di fine deve essere dopo l'inizio"); return; }
    setEditLoading(true);
    setEditError("");
    try {
      const dateTime = new Date(`${editDate}T${editTime}:00`);
      const endDateTime = editEndTime ? new Date(`${editDate}T${editEndTime}:00`) : null;
      const res = await fetch(`/api/sessions/${editSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          date: dateTime.toISOString(),
          endTime: endDateTime?.toISOString() ?? null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error ?? "Errore nel salvataggio");
        return;
      }
      const updated: SessionWithCount = await res.json();
      setSessions((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
      showToast({ message: "Allenamento aggiornato", severity: "success" });
      setEditSession(null);
    } catch {
      setEditError("Errore di rete, riprova");
    } finally {
      setEditLoading(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${toDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== toDelete.id));
        showToast({ message: `"${toDelete.title}" eliminato`, severity: "success" });
        setToDelete(null);
      } else {
        showToast({ message: "Errore nell'eliminazione", severity: "error" });
      }
    } finally {
      setDeleting(false);
    }
  }

  async function removeTeams(session: SessionWithCount) {
    setRemovingTeams(session.id);
    try {
      const res = await fetch(`/api/teams/${session.id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, teams: null } : s));
        showToast({ message: `Squadre rimosse per "${session.title}"`, severity: "success" });
      } else {
        showToast({ message: "Errore nella rimozione delle squadre", severity: "error" });
      }
    } finally {
      setRemovingTeams(null);
    }
  }

  async function generateTeams(session: SessionWithCount, numTeams: 2 | 3) {
    setTeamPickSession(null);
    setGenerating(session.id);
    const wasAlreadyGenerated = !!session.teams;
    try {
      const res = await fetch(`/api/teams/${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTeams }),
      });
      if (res.ok) {
        await loadSessions();
        showToast({
          message: wasAlreadyGenerated
            ? `Squadre rigenerate per "${session.title}"`
            : `${numTeams} squadre generate per "${session.title}"`,
          severity: "success",
        });
      } else {
        showToast({ message: "Errore nella generazione delle squadre", severity: "error" });
      }
    } finally {
      setGenerating(null);
    }
  }

  const now = new Date();

  const upcoming = [...sessions]
    .filter((s) => {
      const end = s.endTime
        ? new Date(s.endTime)
        : new Date(new Date(s.date).getTime() + 2 * 60 * 60 * 1000);
      return end >= now;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = [...sessions]
    .filter((s) => {
      const end = s.endTime
        ? new Date(s.endTime)
        : new Date(new Date(s.date).getTime() + 2 * 60 * 60 * 1000);
      return end < now;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <Button startIcon={<ArrowBackIcon />} size="small" sx={{ fontWeight: 500 }}>
              Dashboard
            </Button>
          </Link>
          <Typography variant="h5" fontWeight={700}>Gestione Allenamenti</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
          Nuovo allenamento
        </Button>
      </Box>

      {/* ── Prossimi allenamenti ── */}
      <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: "0.1em", display: "block", mb: 1.5 }}>
        Prossimi ({upcoming.length})
      </Typography>

      {upcoming.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center", mb: 4, borderStyle: "dashed" }}>
          <Typography color="text.secondary">Nessun allenamento programmato.</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setShowForm(true)}>
            Aggiungi il primo
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {upcoming.map((s) => (
            <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <SessionCard
                session={s}
                generating={generating}
                removingTeams={removingTeams}
                onDelete={() => setToDelete(s)}
                onEdit={() => openEdit(s)}
                onGenerateTeams={() => setTeamPickSession(s)}
                onRemoveTeams={() => removeTeams(s)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Allenamenti passati ── */}
      {past.length > 0 && (
        <Box>
          <Button
            size="small"
            endIcon={showPast ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowPast((v) => !v)}
            sx={{ color: "text.secondary", fontWeight: 600, mb: showPast ? 1.5 : 0 }}
          >
            Allenamenti passati ({past.length})
          </Button>
          {showPast && (
            <Grid container spacing={2}>
              {past.map((s) => (
                <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <SessionCard
                    session={s}
                    generating={generating}
                    removingTeams={removingTeams}
                    onDelete={() => setToDelete(s)}
                    onEdit={() => openEdit(s)}
                    onGenerateTeams={() => setTeamPickSession(s)}
                    onRemoveTeams={() => removeTeams(s)}
                    muted
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ── Dialog: nuovo allenamento ── */}
      <Dialog open={showForm} onClose={() => !formLoading && setShowForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Nuovo allenamento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <AdminSessionForm
              showTitle={false}
              formId="new-session-form"
              onLoadingChange={setFormLoading}
              onCreated={() => { loadSessions(); setShowForm(false); setFormLoading(false); }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setShowForm(false)} disabled={formLoading} color="inherit">
            Annulla
          </Button>
          <Button
            type="submit"
            form="new-session-form"
            variant="contained"
            disabled={formLoading}
            startIcon={formLoading ? <CircularProgress size={16} color="inherit" /> : <EventAvailableIcon />}
            sx={{ px: 3 }}
          >
            {formLoading ? "Creazione..." : "Crea allenamento"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: modifica allenamento ── */}
      <Dialog open={!!editSession} onClose={() => !editLoading && setEditSession(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Modifica allenamento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              label="Titolo"
              value={editTitle}
              onChange={(e) => { setEditTitle(e.target.value); setEditError(""); }}
              fullWidth size="small"
              disabled={editLoading}
              autoFocus
            />
            <TextField
              label="Data"
              type="date"
              value={editDate}
              onChange={(e) => { setEditDate(e.target.value); setEditError(""); }}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={editLoading}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Inizio"
                type="time"
                value={editTime}
                onChange={(e) => { setEditTime(e.target.value); setEditError(""); }}
                size="small"
                InputLabelProps={{ shrink: true }}
                disabled={editLoading}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Fine"
                type="time"
                value={editEndTime}
                onChange={(e) => { setEditEndTime(e.target.value); setEditError(""); }}
                size="small"
                InputLabelProps={{ shrink: true }}
                disabled={editLoading}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setEditSession(null)} disabled={editLoading} color="inherit">
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={16} color="inherit" /> : <EventAvailableIcon />}
            sx={{ px: 3 }}
          >
            {editLoading ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: scelta numero squadre ── */}
      <Dialog open={!!teamPickSession} onClose={() => setTeamPickSession(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Quante squadre?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Scegli il numero di squadre per <strong>{teamPickSession?.title}</strong>.
          </DialogContentText>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button variant="contained" fullWidth onClick={() => generateTeams(teamPickSession!, 2)} sx={{ py: 1.5, fontSize: "1rem" }}>
              2 squadre
            </Button>
            <Button variant="outlined" fullWidth onClick={() => generateTeams(teamPickSession!, 3)} sx={{ py: 1.5, fontSize: "1rem" }}>
              3 squadre
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamPickSession(null)}>Annulla</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: conferma eliminazione ── */}
      <Dialog open={!!toDelete} onClose={() => !deleting && setToDelete(null)}>
        <DialogTitle fontWeight={700}>Elimina allenamento</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Elimina &quot;{toDelete?.title}&quot;? Verranno eliminate anche tutte le iscrizioni associate.
            Questa azione è irreversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>Annulla</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Eliminazione..." : "Elimina"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Card singolo allenamento ──────────────────────────────────────────────────

function SessionCard({
  session: s,
  generating,
  removingTeams,
  onDelete,
  onEdit,
  onGenerateTeams,
  onRemoveTeams,
  muted = false,
}: {
  session: SessionWithCount;
  generating: string | null;
  removingTeams: string | null;
  onDelete: () => void;
  onEdit: () => void;
  onGenerateTeams: () => void;
  onRemoveTeams: () => void;
  muted?: boolean;
}) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const status = getStatus(date, endTime);
  const hasTeams = !!s.teams;
  const isGenerating = generating === s.id;
  const isRemoving = removingTeams === s.id;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const iconColor = muted ? "text.disabled" : "rgba(255,255,255,0.7)";

  return (
    <Paper
      elevation={muted ? 0 : 2}
      variant={muted ? "outlined" : "elevation"}
      sx={{ overflow: "hidden", height: "100%", display: "flex", flexDirection: "column", opacity: muted ? 0.72 : 1 }}
    >
      {/* ── Intestazione ── */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: muted
            ? "rgba(0,0,0,0.04)"
            : "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        {/* Titolo cliccabile */}
        <Box
          component={Link}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            textDecoration: "none",
            "& .launch-icon": { opacity: 0, transition: "opacity 0.15s" },
            "&:hover .launch-icon": { opacity: 1 },
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: muted ? "text.primary" : "#fff" }}>
            {s.title}
          </Typography>
          <LaunchIcon className="launch-icon" sx={{ fontSize: 13, color: iconColor, flexShrink: 0 }} />
        </Box>

        {/* Chip stato */}
        <Chip
          label={status.label}
          size="small"
          sx={{
            bgcolor: muted ? "action.selected" : status.color,
            color: muted ? "text.secondary" : "#fff",
            fontWeight: 700,
            fontSize: "0.68rem",
            flexShrink: 0,
          }}
        />

        {/* Menu kebab */}
        <IconButton
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ color: iconColor, ml: 0.25, flexShrink: 0 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={!!menuAnchor}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem onClick={() => { setMenuAnchor(null); onEdit(); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifica</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setMenuAnchor(null); onDelete(); }} sx={{ color: "error.main" }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Elimina</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {/* ── Corpo ── */}
      <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <CalendarTodayIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {format(date, "EEEE d MMMM yyyy", { locale: it })}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <AccessTimeIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          <Typography variant="body2" color="text.secondary">
            {format(date, "HH:mm")}
            {endTime && `–${format(endTime, "HH:mm")}`}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <GroupsIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          <Typography variant="body2" color="text.secondary">
            {s._count.registrations} {s._count.registrations === 1 ? "iscritto" : "iscritti"}
          </Typography>
        </Box>

        {/* ── Genera / rimuovi squadre ── */}
        <Box sx={{ mt: "auto", pt: 1.5 }}>
          {hasTeams ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                icon={<CheckCircleIcon />}
                label="Squadre generate"
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: "0.72rem" }}
              />
              <Tooltip title="Rimuovi le squadre generate">
                <Button
                  size="small"
                  color="error"
                  onClick={onRemoveTeams}
                  disabled={isRemoving}
                  sx={{ fontSize: "0.72rem", minWidth: 0, px: 1 }}
                >
                  {isRemoving ? <CircularProgress size={12} color="error" /> : "Rimuovi"}
                </Button>
              </Tooltip>
            </Box>
          ) : (
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={isGenerating ? <CircularProgress size={14} /> : <SportsBasketballIcon />}
              onClick={onGenerateTeams}
              disabled={isGenerating || s._count.registrations === 0}
              sx={{ fontSize: "0.78rem", borderStyle: "dashed" }}
            >
              {isGenerating ? "Generazione..." : "Genera squadre"}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
