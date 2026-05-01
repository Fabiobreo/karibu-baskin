"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import {
  Container, Typography, Box,
  Paper, Chip, Skeleton, Button, Grid2 as Grid,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Divider, CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import RegistrationForm, { type CurrentUser, type ChildInfo } from "@/components/RegistrationForm";
import RosterByRole from "@/components/RosterByRole";
import TeamDisplay, { type TeamsData } from "@/components/TeamDisplay";
import ShareSection from "@/components/ShareSection";
import SessionRestrictionEditor, { seasonForDate, type RestrictionValue } from "@/components/SessionRestrictionEditor";
import { ROLE_COLORS, ROLE_LABELS, ROLES } from "@/lib/constants";

function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toLocalTimeString(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DEFAULT_RESTRICTIONS: RestrictionValue = { allowedRoles: [], restrictTeamId: null, openRoles: [] };

interface Session {
  id: string;
  title: string;
  date: string;
  endTime: string | null;
  dateSlug: string | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
  restrictTeam: { id: string; name: string; color: string | null } | null;
  _count: { registrations: number };
}

interface Registration {
  id: string;
  name: string;
  role: number;
  note: string | null;
  createdAt: string;
  sessionId: string;
  userId: string | null;
  childId: string | null;
  registeredAsCoach: boolean;
  userSlug: string | null;
}

interface StatusBadge {
  label: string;
  bgcolor: string;
}

const TEAM_META = [
  { key: "teamA" as const, name: "Arancioni", color: "#E65100" },
  { key: "teamB" as const, name: "Neri", color: "#1A1A1A" },
  { key: "teamC" as const, name: "Bianchi", color: "#757575" },
];

function getSessionStatus(date: Date, endTime: Date | null): StatusBadge {
  const now = new Date();
  const end = endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000);

  if (now >= date && now <= end) {
    return { label: "In corso", bgcolor: "#2E7D32" };
  }
  if (now > end) {
    return { label: "Terminato", bgcolor: "rgba(255,255,255,0.18)" };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: "Oggi!", bgcolor: "#E65100" };
  if (diffDays === 1) return { label: "Domani", bgcolor: "#1565C0" };
  return { label: `Tra ${diffDays} giorni`, bgcolor: "#1565C0" };
}

// ── Riepilogo allenamento passato ─────────────────────────────────────────────

function SummaryCard({
  registrations,
  teams,
}: {
  registrations: Registration[];
  teams: TeamsData | null;
}) {
  const athleteRegs = registrations.filter((r) => !r.registeredAsCoach);
  const coachRegs = registrations.filter((r) => r.registeredAsCoach);
  const roleBreakdown = ROLES
    .map((role) => ({ role, count: athleteRegs.filter((r) => r.role === role).length }))
    .filter((r) => r.count > 0);

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Riepilogo
      </Typography>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: roleBreakdown.length > 0 ? 2 : 0 }}>
        <Chip
          icon={<GroupsIcon />}
          label={`${athleteRegs.length} ${athleteRegs.length === 1 ? "atleta" : "atleti"}`}
          variant="outlined"
        />
        {coachRegs.length > 0 && (
          <Chip
            label={`${coachRegs.length} ${coachRegs.length === 1 ? "allenatore" : "allenatori"}`}
            variant="outlined"
          />
        )}
        {teams && (
          <Chip
            icon={<CheckCircleIcon />}
            label="Squadre generate"
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      {roleBreakdown.length > 0 && (
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
          {roleBreakdown.map(({ role, count }) => (
            <Box
              key={role}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                bgcolor: ROLE_COLORS[role],
                color: "#fff",
                borderRadius: 1.5,
                px: 1.75,
                py: 0.75,
                minWidth: 52,
              }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1, fontSize: "1.2rem" }}>
                {count}
              </Typography>
              <Typography sx={{ fontWeight: 600, opacity: 0.85, fontSize: "0.62rem", mt: 0.25 }}>
                {ROLE_LABELS[role]}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {athleteRegs.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Nessun partecipante registrato.
        </Typography>
      )}
    </Paper>
  );
}

// ── Header sezione Squadre ────────────────────────────────────────────────────

function TeamsHeader({ teams, isStaff, isEnded = false, removingTeams, onRemoveTeams }: {
  teams: TeamsData | null;
  isStaff: boolean;
  isEnded?: boolean;
  removingTeams: boolean;
  onRemoveTeams: () => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
      <Typography variant="h6" fontWeight={700}>Squadre</Typography>
      {isStaff && teams && !isEnded && (
        <Tooltip title="Rimuovi squadre generate">
          <span>
            <IconButton
              size="small"
              color="error"
              onClick={onRemoveTeams}
              disabled={removingTeams}
              sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
            >
              {removingTeams
                ? <CircularProgress size={16} color="error" />
                : <DeleteOutlineIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}

// ── Pagina ────────────────────────────────────────────────────────────────────

export default function SessionPage() {
  const { session: sessionParam } = useParams<{ session: string }>();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null | undefined>(undefined);
  const [parentChildren, setParentChildren] = useState<ChildInfo[]>([]);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editRestrictions, setEditRestrictions] = useState<RestrictionValue>(DEFAULT_RESTRICTIONS);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const swrOpts = { revalidateOnFocus: true, refreshInterval: 0 } as const;
  const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject()));

  const { data: session, isLoading: loading, mutate: mutateSession } = useSWR<Session>(
    `/api/sessions/${encodeURIComponent(sessionParam)}`,
    fetcher,
    swrOpts,
  );
  const realSessionId = session?.id ?? "";

  const regKey = realSessionId ? `/api/registrations?sessionId=${realSessionId}` : null;
  const { data: registrations = [], mutate: mutateRegistrations } = useSWR<Registration[]>(
    regKey,
    fetcher,
    swrOpts,
  );

  const teamsKey = realSessionId ? `/api/teams/${realSessionId}` : null;
  const { data: teamsRaw, isLoading: teamsLoading, mutate: mutateTeams } = useSWR<TeamsData>(
    teamsKey,
    fetcher,
    swrOpts,
  );
  const teams: TeamsData | null = teamsRaw?.generated ? teamsRaw : null;

  function refreshSecondary() {
    mutateRegistrations();
    mutateTeams();
  }

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CurrentUser | null) => {
        setCurrentUser(data);
        if (data?.appRole === "PARENT") {
          fetch("/api/users/me/children")
            .then((r) => (r.ok ? r.json() : []))
            .then((kids: ChildInfo[]) => setParentChildren(kids))
            .catch(() => {});
        }
      })
      .catch(() => setCurrentUser(null));
  }, []);

  const sessionDate = session ? new Date(session.date) : null;
  const sessionEnd = session?.endTime ? new Date(session.endTime) : null;
  const status = sessionDate ? getSessionStatus(sessionDate, sessionEnd) : null;

  const sessionId = realSessionId || sessionParam;

  const [sessionUrl, setSessionUrl] = useState(`https://karibu-baskin.vercel.app/allenamento/${sessionParam}`);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSessionUrl(window.location.href); }, []);

  // ── Countdown live ──────────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    const dateStr = session?.date ?? null;
    const endStr = session?.endTime ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dateStr) { setCountdown(null); return; }

    const sd = new Date(dateStr);
    const se = endStr ? new Date(endStr) : new Date(sd.getTime() + 2 * 60 * 60 * 1000);

    function update() {
      const now = new Date();
      if (now < sd) {
        const isToday = sd.toDateString() === now.toDateString();
        if (!isToday) { setCountdown(null); return; }
        const diff = sd.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(diff < 2 * 60 * 1000 ? "Sta per iniziare!" : h > 0 ? `Inizia fra ${h}h ${m}min` : `Inizia fra ${m} minuti`);
      } else if (now <= se) {
        const diff = se.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(diff < 60 * 1000 ? "Sta per finire" : h > 0 ? `Finisce fra ${h}h ${m}min` : `Finisce fra ${m} minuti`);
      } else {
        setCountdown(null);
      }
    }

    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [session?.date, session?.endTime]);

  const isStaff = currentUser?.appRole === "COACH" || currentUser?.appRole === "ADMIN";

  const [removingTeams, setRemovingTeams] = useState(false);
  async function handleRemoveTeams() {
    if (!realSessionId) return;
    setRemovingTeams(true);
    try {
      const res = await fetch(`/api/teams/${realSessionId}`, { method: "DELETE" });
      if (res.ok) mutateTeams(undefined, false);
    } finally {
      setRemovingTeams(false);
    }
  }

  function openEdit() {
    if (!session) return;
    const date = new Date(session.date);
    const end = session.endTime ? new Date(session.endTime) : null;
    setEditTitle(session.title);
    setEditDate(toLocalDateString(date));
    setEditTime(toLocalTimeString(date));
    setEditEndTime(end ? toLocalTimeString(end) : "");
    setEditRestrictions({
      allowedRoles: session.allowedRoles ?? [],
      restrictTeamId: session.restrictTeamId ?? null,
      openRoles: session.openRoles ?? [],
    });
    setEditError("");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!session) return;
    if (!editTitle.trim()) { setEditError("Il titolo è obbligatorio"); return; }
    if (!editDate) { setEditError("La data è obbligatoria"); return; }
    if (editEndTime && editEndTime <= editTime) { setEditError("L'orario di fine deve essere dopo l'inizio"); return; }
    setEditLoading(true);
    setEditError("");
    try {
      const dateTime = new Date(`${editDate}T${editTime}:00`);
      const endDateTime = editEndTime ? new Date(`${editDate}T${editEndTime}:00`) : null;
      const dateSlug = `${editDate}${editTime}`.replace(/-/g, "").replace(":", "");
      const res = await fetch(`/api/sessions/${session.id}`, {
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
      setEditOpen(false);
      if (dateSlug !== sessionParam) {
        router.replace(`/allenamento/${dateSlug}`);
      } else {
        await mutateSession();
      }
    } catch {
      setEditError("Errore di rete, riprova");
    } finally {
      setEditLoading(false);
    }
  }

  const slugMap = Object.fromEntries(
    registrations.filter((r) => r.userSlug).map((r) => [r.id, r.userSlug!])
  );
  const isEnded = sessionDate
    ? new Date() > (sessionEnd ?? new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000))
    : false;

  const myRegistration = currentUser
    ? registrations.find((r) =>
        r.userId === currentUser.id ||
        (currentUser.linkedChildId && r.childId === currentUser.linkedChildId)
      )
    : null;
  const childRegistrations = parentChildren.length > 0
    ? registrations.filter((r) => r.childId && parentChildren.some((c) => c.id === r.childId))
    : [];
  const myTeam = myRegistration && teams
    ? TEAM_META.find((t) => {
      const list = t.key === "teamC" ? teams.teamC : teams[t.key];
      return list?.some((a) => a.id === myRegistration.id);
    }) ?? null
    : null;
  const teamFirstLayout = !!myTeam;

  // Props condivisi tra i vari layout
  const rosterProps = {
    registrations,
    currentUserId: currentUser?.id ?? null,
    linkedChildId: currentUser?.linkedChildId ?? null,
    parentChildIds: parentChildren.map((c) => c.id),
    childUserIds: parentChildren.map((c) => c.userId).filter((id): id is string => !!id),
    isStaff,
    onUnregistered: refreshSecondary,
  };

  const teamDisplayProps = {
    sessionId,
    isStaff,
    registrationIds: registrations.filter((r) => !r.registeredAsCoach).map((r) => r.id),
    slugMap,
    teams,
    teamsLoading,
    onTeamsGenerated: (newTeams: TeamsData) => mutateTeams(newTeams, false),
  };

  void childRegistrations;

  return (
    <>
      <SiteHeader />

      {/* ── Hero ── */}
      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 0 }} />
      ) : session && sessionDate ? (
        <Box
          sx={{
            background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
            color: "#fff",
            px: { xs: 2.5, sm: 4, md: 8 },
            py: { xs: 3, sm: 4 },
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.1)", pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.06)", pointerEvents: "none" }} />

          <Box sx={{ maxWidth: "md", mx: "auto", position: "relative" }}>
            <Box sx={{ mb: 2 }}>
              <Button
                href="/allenamenti"
                startIcon={<ArrowBackIcon sx={{ fontSize: "0.95rem !important" }} />}
                size="small"
                sx={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  px: 0,
                  minWidth: 0,
                  "&:hover": { color: "#fff", backgroundColor: "transparent" },
                }}
              >
                Allenamenti
              </Button>
            </Box>

            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.15,
                  fontSize: { xs: "1.7rem", sm: "2.2rem", md: "2.6rem" },
                  flex: 1,
                }}
              >
                {session.title}
              </Typography>
              {isStaff && (
                <Tooltip title="Modifica allenamento">
                  <IconButton
                    onClick={openEdit}
                    size="small"
                    sx={{
                      color: "rgba(255,255,255,0.55)",
                      mt: 0.5,
                      flexShrink: 0,
                      "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
                    }}
                  >
                    <EditIcon sx={{ fontSize: "1.1rem" }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {status && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: countdown ? 0.75 : 2 }}>
                <Chip
                  label={status.label}
                  size="small"
                  sx={{ bgcolor: status.bgcolor, color: "#fff", fontWeight: 700, fontSize: "0.72rem", letterSpacing: 0.5 }}
                />
                {(session.allowedRoles && session.allowedRoles.length > 0 || session.restrictTeamId) && (
                  <Chip
                    icon={<LockIcon sx={{ fontSize: "0.85rem !important" }} />}
                    label={session.restrictTeam
                      ? `Solo ${session.restrictTeam.name}${session.allowedRoles?.length ? ` · ${session.allowedRoles.map((r) => `Ruolo ${r}`).join(", ")}` : ""}`
                      : session.allowedRoles!.map((r) => `Ruolo ${r}`).join(", ")}
                    size="small"
                    sx={{ bgcolor: "warning.light", color: "warning.contrastText", fontWeight: 600, fontSize: "0.7rem" }}
                  />
                )}
                {session.restrictTeamId && session.openRoles && session.openRoles.length > 0 && (
                  <Chip
                    icon={<LockOpenIcon sx={{ fontSize: "0.85rem !important" }} />}
                    label={`${session.openRoles.map((r) => `Ruolo ${r}`).join(", ")} ${session.openRoles.length === 1 ? "aperto" : "aperti"} a tutti`}
                    size="small"
                    sx={{ bgcolor: "success.light", color: "success.contrastText", fontWeight: 600, fontSize: "0.7rem" }}
                  />
                )}
              </Box>
            )}

            {countdown && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2 }}>
                <AccessTimeIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }} />
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                  {countdown}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: { xs: 1, sm: 2.5 },
                mb: 2.5,
                opacity: 0.82,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <CalendarTodayIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {format(sessionDate, "EEEE d MMMM yyyy", { locale: it })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <AccessTimeIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {format(sessionDate, "HH:mm")}
                  {sessionEnd && `–${format(sessionEnd, "HH:mm")}`}
                </Typography>
              </Box>
            </Box>

            <ShareSection
              sessionTitle={session.title}
              sessionUrl={sessionUrl}
              dark
            />
          </Box>
        </Box>
      ) : null}

      {/* ── Dialog: modifica allenamento ── */}
      <Dialog open={editOpen} onClose={() => !editLoading && setEditOpen(false)} maxWidth="sm" fullWidth>
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
          <Button onClick={() => setEditOpen(false)} disabled={editLoading} color="inherit">
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

      {/* ── Contenuto principale ── */}
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Box>
        ) : session ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

            {/* Banner "la tua squadra" */}
            {myTeam && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 2,
                  background: `linear-gradient(120deg, ${myTeam.color} 0%, ${myTeam.color}cc 100%)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <GroupsIcon sx={{ fontSize: 36, opacity: 0.85, flexShrink: 0 }} />
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    La tua squadra
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                    {myTeam.name}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* ── Stato: terminato ── */}
            {isEnded ? (
              <>
                <SummaryCard registrations={registrations} teams={teams} />
                <RosterByRole {...rosterProps} />
                <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
                  <TeamsHeader teams={teams} isStaff={isStaff} isEnded removingTeams={removingTeams} onRemoveTeams={handleRemoveTeams} />
                  <TeamDisplay {...teamDisplayProps} isStaff={false} />
                </Paper>
              </>
            ) : teamFirstLayout ? (
              /* ── Stato: iscritto + squadre generate ── */
              <>
                <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
                  <TeamsHeader teams={teams} isStaff={isStaff} removingTeams={removingTeams} onRemoveTeams={handleRemoveTeams} />
                  <TeamDisplay {...teamDisplayProps} />
                </Paper>
                <RosterByRole {...rosterProps} />
              </>
            ) : (
              /* ── Stato: default — layout a due colonne su desktop ── */
              <Grid container spacing={3} alignItems="flex-start">
                {/* Sinistra (desktop): roster + squadre */}
                <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 2, md: 1 } }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <RosterByRole {...rosterProps} />
                    <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
                      <TeamsHeader teams={teams} isStaff={isStaff} removingTeams={removingTeams} onRemoveTeams={handleRemoveTeams} />
                      <TeamDisplay {...teamDisplayProps} />
                    </Paper>
                  </Box>
                </Grid>

                {/* Destra (desktop): form iscrizione sticky */}
                <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 1, md: 2 } }}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      position: { md: "sticky" },
                      top: { md: 24 },
                    }}
                  >
                    <RegistrationForm
                      sessionId={sessionId}
                      onRegistered={refreshSecondary}
                      registeredNames={registrations.map((r) => r.name)}
                      registeredUserIds={registrations.map((r) => r.userId)}
                      registeredChildIds={registrations.map((r) => r.childId)}
                      currentUser={currentUser}
                      parentChildren={parentChildren}
                      restrictions={session ? {
                        allowedRoles: session.allowedRoles ?? [],
                        restrictTeamId: session.restrictTeamId ?? null,
                        openRoles: session.openRoles ?? [],
                        restrictTeamName: session.restrictTeam?.name ?? null,
                      } : undefined}
                    />
                  </Paper>
                </Grid>
              </Grid>
            )}

          </Box>
        ) : (
          <Typography color="error">Allenamento non trovato.</Typography>
        )}
      </Container>
    </>
  );
}
