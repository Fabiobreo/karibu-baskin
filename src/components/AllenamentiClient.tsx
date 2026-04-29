"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Divider,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LockIcon from "@mui/icons-material/Lock";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import SessionCard, { type SessionWithCount } from "@/components/SessionCard";
import TeamsModal from "@/components/TeamsModal";
import SessionRestrictionEditor, { seasonForDate, type RestrictionValue } from "@/components/SessionRestrictionEditor";
import AdminSessionForm from "@/components/AdminSessionForm";

function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toLocalTimeString(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const DEFAULT_RESTRICTIONS: RestrictionValue = { allowedRoles: [], restrictTeamId: null, openRoles: [] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByMonth(
  sessions: SessionWithCount[],
): [string, SessionWithCount[]][] {
  const map = new Map<string, SessionWithCount[]>();
  for (const s of sessions) {
    const key = format(new Date(s.date), "MMMM yyyy", { locale: it });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries());
}

// ── Hero card (prossimo allenamento) ──────────────────────────────────────────

function HeroCard({
  session: s,
  isRegistered,
  isStaff = false,
  onEdit,
  onDelete,
  onGenerateTeams,
  onRemoveTeams,
  generating = false,
  removingTeams = false,
}: {
  session: SessionWithCount;
  isRegistered: boolean;
  isStaff?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerateTeams?: () => void;
  onRemoveTeams?: () => void;
  generating?: boolean;
  removingTeams?: boolean;
}) {
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const hasTeams = !!s.teams;

  const now = new Date();
  const diffDays = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
    (1000 * 60 * 60 * 24),
  );
  const whenLabel =
    diffDays === 0 ? "Oggi!" : diffDays === 1 ? "Domani" : `Tra ${diffDays} giorni`;
  const whenColor = diffDays === 0 ? "#E65100" : "#1565C0";

  return (
    <>
      <Paper elevation={4} sx={{ overflow: "hidden", mb: 3, position: "relative" }}>
        {/* Stretched link */}
        <Box
          component={Link}
          href={href}
          aria-label={s.title}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: "-2px",
            },
          }}
        />

        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
            px: { xs: 2.5, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: "rgba(255,255,255,0.45)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              display: "block",
              mb: 0.5,
            }}
          >
            Prossimo allenamento
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                color: "#fff",
                lineHeight: 1.2,
                fontSize: { xs: "1.3rem", sm: "1.6rem" },
              }}
            >
              {s.title}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, mt: 0.25 }}>
              <Chip
                label={whenLabel}
                size="small"
                sx={{
                  bgcolor: whenColor,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                }}
              />
              {isStaff && (
                <IconButton
                  size="small"
                  aria-label="Azioni allenamento"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuAnchor(e.currentTarget); }}
                  sx={{ color: "rgba(255,255,255,0.7)", pointerEvents: "auto" }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
          {isStaff && (
            <Menu
              anchorEl={menuAnchor}
              open={!!menuAnchor}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {!hasTeams && (
                <MenuItem onClick={() => { setMenuAnchor(null); onGenerateTeams?.(); }}>
                  <ListItemIcon><SportsBasketballIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Genera squadre</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => { setMenuAnchor(null); onEdit?.(); }}>
                <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Modifica</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); onDelete?.(); }} sx={{ color: "error.main" }}>
                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Elimina</ListItemText>
              </MenuItem>
            </Menu>
          )}
        </Box>

        {/* Meta */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3 },
            py: 1.75,
            display: "flex",
            flexWrap: "wrap",
            gap: { xs: 1.5, sm: 2.5 },
            alignItems: "center",
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <CalendarTodayIcon sx={{ fontSize: 15, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {format(date, "EEEE d MMMM", { locale: it })}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <AccessTimeIcon sx={{ fontSize: 15, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {format(date, "HH:mm")}
              {endTime && `–${format(endTime, "HH:mm")}`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <GroupsIcon sx={{ fontSize: 15, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {s._count.registrations}{" "}
              {s._count.registrations === 1 ? "iscritto" : "iscritti"}
            </Typography>
          </Box>
          {(s.allowedRoles && s.allowedRoles.length > 0 || s.restrictTeamId) && (
            <Chip
              icon={<LockIcon sx={{ fontSize: "0.8rem !important" }} />}
              label={s.restrictTeam
                ? `Solo ${s.restrictTeam.name}${s.allowedRoles?.length ? ` · ${s.allowedRoles.map((r) => `Ruolo ${r}`).join(", ")}` : ""}`
                : s.allowedRoles!.map((r) => `Ruolo ${r}`).join(", ")}
              size="small"
              sx={{ fontSize: "0.68rem", height: 20, bgcolor: "warning.light", color: "warning.contrastText" }}
            />
          )}
          {s.restrictTeamId && s.openRoles && s.openRoles.length > 0 && (
            <Chip
              icon={<LockOpenIcon sx={{ fontSize: "0.8rem !important" }} />}
              label={`${s.openRoles.map((r) => `Ruolo ${r}`).join(", ")} ${s.openRoles.length === 1 ? "aperto" : "aperti"} a tutti`}
              size="small"
              sx={{ fontSize: "0.68rem", height: 20, bgcolor: "success.light", color: "success.contrastText" }}
            />
          )}
        </Box>

        {/* CTA */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3 },
            pb: 2.5,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            position: "relative",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {isRegistered ? (
            <Chip
              icon={<CheckCircleIcon />}
              label="Sei iscritto"
              color="success"
              sx={{ fontWeight: 700, pointerEvents: "auto" }}
            />
          ) : (
            <Button
              component={Link}
              href={href}
              variant="contained"
              size="small"
              sx={{ fontWeight: 700, pointerEvents: "auto" }}
            >
              Iscriviti →
            </Button>
          )}
          {hasTeams && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<SportsBasketballIcon sx={{ fontSize: "0.9rem !important" }} />}
              onClick={() => setTeamsOpen(true)}
              sx={{ fontWeight: 600, pointerEvents: "auto" }}
            >
              Vedi squadre
            </Button>
          )}
          {isStaff && hasTeams && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => onRemoveTeams?.()}
              disabled={removingTeams}
              sx={{ fontWeight: 600, pointerEvents: "auto" }}
            >
              {removingTeams ? <CircularProgress size={14} color="inherit" /> : "Rimuovi squadre"}
            </Button>
          )}
          {isStaff && !hasTeams && (
            <Button
              variant="outlined"
              size="small"
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <SportsBasketballIcon sx={{ fontSize: "0.9rem !important" }} />}
              onClick={() => onGenerateTeams?.()}
              disabled={generating}
              sx={{ fontWeight: 600, pointerEvents: "auto" }}
            >
              {generating ? "Generazione..." : "Genera squadre"}
            </Button>
          )}
        </Box>
      </Paper>

      {hasTeams && (
        <TeamsModal
          open={teamsOpen}
          onClose={() => setTeamsOpen(false)}
          sessionTitle={s.title}
          teamA={s.teams!.teamA}
          teamB={s.teams!.teamB}
          teamC={s.teams!.teamC}
        />
      )}
    </>
  );
}

// ── Session row (lista compatta) ──────────────────────────────────────────────

function SessionRow({
  session: s,
  isRegistered = false,
  muted = false,
  isStaff = false,
  onEdit,
  onDelete,
  onGenerateTeams,
  onRemoveTeams,
}: {
  session: SessionWithCount;
  isRegistered?: boolean;
  muted?: boolean;
  isStaff?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerateTeams?: () => void;
  onRemoveTeams?: () => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;

  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1.5, sm: 2 },
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        borderRadius: 0,
        textDecoration: "none",
        color: "inherit",
        opacity: muted ? 0.62 : 1,
        "&:hover": { bgcolor: "action.hover" },
        transition: "background-color 0.15s",
      }}
    >
      {/* Giorno numero + abbreviazione */}
      <Box
        sx={{
          width: { xs: 36, sm: 44 },
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "text.disabled",
            fontWeight: 700,
            lineHeight: 1,
            textTransform: "uppercase",
            fontSize: "0.62rem",
            letterSpacing: "0.05em",
          }}
        >
          {format(date, "EEE", { locale: it })}
        </Typography>
        <Typography
          fontWeight={800}
          sx={{ lineHeight: 1.3, fontSize: { xs: "1.1rem", sm: "1.2rem" } }}
        >
          {format(date, "d")}
        </Typography>
      </Box>

      {/* Titolo + orario */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {s.title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.disabled">
            {format(date, "HH:mm")}
            {endTime && `–${format(endTime, "HH:mm")}`}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            <GroupsIcon sx={{ fontSize: 11, color: "text.disabled" }} />
            <Typography variant="caption" color="text.disabled">
              {s._count.registrations}
            </Typography>
          </Box>
          {(s.allowedRoles && s.allowedRoles.length > 0 || s.restrictTeamId) && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
              <LockIcon sx={{ fontSize: 10, color: "text.disabled" }} />
              <Typography variant="caption" color="text.disabled">
                {s.restrictTeam
                  ? `Solo ${s.restrictTeam.name}`
                  : s.allowedRoles!.map((r) => `Ruolo ${r}`).join(", ")}
              </Typography>
            </Box>
          )}
          {s.restrictTeamId && s.openRoles && s.openRoles.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
              <LockOpenIcon sx={{ fontSize: 10, color: "text.disabled" }} />
              <Typography variant="caption" color="text.disabled">
                {s.openRoles.map((r) => `R${r}`).join(", ")} aperti
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Icone di stato */}
      {isRegistered && (
        <CheckCircleIcon
          sx={{ color: "success.main", fontSize: 18, flexShrink: 0 }}
        />
      )}
      {s.teams && !isRegistered && (
        <SportsBasketballIcon
          sx={{
            color: "primary.main",
            fontSize: 15,
            flexShrink: 0,
            opacity: 0.6,
          }}
        />
      )}

      {isStaff && s.teams && (
        <IconButton
          size="small"
          color="error"
          aria-label="Rimuovi squadre"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemoveTeams?.(); }}
          sx={{ flexShrink: 0, opacity: 0.6, "&:hover": { opacity: 1 } }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {isStaff ? (
        <>
          <IconButton
            size="small"
            aria-label="Azioni allenamento"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuAnchor(e.currentTarget); }}
            sx={{ color: "text.disabled", flexShrink: 0, mr: -0.5 }}
          >
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            {!s.teams && (
              <MenuItem onClick={() => { setMenuAnchor(null); onGenerateTeams?.(); }}>
                <ListItemIcon><SportsBasketballIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Genera squadre</ListItemText>
              </MenuItem>
            )}
            <MenuItem onClick={() => { setMenuAnchor(null); onEdit?.(); }}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Modifica</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); onDelete?.(); }} sx={{ color: "error.main" }}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>Elimina</ListItemText>
            </MenuItem>
          </Menu>
        </>
      ) : (
        <ChevronRightIcon
          sx={{ color: "text.disabled", fontSize: 18, flexShrink: 0 }}
        />
      )}
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const PAST_PAGE_SIZE = 6;

function deriveSections(sessions: SessionWithCount[], now: Date) {
  const inCorso = sessions.filter((s) => {
    const start = new Date(s.date);
    const end = s.endTime ? new Date(s.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
  });
  const upcoming = sessions.filter((s) => new Date(s.date) > now);
  const past = sessions
    .filter((s) => {
      const end = s.endTime ? new Date(s.endTime) : new Date(new Date(s.date).getTime() + 2 * 60 * 60 * 1000);
      return end < now;
    })
    .reverse();
  return { inCorso, upcoming, past };
}

export default function AllenamentiClient({
  inCorso: initInCorso,
  upcoming: initUpcoming,
  past: initPast,
  registeredSessionIds,
  seasonAttended,
  seasonTotal,
  isLoggedIn,
  isStaff = false,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  past: SessionWithCount[];
  registeredSessionIds: string[];
  seasonAttended: number;
  seasonTotal: number;
  isLoggedIn: boolean;
  isStaff?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [showPast, setShowPast] = useState(false);
  const [pastPage, setPastPage] = useState(1);

  // Local sessions state so we can optimistically update after mutations
  const [sessions, setSessions] = useState<SessionWithCount[]>(() => [
    ...initInCorso, ...initUpcoming, ...initPast,
  ]);

  const now = new Date();
  const { inCorso, upcoming, past } = deriveSections(sessions, now);

  // Auto-apri dialog modifica se ?edit=[id] è in URL (es. da calendario)
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    const s = sessions.find((s) => s.id === editId);
    if (s) openEdit(s);
    router.replace("/allenamenti", { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New session state
  const [newOpen, setNewOpen] = useState(false);
  const [newLoading, setNewLoading] = useState(false);

  async function loadSessions() {
    const res = await fetch("/api/sessions");
    if (!res.ok) return;
    const data: SessionWithCount[] = await res.json();
    setSessions(data);
  }

  // Edit state
  const [editSession, setEditSession] = useState<SessionWithCount | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editRestrictions, setEditRestrictions] = useState<RestrictionValue>(DEFAULT_RESTRICTIONS);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [toDelete, setToDelete] = useState<SessionWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Teams state
  const [teamPickSession, setTeamPickSession] = useState<SessionWithCount | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [removingTeams, setRemovingTeams] = useState<string | null>(null);

  function openEdit(s: SessionWithCount) {
    const date = new Date(s.date);
    const end = s.endTime ? new Date(s.endTime) : null;
    setEditSession(s);
    setEditTitle(s.title);
    setEditDate(toLocalDateString(date));
    setEditTime(toLocalTimeString(date));
    setEditEndTime(end ? toLocalTimeString(end) : "");
    setEditRestrictions({
      allowedRoles: s.allowedRoles ?? [],
      restrictTeamId: s.restrictTeamId ?? null,
      openRoles: s.openRoles ?? [],
    });
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
      const dateSlug = `${editDate}${editTime}`.replace(/-/g, "").replace(":", "");
      const res = await fetch(`/api/sessions/${editSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          date: dateTime.toISOString(),
          endTime: endDateTime?.toISOString() ?? null,
          dateSlug,
          allowedRoles: editRestrictions.allowedRoles,
          restrictTeamId: editRestrictions.restrictTeamId,
          openRoles: editRestrictions.openRoles,
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
      router.refresh();
    } catch {
      setEditError("Errore di rete, riprova");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleRemoveTeams(s: SessionWithCount) {
    setRemovingTeams(s.id);
    try {
      const res = await fetch(`/api/teams/${s.id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.map((p) => p.id === s.id ? { ...p, teams: null } : p));
        showToast({ message: `Squadre rimosse per "${s.title}"`, severity: "success" });
      } else {
        showToast({ message: "Errore nella rimozione delle squadre", severity: "error" });
      }
    } finally {
      setRemovingTeams(null);
    }
  }

  async function handleGenerateTeams(s: SessionWithCount, numTeams: 2 | 3) {
    setTeamPickSession(null);
    setGenerating(s.id);
    try {
      const res = await fetch(`/api/teams/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTeams }),
      });
      if (res.ok) {
        const newTeams = await res.json();
        setSessions((prev) => prev.map((p) => p.id === s.id ? { ...p, teams: newTeams } : p));
        showToast({ message: `${numTeams} squadre generate per "${s.title}"`, severity: "success" });
      } else {
        showToast({ message: "Errore nella generazione delle squadre", severity: "error" });
      }
    } finally {
      setGenerating(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${toDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast({ message: `"${toDelete.title}" eliminato`, severity: "success" });
        setSessions((prev) => prev.filter((s) => s.id !== toDelete.id));
        setToDelete(null);
        router.refresh();
      } else {
        showToast({ message: "Errore nell'eliminazione", severity: "error" });
      }
    } finally {
      setDeleting(false);
    }
  }

  const registeredSet = new Set(registeredSessionIds);
  const [nextSession, ...restUpcoming] = upcoming;
  const monthGroups = groupByMonth(restUpcoming);
  const pastVisible = past.slice(0, pastPage * PAST_PAGE_SIZE);
  const hasMorePast = pastVisible.length < past.length;

  const attendancePct =
    seasonTotal > 0 ? Math.round((seasonAttended / seasonTotal) * 100) : 0;

  return (
    <Box>
      {/* ── Toolbar staff ── */}
      {isStaff && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}>
            Nuovo allenamento
          </Button>
        </Box>
      )}

      {/* ── In corso ── */}
      {inCorso.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#2E7D32",
                flexShrink: 0,
                "@keyframes pulse": {
                  "0%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.7)" },
                  "70%": { boxShadow: "0 0 0 8px rgba(46,125,50,0)" },
                  "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0)" },
                },
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <Typography
              variant="overline"
              fontWeight={700}
              sx={{ letterSpacing: "0.1em", color: "#2E7D32" }}
            >
              In corso
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {inCorso.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                live
                isRegistered={registeredSet.has(s.id)}
                isStaff={isStaff}
                onEdit={() => openEdit(s)}
                onDelete={() => setToDelete(s)}
                onGenerateTeams={() => setTeamPickSession(s)}
                onRemoveTeams={() => handleRemoveTeams(s)}
                generating={generating === s.id}
                removingTeams={removingTeams === s.id}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Prossimi ── */}
      {upcoming.length === 0 ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 4, textAlign: "center", mb: 3, borderStyle: "dashed" }}
        >
          <Typography color="text.secondary">
            Nessun allenamento programmato.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Hero — prossimo */}
          <HeroCard
            session={nextSession}
            isRegistered={registeredSet.has(nextSession.id)}
            isStaff={isStaff}
            onEdit={() => openEdit(nextSession)}
            onDelete={() => setToDelete(nextSession)}
            onGenerateTeams={() => setTeamPickSession(nextSession)}
            onRemoveTeams={() => handleRemoveTeams(nextSession)}
            generating={generating === nextSession.id}
            removingTeams={removingTeams === nextSession.id}
          />

          {/* Gruppi per mese */}
          {monthGroups.map(([month, sessions]) => (
            <Box key={month} sx={{ mb: 2.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 1,
                }}
              >
                <Typography
                  variant="overline"
                  fontWeight={700}
                  sx={{
                    color: "text.disabled",
                    letterSpacing: "0.1em",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {month}
                </Typography>
                <Divider sx={{ flex: 1 }} />
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {sessions.length}{" "}
                  {sessions.length === 1 ? "allenamento" : "allenamenti"}
                </Typography>
              </Box>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ borderRadius: 2, overflow: "hidden" }}
              >
                {sessions.map((s, i) => (
                  <Box key={s.id}>
                    {i > 0 && <Divider />}
                    <SessionRow
                      session={s}
                      isRegistered={registeredSet.has(s.id)}
                      isStaff={isStaff}
                      onEdit={() => openEdit(s)}
                      onDelete={() => setToDelete(s)}
                      onGenerateTeams={() => setTeamPickSession(s)}
                      onRemoveTeams={() => handleRemoveTeams(s)}
                    />
                  </Box>
                ))}
              </Paper>
            </Box>
          ))}
        </>
      )}

      {/* ── Passati ── */}
      {past.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            endIcon={showPast ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => {
              setShowPast((v) => !v);
              setPastPage(1);
            }}
            sx={{ color: "text.secondary", fontWeight: 600, mb: showPast ? 1.5 : 0 }}
          >
            Allenamenti passati ({past.length})
          </Button>

          {showPast && (
            <>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ borderRadius: 2, overflow: "hidden" }}
              >
                {pastVisible.map((s, i) => (
                  <Box key={s.id}>
                    {i > 0 && <Divider />}
                    <SessionRow
                      session={s}
                      muted
                      isStaff={isStaff}
                      onEdit={() => openEdit(s)}
                      onDelete={() => setToDelete(s)}
                      onGenerateTeams={() => setTeamPickSession(s)}
                      onRemoveTeams={() => handleRemoveTeams(s)}
                    />
                  </Box>
                ))}
              </Paper>

              {hasMorePast && (
                <Box sx={{ textAlign: "center", mt: 1.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setPastPage((p) => p + 1)}
                    sx={{ color: "text.secondary" }}
                  >
                    Carica altri{" "}
                    {Math.min(PAST_PAGE_SIZE, past.length - pastVisible.length)}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* ── Dialog: nuovo allenamento ── */}
      <Dialog open={newOpen} onClose={() => !newLoading && setNewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Nuovo allenamento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <AdminSessionForm
              showTitle={false}
              onLoadingChange={setNewLoading}
              onCreated={async () => {
                setNewOpen(false);
                await loadSessions();
                router.refresh();
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: scelta numero squadre ── */}
      <Dialog open={!!teamPickSession} onClose={() => setTeamPickSession(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Quante squadre?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Scegli il numero di squadre per <strong>{teamPickSession?.title}</strong>.
          </DialogContentText>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button variant="contained" fullWidth onClick={() => handleGenerateTeams(teamPickSession!, 2)} sx={{ py: 1.5, fontSize: "1rem" }}>
              2 squadre
            </Button>
            <Button variant="outlined" fullWidth onClick={() => handleGenerateTeams(teamPickSession!, 3)} sx={{ py: 1.5, fontSize: "1rem" }}>
              3 squadre
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamPickSession(null)}>Annulla</Button>
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
            <Divider />
            <SessionRestrictionEditor
              value={editRestrictions}
              onChange={setEditRestrictions}
              disabled={editLoading}
              seasonFilter={editDate ? seasonForDate(new Date(editDate)) : undefined}
            />
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
