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
  Collapse,
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
  Tab,
  Tabs,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
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
import { format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import SessionCard, { type SessionWithCount } from "@/components/SessionCard";
import PickTeamsDialog from "@/components/PickTeamsDialog";
import SessionHeroCard from "@/components/SessionHeroCard";
import TeamsModal from "@/components/TeamsModal";
import SessionRestrictionEditor, { seasonForDate, type RestrictionValue } from "@/components/SessionRestrictionEditor";
import AdminSessionForm from "@/components/AdminSessionForm";

import { toLocalDateString, toLocalTimeString, sessionEndDate } from "@/lib/dateUtils";
import { TEAM_META } from "@/lib/constants";
const DEFAULT_RESTRICTIONS: RestrictionValue = { allowedRoles: [], restrictTeamId: null, openRoles: [] };

function findMyTeam(teams: SessionWithCount["teams"], registrationId: string | null) {
  if (!teams || !registrationId) return null;
  return TEAM_META.find((t) => {
    const list = teams[t.key];
    return list?.some((a) => a.id === registrationId);
  }) ?? null;
}

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

function groupByYear(
  sessions: SessionWithCount[],
): [string, SessionWithCount[]][] {
  const map = new Map<string, SessionWithCount[]>();
  for (const s of sessions) {
    const key = format(new Date(s.date), "yyyy");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries());
}


// ── Session row (lista compatta) ──────────────────────────────────────────────

function SessionRow({
  session: s,
  isRegistered = false,
  myRegistrationId = null,
  muted = false,
  isStaff = false,
  generating = false,
  removingTeams = false,
  onEdit,
  onDelete,
  onGenerateTeams,
  onRemoveTeams,
}: {
  session: SessionWithCount;
  isRegistered?: boolean;
  myRegistrationId?: string | null;
  muted?: boolean;
  isStaff?: boolean;
  generating?: boolean;
  removingTeams?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerateTeams?: () => void;
  onRemoveTeams?: () => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const myTeam = findMyTeam(s.teams, myRegistrationId);

  return (
    <>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, sm: 2 },
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          opacity: muted ? 0.62 : 1,
          "&:hover": { bgcolor: "action.hover" },
          transition: "background-color 0.15s",
        }}
      >
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

        {/* Giorno numero + abbreviazione */}
        <Box sx={{ width: { xs: 36, sm: 44 }, textAlign: "center", flexShrink: 0, position: "relative", zIndex: 1, pointerEvents: "none" }}>
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
          <Typography fontWeight={800} sx={{ lineHeight: 1.1, fontSize: { xs: "1.1rem", sm: "1.2rem" } }}>
            {format(date, "d")}
          </Typography>
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
            {format(date, "MMM", { locale: it })}
          </Typography>
        </Box>

        {/* Titolo + orario */}
        <Box sx={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1, pointerEvents: "none" }}>
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
                    ? `Solo ${s.restrictTeam.name}${s.allowedRoles?.length ? ` · ${s.allowedRoles.map((r) => `R${r}`).join(", ")}` : ""}`
                    : s.allowedRoles!.map((r) => `R${r}`).join(", ")}
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

        {/* Icone di stato + controlli — sopra il link */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, position: "relative", zIndex: 1 }}>
          {isRegistered && myTeam ? (
            <Chip
              label={myTeam.name}
              size="small"
              sx={{ bgcolor: myTeam.color, color: "#fff", fontWeight: 700, fontSize: "0.68rem", height: 20 }}
            />
          ) : isRegistered ? (
            <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
          ) : null}

          {/* Basketball icon: cliccabile se ci sono squadre, altrimenti icona creazione per staff */}
          {s.teams ? (
            <IconButton
              size="small"
              aria-label="Vedi squadre"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setTeamsOpen(true); }}
              sx={{ color: "primary.main", opacity: 0.7, p: 0.25, "&:hover": { opacity: 1 } }}
            >
              <SportsBasketballIcon sx={{ fontSize: 16 }} />
            </IconButton>
          ) : (isStaff && !muted && (
            <IconButton
              size="small"
              aria-label="Crea squadre"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGenerateTeams?.(); }}
              disabled={generating}
              sx={{ color: "text.disabled", p: 0.25, "&:hover": { color: "primary.main" } }}
            >
              {generating
                ? <CircularProgress size={13} color="inherit" />
                : <SportsBasketballIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          ))}

          {/* Rimuovi squadre: solo staff, solo se non passato */}
          {isStaff && s.teams && !muted && (
            <IconButton
              size="small"
              color="error"
              aria-label="Rimuovi squadre"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemoveTeams?.(); }}
              disabled={removingTeams}
              sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
            >
              {removingTeams
                ? <CircularProgress size={13} color="error" />
                : <DeleteOutlineIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          )}

          {isStaff ? (
            <>
              <IconButton
                size="small"
                aria-label="Azioni allenamento"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuAnchor(e.currentTarget); }}
                sx={{ color: "text.disabled", mr: -0.5 }}
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
            <ChevronRightIcon sx={{ color: "text.disabled", fontSize: 18 }} />
          )}
        </Box>
      </Box>

      {s.teams && (
        <TeamsModal
          open={teamsOpen}
          onClose={() => setTeamsOpen(false)}
          sessionTitle={s.title}
          sessionDate={s.date}
          sessionEndTime={s.endTime}
          teamA={s.teams.teamA}
          teamB={s.teams.teamB}
          teamC={s.teams.teamC}
          coaches={s.teams.coaches}
        />
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

function deriveSections(sessions: SessionWithCount[], now: Date) {
  const asc = (a: SessionWithCount, b: SessionWithCount) =>
    new Date(a.date).getTime() - new Date(b.date).getTime();
  const desc = (a: SessionWithCount, b: SessionWithCount) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();

  const inCorso = sessions.filter((s) => {
    const start = new Date(s.date);
    const end = sessionEndDate(start, s.endTime ? new Date(s.endTime) : null);
    return now >= start && now <= end;
  }).sort(asc);

  const upcoming = sessions
    .filter((s) => new Date(s.date) > now)
    .sort(asc);

  const past = sessions
    .filter((s) => {
      const end = sessionEndDate(new Date(s.date), s.endTime ? new Date(s.endTime) : null);
      return end < now;
    })
    .sort(desc);

  return { inCorso, upcoming, past };
}

export default function AllenamentiClient({
  inCorso: initInCorso,
  upcoming: initUpcoming,
  past: initPast,
  registeredSessionIds,
  registrationIdBySession = {},
  seasonAttended,
  seasonTotal,
  isLoggedIn,
  isStaff = false,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  past: SessionWithCount[];
  registeredSessionIds: string[];
  registrationIdBySession?: Record<string, string>;
  seasonAttended: number;
  seasonTotal: number;
  isLoggedIn: boolean;
  isStaff?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [openYears, setOpenYears] = useState<Set<string>>(() =>
    new Set([format(new Date(), "yyyy")])
  );

  function toggleYear(year: string) {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  const [openMonths, setOpenMonths] = useState<Set<string>>(() =>
    new Set([format(new Date(), "MMMM yyyy", { locale: it })])
  );

  function toggleMonth(month: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  const [activeTab, setActiveTab] = useState(0);

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
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
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
        showToast({ message: `${numTeams} squadre create per "${s.title}"`, severity: "success" });
      } else {
        showToast({ message: "Errore nella creazione delle squadre", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
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
  const [firstSession, secondSession, ...remainingUpcoming] = upcoming;

  const showSecondHero = !!secondSession &&
    isSameDay(new Date(firstSession.date), new Date(secondSession.date));

  const heroSessions = showSecondHero ? [firstSession, secondSession] : [firstSession];
  const restUpcoming = showSecondHero ? remainingUpcoming : (secondSession ? [secondSession, ...remainingUpcoming] : remainingUpcoming);
  const futureYearGroups = groupByYear(restUpcoming);
  const pastYearGroups = groupByYear(past);

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
                myRegistrationId={registrationIdBySession[s.id] ?? null}
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

      {/* ── Hero prossimi ── */}
      {upcoming.length > 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" fontWeight={700} sx={{ color: "text.disabled", letterSpacing: "0.1em" }}>
              Prossimi allenamenti
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: showSecondHero ? { xs: "1fr", sm: "1fr 1fr" } : "1fr",
              gap: 2,
              mb: 3,
            }}
          >
            {heroSessions.map((s) => (
              <SessionHeroCard
                key={s.id}
                session={s}
                isRegistered={registeredSet.has(s.id)}
                myRegistrationId={registrationIdBySession[s.id] ?? null}
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
        </>
      )}

      {/* ── Schede Futuri / Passati ── */}
      <Box>
        <Tabs
          value={activeTab}
          onChange={(_, v: number) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}
        >
          <Tab
            label={restUpcoming.length > 0 ? `Futuri (${restUpcoming.length})` : "Futuri"}
            sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.875rem" }}
          />
          <Tab
            label={past.length > 0 ? `Passati (${past.length})` : "Passati"}
            sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.875rem" }}
          />
        </Tabs>

        {/* Tab Futuri */}
        {activeTab === 0 && (
          <Box>
            {upcoming.length === 0 ? (
              <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center", borderStyle: "dashed" }}>
                <Typography color="text.secondary">Nessun allenamento programmato.</Typography>
              </Paper>
            ) : restUpcoming.length === 0 ? (
              <Typography variant="body2" color="text.disabled" sx={{ py: 2 }}>
                Nessun altro allenamento programmato.
              </Typography>
            ) : (
              futureYearGroups.map(([year, yearSessions]) => {
                const isYearOpen = openYears.has(year);
                return (
                  <Box key={year} sx={{ mb: 2 }}>
                    <Box
                      onClick={() => toggleYear(year)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: isYearOpen ? 1.5 : 0,
                        cursor: "pointer",
                        py: 0.5,
                        "&:hover .year-label": { color: "text.primary" },
                      }}
                    >
                      <Typography
                        className="year-label"
                        fontWeight={800}
                        sx={{
                          fontSize: "1.1rem",
                          lineHeight: 1,
                          color: isYearOpen ? "text.primary" : "text.secondary",
                          transition: "color 0.15s",
                        }}
                      >
                        {year}
                      </Typography>
                      <Divider sx={{ flex: 1 }} />
                      <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
                        {yearSessions.length}{" "}
                        {yearSessions.length === 1 ? "allenamento" : "allenamenti"}
                      </Typography>
                      <IconButton size="small" sx={{ color: "text.disabled", p: 0.25 }}>
                        {isYearOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </Box>

                    <Collapse in={isYearOpen}>
                      <Box sx={{ pl: { xs: 0, sm: 2 } }}>
                        {groupByMonth(yearSessions).map(([month, monthSessions]) => {
                          const isOpen = openMonths.has(month);
                          return (
                            <Box key={month} sx={{ mb: 1.5 }}>
                              <Box
                                onClick={() => toggleMonth(month)}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  mb: isOpen ? 1 : 0,
                                  cursor: "pointer",
                                  py: 0.25,
                                  "&:hover .month-label": { color: "text.primary" },
                                }}
                              >
                                <Typography
                                  className="month-label"
                                  variant="overline"
                                  fontWeight={700}
                                  sx={{
                                    color: isOpen ? "text.secondary" : "text.disabled",
                                    letterSpacing: "0.1em",
                                    lineHeight: 1,
                                    whiteSpace: "nowrap",
                                    transition: "color 0.15s",
                                  }}
                                >
                                  {month}
                                </Typography>
                                <Divider sx={{ flex: 1 }} />
                                <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
                                  {monthSessions.length}{" "}
                                  {monthSessions.length === 1 ? "allenamento" : "allenamenti"}
                                </Typography>
                                <IconButton size="small" sx={{ color: "text.disabled", p: 0.25 }}>
                                  {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                </IconButton>
                              </Box>
                              <Collapse in={isOpen}>
                                <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                                  {monthSessions.map((s, i) => (
                                    <Box key={s.id}>
                                      {i > 0 && <Divider />}
                                      <SessionRow
                                        session={s}
                                        isRegistered={registeredSet.has(s.id)}
                                        myRegistrationId={registrationIdBySession[s.id] ?? null}
                                        isStaff={isStaff}
                                        generating={generating === s.id}
                                        removingTeams={removingTeams === s.id}
                                        onEdit={() => openEdit(s)}
                                        onDelete={() => setToDelete(s)}
                                        onGenerateTeams={() => setTeamPickSession(s)}
                                        onRemoveTeams={() => handleRemoveTeams(s)}
                                      />
                                    </Box>
                                  ))}
                                </Paper>
                              </Collapse>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })
            )}
          </Box>
        )}

        {/* Tab Passati */}
        {activeTab === 1 && (
          <Box>
            {pastYearGroups.length === 0 ? (
              <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center", borderStyle: "dashed" }}>
                <Typography color="text.secondary">Nessun allenamento passato.</Typography>
              </Paper>
            ) : (
              pastYearGroups.map(([year, yearSessions]) => {
                const isYearOpen = openYears.has(year);
                return (
                  <Box key={year} sx={{ mb: 2 }}>
                    {/* Anno — accordion */}
                    <Box
                      onClick={() => toggleYear(year)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: isYearOpen ? 1.5 : 0,
                        cursor: "pointer",
                        py: 0.5,
                        "&:hover .year-label": { color: "text.primary" },
                      }}
                    >
                      <Typography
                        className="year-label"
                        fontWeight={800}
                        sx={{
                          fontSize: "1.1rem",
                          lineHeight: 1,
                          color: isYearOpen ? "text.primary" : "text.secondary",
                          transition: "color 0.15s",
                        }}
                      >
                        {year}
                      </Typography>
                      <Divider sx={{ flex: 1 }} />
                      <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
                        {yearSessions.length}{" "}
                        {yearSessions.length === 1 ? "allenamento" : "allenamenti"}
                      </Typography>
                      <IconButton size="small" sx={{ color: "text.disabled", p: 0.25 }}>
                        {isYearOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </Box>

                    <Collapse in={isYearOpen}>
                      <Box sx={{ pl: { xs: 0, sm: 2 } }}>
                        {groupByMonth(yearSessions).map(([month, monthSessions]) => {
                          const isOpen = openMonths.has(month);
                          return (
                            <Box key={month} sx={{ mb: 1.5 }}>
                              <Box
                                onClick={() => toggleMonth(month)}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  mb: isOpen ? 1 : 0,
                                  cursor: "pointer",
                                  py: 0.25,
                                  "&:hover .month-label": { color: "text.primary" },
                                }}
                              >
                                <Typography
                                  className="month-label"
                                  variant="overline"
                                  fontWeight={700}
                                  sx={{
                                    color: isOpen ? "text.secondary" : "text.disabled",
                                    letterSpacing: "0.1em",
                                    lineHeight: 1,
                                    whiteSpace: "nowrap",
                                    transition: "color 0.15s",
                                  }}
                                >
                                  {month}
                                </Typography>
                                <Divider sx={{ flex: 1 }} />
                                <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
                                  {monthSessions.length}{" "}
                                  {monthSessions.length === 1 ? "allenamento" : "allenamenti"}
                                </Typography>
                                <IconButton size="small" sx={{ color: "text.disabled", p: 0.25 }}>
                                  {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                </IconButton>
                              </Box>
                              <Collapse in={isOpen}>
                                <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                                  {monthSessions.map((s, i) => (
                                    <Box key={s.id}>
                                      {i > 0 && <Divider />}
                                      <SessionRow
                                        session={s}
                                        muted
                                        isStaff={isStaff}
                                        onEdit={() => openEdit(s)}
                                        onDelete={() => setToDelete(s)}
                                      />
                                    </Box>
                                  ))}
                                </Paper>
                              </Collapse>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </Box>

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

      <PickTeamsDialog
        open={!!teamPickSession}
        sessionTitle={teamPickSession?.title}
        onClose={() => setTeamPickSession(null)}
        onConfirm={(n) => handleGenerateTeams(teamPickSession!, n)}
      />

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
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={editLoading}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Inizio"
                type="time"
                value={editTime}
                onChange={(e) => { setEditTime(e.target.value); setEditError(""); }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={editLoading}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Fine"
                type="time"
                value={editEndTime}
                onChange={(e) => { setEditEndTime(e.target.value); setEditError(""); }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
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
